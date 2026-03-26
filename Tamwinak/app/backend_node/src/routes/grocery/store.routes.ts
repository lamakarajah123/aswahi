import { Router, Response } from 'express';
import { Op, fn, col } from 'sequelize';
import { sequelize } from '../../config/database';
import { authenticateJWT, AuthRequest } from '../../middlewares/auth.middleware';
import { Store, Order, OrderItem, User, Product, StoreProduct, ProductUnit, Unit, Industry } from '../../models';
import { createNotification, bulkCreateNotifications } from './helpers';
import { isWithinWorkingHours } from '../../utils/time';

const router = Router();
router.use(authenticateJWT);

// GET /api/v1/grocery/store/my-store
router.get('/store/my-store', async (req: AuthRequest, res: Response) => {
    try {
        const store = await Store.findOne({ where: { user_id: req.user.id } });
        res.json(store ?? null);
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

// PUT /api/v1/grocery/store/my-store/toggle-orders
router.put('/store/my-store/toggle-orders', async (req: AuthRequest, res: Response) => {
    try {
        const store = await Store.findOne({ where: { user_id: req.user.id } });
        if (!store) return res.status(404).json({ detail: "You don't have a store" });

        await store.update({ is_accepting_orders: !store.is_accepting_orders } as any);
        res.json({ message: 'Store status updated', is_accepting_orders: store.is_accepting_orders });
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

// GET /api/v1/grocery/store/orders
router.get('/store/orders', async (req: AuthRequest, res: Response) => {
    try {
        const store = await Store.findOne({ where: { user_id: req.user.id } });
        if (!store) return res.status(404).json({ detail: "You don't have a store" });

        const where: any = { store_id: store.id };
        if (req.query.status) where.status = req.query.status;

        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 30));
        const offset = (page - 1) * limit;

        const { count, rows: orders } = await Order.findAndCountAll({
            where,
            include: [{ model: OrderItem, as: 'items' }],
            order: [['created_at', 'DESC']],
            limit,
            offset,
        });
        res.json({ data: orders, total: count, page, totalPages: Math.ceil(count / limit), limit });
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

// GET /api/v1/grocery/store/products
router.get('/store/products', async (req: AuthRequest, res: Response) => {
    try {
        const store = await Store.findOne({ where: { user_id: req.user.id } });
        if (!store) return res.status(404).json({ detail: "You don't have a store" });

        const search = req.query.search as string;
        const where: any = { store_id: store.id };
        
        const storeProducts = await StoreProduct.findAll({
            where,
            include: [
                {
                    model: Product,
                    as: 'product',
                    where: search ? {
                        [Op.or]: [
                            { name: { [Op.iLike]: `%${search}%` } },
                            { name_ar: { [Op.iLike]: `%${search}%` } }
                        ]
                    } : undefined,
                    include: [
                        { model: Industry, as: 'industry', attributes: ['name', 'name_ar'] },
                        { 
                            model: ProductUnit, 
                            as: 'product_units',
                            include: [{ model: Unit, as: 'unit', attributes: ['name', 'name_ar'] }]
                        }
                    ]
                }
            ]
        });

        res.json(storeProducts);
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

// PUT /api/v1/grocery/store/products/:id
router.put('/store/products/:id', async (req: AuthRequest, res: Response) => {
    try {
        const productId = parseInt(req.params.id as string);
        const { is_available, override_price, sale_price, sale_start, sale_end, stock_quantity } = req.body;
        console.log(`[DEBUG_PRICE_UPDATE] storeId=${req.user.store_id} prodId=${productId} sale_price=${sale_price} sale_start=${sale_start} sale_end=${sale_end}`);

        const store = await Store.findOne({ where: { user_id: req.user.id } });
        if (!store) return res.status(404).json({ detail: 'Store not found' });



        const storeProduct = await StoreProduct.findOne({ 
            where: { store_id: store.id, product_id: productId },
            include: [{ 
                model: Product, 
                as: 'product',
                include: [{ model: ProductUnit, as: 'product_units', limit: 1 }] 
            }]
        });
        if (!storeProduct) return res.status(404).json({ detail: 'Product mapping not found' });

        const updateData: any = {};
        if (is_available !== undefined) updateData.is_available = is_available;
        if (stock_quantity !== undefined) updateData.stock_quantity = stock_quantity;
        
        if (override_price !== undefined || sale_price !== undefined || sale_start !== undefined || sale_end !== undefined) {
            if (!store.can_manage_prices) {
                return res.status(403).json({ detail: "You don't have permission to manage prices. Please contact admin." });
            }

            const currentOverride = (override_price !== undefined) ? override_price : storeProduct.override_price;
            const firstUnit = (storeProduct as any).product?.product_units?.[0];
            const basePrice = firstUnit ? firstUnit.price : 0;
            const regularPrice = (currentOverride !== null && currentOverride !== undefined) ? Number(currentOverride) : Number(basePrice);

            if (sale_price !== undefined && sale_price !== null) {
                const proposedSale = Number(sale_price);
                if (proposedSale >= regularPrice) {
                    return res.status(400).json({ 
                        detail: `Sale price (₪${proposedSale}) must be lower than the regular price (₪${regularPrice}).` 
                    });
                }
            }

            if (override_price !== undefined) updateData.override_price = override_price;
            if (sale_price !== undefined) updateData.sale_price = sale_price;
            const ensureTZ = (d: any) => {
                if (typeof d === 'string' && d.length > 10 && !d.includes('Z') && !d.includes('+') && !d.match(/[-+]\d{2}(:?\d{2})?$/)) {
                    return `${d}:00+02:00`; // Assume Palestine Local Time if no TZ provided
                }
                return d;
            };

            if (sale_start !== undefined) updateData.sale_start = ensureTZ(sale_start) || null;
            if (sale_end !== undefined) updateData.sale_end = ensureTZ(sale_end) || null;
        }

        await storeProduct.update(updateData);

        res.json({ message: 'Store product updated successfully', data: storeProduct });
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

// PUT /api/v1/grocery/store/orders/:id/status
router.put('/store/orders/:id/status', async (req: AuthRequest, res: Response) => {
    try {
        const orderId = parseInt(req.params.id as string);
        const { status } = req.body;
        const store = await Store.findOne({ where: { user_id: req.user.id } });
        if (!store) return res.status(404).json({ detail: 'Store not found' });

        const order = await Order.findOne({ where: { id: orderId, store_id: store.id } });
        if (!order) return res.status(404).json({ detail: 'Order not found' });

        const validTransitions: Record<string, string[]> = {
            pending: ['accepted', 'cancelled'],
            accepted: ['preparing', 'cancelled'],
            preparing: ['ready']
        };

        if (!(validTransitions[order.status] ?? []).includes(status)) {
            return res.status(400).json({ detail: `Cannot transition from ${order.status} to ${status}` });
        }

        // --- Multi-Store Cancellation Logic ---
        // If a store wants to cancel/reject an order that is part of a group, 
        // we ask the customer if they want to continue with the rest or cancel all.
        if (status === 'cancelled' && order.group_id) {
            // Check if there are other orders in this group that are not cancelled
            const otherOrdersCount = await Order.count({
                where: {
                    group_id: order.group_id,
                    id: { [Op.ne]: order.id },
                    status: { [Op.ne]: 'cancelled' }
                }
            });

            if (otherOrdersCount > 0) {
                // Set to unavailable immediately so it moves to history and RESTORE stock
                const itemsToRestore = await OrderItem.findAll({ where: { order_id: order.id } });
                for (const item of itemsToRestore) {
                    await StoreProduct.increment('stock_quantity', {
                        by: item.quantity,
                        where: { store_id: store.id, product_id: item.product_id, stock_quantity: { [Op.ne]: null } }
                    });
                }

                await order.update({
                    status: 'unavailable',
                    issue_details: 'STORE_CANCELLED',
                    updated_at: new Date()
                });

                await createNotification(
                    order.user_id,
                    '⚠️ Action Required: Store Unfulfillable',
                    `Store "${store.name}" cannot fulfill your order. Do you want to continue with your items from other stores or cancel everything?`,
                    'missing_items_alert',
                    order.id
                );

                return res.json({
                    message: 'Order marked as unavailable. Customer will be notified to decide on the rest of the group.',
                    status: 'unavailable'
                });
            }
        }
        // --- End Multi-Store Logic ---

        if (status === 'cancelled') {
            const itemsToRestore = await OrderItem.findAll({ where: { order_id: order.id } });
            for (const item of itemsToRestore) {
                await StoreProduct.increment('stock_quantity', {
                    by: item.quantity,
                    where: { store_id: store.id, product_id: item.product_id, stock_quantity: { [Op.ne]: null } }
                });
            }
        }

        await order.update({ status, updated_at: new Date() });

        const msgs: Record<string, string> = {
            accepted: 'Your order has been accepted!',
            preparing: 'Your order is being prepared!',
            ready: 'Your order is ready for a driver!',
            cancelled: 'Your order was cancelled.'
        };

        if (msgs[status]) {
            await createNotification(order.user_id, `📦 Order #${orderId} Update`, msgs[status], 'order_status', orderId);
        }

        if (status === 'ready') {
            const allDrivers = await User.findAll({ 
                where: { role: 'driver', status: 'active', is_available: true }, 
                attributes: ['id', 'working_hours'] 
            });

            const activeDrivers = allDrivers.filter(driver => isWithinWorkingHours(driver.working_hours));

            if (activeDrivers.length > 0) {
                await bulkCreateNotifications(
                    activeDrivers.map(driver => ({
                        user_id: driver.id,
                        title: '🚀 New Delivery Available!',
                        body: `Order #${orderId} from ${store.name} is ready for pickup!`,
                        type: 'new_delivery',
                        order_id: orderId,
                    }))
                );
            }
        }

        res.json({ message: `Order status updated to ${status}` });
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

// POST /api/v1/grocery/store/orders/:id/report-missing
router.post('/store/orders/:id/report-missing', async (req: AuthRequest, res: Response) => {
    try {
        const orderId = parseInt(req.params.id as string);
        const { missing_items } = req.body; // Array of strings (OrderItem IDs)

        const store = await Store.findOne({ where: { user_id: req.user.id } });
        if (!store) return res.status(404).json({ detail: 'Store not found' });

        const order = await Order.findOne({ where: { id: orderId, store_id: store.id }, include: [{ model: OrderItem, as: 'items' }] });
        if (!order) return res.status(404).json({ detail: 'Order not found' });

        if (order.status !== 'pending' && order.status !== 'accepted') {
            return res.status(400).json({ detail: 'Can only report missing items before preparation is complete' });
        }

        const missingItemNames = (order as any).items
            ?.filter((item: any) => missing_items.includes(item.id.toString()))
            .map((item: any) => item.product_name) || [];

        const totalItemsCount = (order as any).items?.length || 0;
        const missingItemsCount = missing_items.length;

        if (missingItemsCount >= totalItemsCount) {
            // Case 1: All items missing for this store
            await order.update({
                status: 'awaiting_customer',
                issue_details: 'STORE_CANCELLED',
                updated_at: new Date()
            });

            await createNotification(
                order.user_id,
                '⚠️ Action Required: Store Unfulfillable',
                `Store "${store.name}" cannot fulfill your items. Proceed with other stores or cancel everything?`,
                'missing_items_alert',
                orderId
            );

            return res.json({ message: 'Customer notified of store unfulfillability.' });
        }

        // Case 2: Partial items missing.
        // We set to awaiting_customer and let the customer resolve it.
        // The store owner will be blocked in the UI.
        await order.update({
            status: 'awaiting_customer',
            issue_details: missing_items.join(','),
            updated_at: new Date()
        });

        await createNotification(
            order.user_id,
            '⚠️ Action Required: Missing Items',
            `Some items in your order from "${store.name}" are missing: ${missingItemNames.join(', ')}. Do you want to continue or cancel?`,
            'missing_items_alert',
            orderId
        );

        res.json({ message: 'Customer notified of missing items. Waiting for their response.' });

    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

// GET /api/v1/grocery/store/sales-report
router.get('/store/sales-report', async (req: AuthRequest, res: Response) => {
    try {
        const store = await Store.findOne({ where: { user_id: req.user.id } });
        if (!store) return res.status(404).json({ detail: 'Store not found' });

        const [deliveredStats, statusRows] = await Promise.all([
            Order.findAll({
                where: { store_id: store.id, status: 'delivered' },
                attributes: [
                    [fn('COUNT', col('id')), 'total_orders'],
                    [fn('COALESCE', fn('SUM', col('subtotal')), 0), 'total_revenue'],
                ],
                raw: true,
            }),
            Order.findAll({
                where: { store_id: store.id },
                attributes: ['status', [fn('COUNT', col('id')), 'count']],
                group: ['status'],
                raw: true,
            }),
        ]);

        const { total_orders: rawCount, total_revenue: rawRevenue } = (deliveredStats[0] as any) ?? { total_orders: 0, total_revenue: 0 };
        const totalOrders = parseInt(rawCount, 10) || 0;
        const totalRevenue = parseFloat(rawRevenue) || 0;
        const orders_by_status = Object.fromEntries(
            statusRows.map((r: any) => [r.status, parseInt(r.count, 10)])
        );

        res.json({ total_orders: totalOrders, total_revenue: Math.round(totalRevenue * 100) / 100, average_order: totalOrders ? Math.round(totalRevenue / totalOrders * 100) / 100 : 0, orders_by_status, store_rating: store.rating, total_ratings: store.total_ratings });
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

export default router;
