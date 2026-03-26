import { Router, Response } from 'express';
import { authenticateJWT, AuthRequest } from '../middlewares/auth.middleware';
import { Store, Product, StoreProduct, Industry, ProductUnit, Unit } from '../models';
import { sequelize } from '../config/database';

const router = Router();
router.use(authenticateJWT);

const isAdmin = (req: AuthRequest) => {
    const role = (req.user as any)?.role;
    return role === 'admin' || role === 'super_admin';
};

// GET /api/v1/store-products/:storeId  - Get all products for a store
router.get('/:storeId', async (req: AuthRequest, res: Response) => {
    try {
        const storeId = parseInt(req.params.storeId as string);
        const store = await Store.findByPk(storeId, {
            include: [
                {
                    model: Product,
                    as: 'products',
                    include: [
                        { model: Industry, as: 'industry' },
                        {
                            model: ProductUnit,
                            as: 'product_units',
                            include: [{ model: Unit, as: 'unit', attributes: ['name', 'name_ar', 'step'] }]
                        }
                    ],
                },
            ],
        });
        if (!store) return res.status(404).json({ detail: 'Store not found' });

        const products = (store as any).products || [];
        const mappedProducts = products.map((p: any) => {
            const data: any = p.toJSON();
            const pivot = p.StoreProduct; 
            const allowedIds = pivot?.available_units;

            // For the summary price/unit, we still want the first available
            let filteredUnits = data.product_units || [];
            if (allowedIds && Array.isArray(allowedIds)) {
                const allowedSet = new Set(allowedIds.map((id: any) => Number(id)));
                filteredUnits = filteredUnits.filter((pu: any) => allowedSet.has(Number(pu.unit_id)));
            }

            const firstUnit = filteredUnits.length > 0 ? filteredUnits[0] : (data.product_units?.[0] || null);
            
            return {
                ...data,
                // Keep FULL product_units so Admin can re-enable units
                price: firstUnit ? firstUnit.price : 0,
                unit: firstUnit?.unit?.name || 'unit',
                unit_ar: firstUnit?.unit?.name_ar || null,
                stock_quantity: pivot?.stock_quantity ?? 0,
                is_available: pivot?.is_available ?? true,
                sale_price: pivot?.sale_price ?? null,
                sale_start: pivot?.sale_start ?? null,
                sale_end: pivot?.sale_end ?? null,
                override_price: pivot?.override_price ?? null,
                override_price_active: (pivot?.override_price !== null && pivot?.override_price !== undefined),
                available_units: pivot?.available_units ?? null
            };
        });

        res.json(mappedProducts);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

// POST /api/v1/store-products/:storeId/add  - Add product(s) to store
router.post('/:storeId/add', async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ detail: 'Admin only' });
        const storeId = parseInt(req.params.storeId as string);
        const { product_ids, stock_quantity, sale_price, available_units } = req.body as { 
            product_ids: number[], 
            stock_quantity?: number,
            sale_price?: number,
            available_units?: number[]
        };
        
        if (!product_ids || !Array.isArray(product_ids)) {
            return res.status(400).json({ detail: 'product_ids must be an array' });
        }
        if (product_ids.length === 0) {
            return res.status(400).json({ detail: 'product_ids must be a non-empty array' });
        }

        const store = await Store.findByPk(storeId);
        if (!store) return res.status(404).json({ detail: 'Store not found' });

        const t = await sequelize.transaction();
        try {
            // Upsert each product mapping inside a transaction
            const results = await Promise.all(
                product_ids.map(async (pid) => {
                    const [link, created] = await StoreProduct.findOrCreate({
                        where: { store_id: storeId, product_id: pid },
                        defaults: {
                            store_id: storeId,
                            product_id: pid,
                            is_available: true,
                            override_price: null,
                            sale_price: sale_price ?? null,
                            stock_quantity: stock_quantity ?? 0,
                            available_units: available_units ?? null,
                            added_at: new Date(),
                        },
                        transaction: t,
                    });
                    
                    if (!created) {
                        await link.update({
                            stock_quantity: stock_quantity ?? link.stock_quantity,
                            sale_price: sale_price ?? link.sale_price,
                            available_units: available_units ?? link.available_units
                        }, { transaction: t });
                    }
                    return { product_id: pid, created };
                })
            );
            await t.commit();
            res.status(201).json({ added: results.filter(r => r.created).length, already_existed: results.filter(r => !r.created).length });
        } catch (error: any) {
            await t.rollback();
            res.status(500).json({ detail: error.message });
        }
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

// DELETE /api/v1/store-products/:storeId/remove  - Remove product(s) from store
router.delete('/:storeId/remove', async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ detail: 'Admin only' });
        const storeId = parseInt(req.params.storeId as string);
        const { product_ids } = req.body as { product_ids: number[] };

        if (!Array.isArray(product_ids) || product_ids.length === 0) {
            return res.status(400).json({ detail: 'product_ids must be a non-empty array' });
        }

        const deleted = await StoreProduct.destroy({
            where: { store_id: storeId, product_id: product_ids },
        });

        res.json({ deleted });
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

// POST /api/v1/store-products/:storeId/add-all  - Add ALL global products to store
router.post('/:storeId/add-all', async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ detail: 'Admin only' });
        const storeId = parseInt(req.params.storeId as string);

        const store = await Store.findByPk(storeId);
        if (!store) return res.status(404).json({ detail: 'Store not found' });

        const allProducts = await Product.findAll({ attributes: ['id'] });

        const t = await sequelize.transaction();
        try {
            let added = 0;
            for (const p of allProducts) {
                const [, created] = await StoreProduct.findOrCreate({
                    where: { store_id: storeId, product_id: p.id },
                    defaults: {
                        store_id: storeId,
                        product_id: p.id,
                        is_available: true,
                        override_price: null,
                        added_at: new Date(),
                    },
                    transaction: t,
                });
                if (created) added++;
            }
            await t.commit();
            res.status(201).json({ added, total: allProducts.length });
        } catch (error: any) {
            await t.rollback();
            res.status(500).json({ detail: error.message });
        }
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

// PUT /api/v1/store-products/:storeId/products/:productId - Update store product details
router.put('/:storeId/products/:productId', async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ detail: 'Admin only' });
        const storeId = parseInt(req.params.storeId as string);
        const productId = parseInt(req.params.productId as string);
        
        const { is_available, sale_price, sale_start, sale_end, override_price, stock_quantity, available_units } = req.body;

        const storeProduct = await StoreProduct.findOne({
            where: { store_id: storeId, product_id: productId }
        });

        if (!storeProduct) return res.status(404).json({ detail: 'Store product mapping not found' });

        const updateData: any = {};
        if (is_available !== undefined) updateData.is_available = is_available;
        if (sale_price !== undefined) updateData.sale_price = sale_price;
        if (sale_start !== undefined) updateData.sale_start = sale_start || null;
        if (sale_end !== undefined) updateData.sale_end = sale_end || null;
        if (override_price !== undefined) updateData.override_price = override_price;
        if (stock_quantity !== undefined) updateData.stock_quantity = stock_quantity;
        if (available_units !== undefined) updateData.available_units = available_units;

        await storeProduct.update(updateData);
        res.json({ message: 'Store product updated successfully', data: storeProduct });
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

// PUT /api/v1/store-products/:storeId/bulk-update - Update multiple products for a store
router.put('/:storeId/bulk-update', async (req: AuthRequest, res: Response) => {
    try {
        const storeId = parseInt(req.params.storeId as string);
        const { updates } = req.body as { 
            updates: { product_id: number, sale_price?: number | null, sale_start?: Date | null, sale_end?: Date | null, override_price?: number | null, stock_quantity?: number }[] 
        };

        if (!updates || !Array.isArray(updates)) {
            return res.status(400).json({ detail: 'updates must be an array' });
        }

        const store = await Store.findByPk(storeId);
        if (!store) return res.status(404).json({ detail: 'Store not found' });

        // Check permission: Admin OR Store Owner
        const isStoreOwner = store.user_id === req.user.id;
        if (!isAdmin(req) && !isStoreOwner) {
            return res.status(403).json({ detail: 'Permission denied' });
        }

        const t = await sequelize.transaction();
        try {
            for (const update of updates) {
                const { product_id, sale_price, sale_start, sale_end, override_price, stock_quantity } = update;
                if (!product_id) continue;

                const updateData: any = {};
                if (stock_quantity !== undefined) updateData.stock_quantity = stock_quantity;
                
                if (sale_price !== undefined || override_price !== undefined || sale_start !== undefined || sale_end !== undefined) {
                    if (!isAdmin(req) && !store.can_manage_prices) {
                        throw new Error(`Permission denied: Store ${store.name} cannot manage prices.`);
                    }
                    if (sale_price !== undefined) updateData.sale_price = sale_price;
                    if (sale_start !== undefined) updateData.sale_start = sale_start || null;
                    if (sale_end !== undefined) updateData.sale_end = sale_end || null;
                    if (override_price !== undefined) updateData.override_price = override_price;
                }

                await StoreProduct.update(updateData, {
                    where: { store_id: storeId, product_id },
                    transaction: t
                });
            }
            await t.commit();
            res.json({ message: `Successfully updated ${updates.length} products` });
        } catch (error: any) {
            await t.rollback();
            res.status(500).json({ detail: error.message });
        }
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

export default router;
