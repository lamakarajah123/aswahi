import { Router, Request, Response } from 'express';
import { ProductService } from '../services/product.service';
import { ProductDataSchema, ProductUpdateDataSchema } from '../validators/product.validator';
import { ProductUnit, Unit, Product, ProductCustomizationStage, ProductCustomizationOption } from '../models';
import { sequelize } from '../config/database';
import { authenticateJWT, AuthRequest } from '../middlewares/auth.middleware';

const router = Router();
const service = new ProductService();

router.use(authenticateJWT);

// ... existing routes ...

// GET /api/v1/entities/products/:id/customizations
router.get('/:id/customizations', async (req: AuthRequest, res: Response) => {
    try {
        const productId = parseInt(req.params.id as string);
        const stages = await ProductCustomizationStage.findAll({
            where: { product_id: productId },
            include: [{ model: ProductCustomizationOption, as: 'options' }],
            order: [
                ['sort_order', 'ASC'],
                [{ model: ProductCustomizationOption, as: 'options' }, 'sort_order', 'ASC']
            ]
        });
        res.json(stages);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

// PUT /api/v1/entities/products/:id/customizations
router.put('/:id/customizations', async (req: AuthRequest, res: Response) => {
    try {
        if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
            return res.status(403).json({ detail: 'Only admins can update customizations' });
        }

        const productId = parseInt(req.params.id as string);
        const { stages, has_customizations } = req.body;

        const t = await sequelize.transaction();
        try {
            // Update product flag
            await Product.update({ has_customizations: !!has_customizations }, { where: { id: productId }, transaction: t });

            // Remove existing
            const existingStages = await ProductCustomizationStage.findAll({ where: { product_id: productId } });
            const stageIds = existingStages.map(s => s.id);
            if (stageIds.length > 0) {
                await ProductCustomizationOption.destroy({ where: { stage_id: stageIds }, transaction: t });
            }
            await ProductCustomizationStage.destroy({ where: { product_id: productId }, transaction: t });

            // Create new
            if (Array.isArray(stages)) {
                for (let i = 0; i < stages.length; i++) {
                    const s = stages[i];
                    const stage = await ProductCustomizationStage.create({
                        product_id: productId,
                        name: s.name,
                        name_ar: s.name_ar,
                        sort_order: i,
                        min_selections: s.min_selections ?? 0,
                        max_selections: s.max_selections ?? 1,
                        is_required: s.is_required ?? false,
                        is_active: true
                    }, { transaction: t });

                    if (Array.isArray(s.options)) {
                        await ProductCustomizationOption.bulkCreate(
                            s.options.map((o: any, oIdx: number) => ({
                                stage_id: stage.id,
                                name: o.name,
                                name_ar: o.name_ar,
                                price_modifier: parseFloat(o.price_modifier || '0'),
                                is_available: true,
                                sort_order: oIdx
                            })),
                            { transaction: t }
                        );
                    }
                }
            }

            await t.commit();
            res.json({ message: 'Customizations updated successfully' });
        } catch (error: any) {
            await t.rollback();
            console.error('CUSTOMIZATION_UPDATE_ERROR:', error);
            res.status(500).json({ detail: error.message });
        }
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

// GET /api/v1/entities/products/categories - list distinct category strings (no full product fetch)
router.get('/categories', async (_req: Request, res: Response) => {
    try {
        const rows = await Product.findAll({
            attributes: ['category'],
            where: sequelize.literal(`"category" IS NOT NULL AND "category" != ''`),
            group: ['category'],
            order: [['category', 'ASC']],
            raw: true,
        }) as Array<{ category: string }>;
        res.json(rows.map(r => r.category));
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

// GET /api/v1/entities/products
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const skip = parseInt(req.query.skip as string || '0');
        const limit = parseInt(req.query.limit as string || '20');
        const industryId = req.query.industry_id ? parseInt(req.query.industry_id as string) : undefined;
        const category = req.query.category as string | undefined;
        const search = req.query.search as string | undefined;

        const result = await service.getList(skip, limit, industryId, category, search);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

// GET /api/v1/entities/products/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const id = parseInt(req.params.id as string);

        const result = await service.getById(id);
        if (!result) return res.status(404).json({ detail: 'Product not found' });

        res.json(result);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

// POST /api/v1/entities/products
router.post('/', async (req: AuthRequest, res: Response) => {
    try {
        if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
            return res.status(403).json({ detail: 'Only admins can add products' });
        }
        const validatedData = ProductDataSchema.parse(req.body);

        const result = await service.create(validatedData);
        res.status(201).json(result);
    } catch (error: any) {
        if (error.errors) {
            return res.status(400).json({ detail: error.errors });
        }
        res.status(500).json({ detail: error.message });
    }
});

// PUT /api/v1/entities/products/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
    try {
        if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
            return res.status(403).json({ detail: 'Only admins can update products' });
        }
        const id = parseInt(req.params.id as string);

        const validatedData = ProductUpdateDataSchema.parse(req.body);
        const result = await service.update(id, validatedData);

        if (!result) return res.status(404).json({ detail: 'Product not found' });

        res.json(result);
    } catch (error: any) {
        if (error.errors) {
            return res.status(400).json({ detail: error.errors });
        }
        res.status(500).json({ detail: error.message });
    }
});

// DELETE /api/v1/entities/products/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
    try {
        if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
            return res.status(403).json({ detail: 'Only admins can delete products' });
        }
        const id = parseInt(req.params.id as string);

        const success = await service.delete(id);
        if (!success) return res.status(404).json({ detail: 'Product not found' });

        res.json({ message: 'Product deleted successfully', id });
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

// GET /api/v1/entities/products/:id/units
router.get('/:id/units', async (req: AuthRequest, res: Response) => {
    try {
        const productId = parseInt(req.params.id as string);
        const productUnits = await ProductUnit.findAll({
            where: { product_id: productId },
            include: [{ model: Unit, as: 'unit', attributes: ['id', 'name', 'name_ar', 'is_active'] }]
        });

        res.json(productUnits.map((pu: any) => ({
            id: pu.id,
            unit_id: pu.unit_id,
            price: pu.price,
            unit_name: pu.unit?.name,
            unit_name_ar: pu.unit?.name_ar,
        })));
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

// PUT /api/v1/entities/products/:id/units
// Expects: { units: [{ unit_id: number, price: number, stock_quantity: number, ... }] }
router.put('/:id/units', async (req: AuthRequest, res: Response) => {
    try {
        if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
            return res.status(403).json({ detail: 'Only admins can update product units' });
        }

        const productId = parseInt(req.params.id as string);
        const { units } = req.body;

        if (!Array.isArray(units)) {
            return res.status(400).json({ detail: 'units should be an array' });
        }

        const t = await sequelize.transaction();
        try {
            await ProductUnit.destroy({ where: { product_id: productId }, transaction: t });

            if (units.length > 0) {
                await ProductUnit.bulkCreate(
                    units.map((u: any) => ({
                        product_id: productId,
                        unit_id: u.unit_id,
                        price: parseFloat(u.price)
                    })),
                    { transaction: t }
                );
            }

            await t.commit();
            res.json({ message: 'Product units updated successfully' });
        } catch (error: any) {
            await t.rollback();
            res.status(500).json({ detail: error.message });
        }
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

export default router;
