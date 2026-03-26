import { Router, Response } from 'express';
import { authenticateJWT, AuthRequest } from '../../middlewares/auth.middleware';
import { Store, Product, StoreProduct, Order, OrderItem, Rating, ProductUnit, Unit, UserAddress, User, Notification, StoreGroup } from '../../models';
import { sequelize } from '../../config/database';
import { Op } from 'sequelize';
import { haversineDistance, calcDeliveryFee, getSettings, getStoreDeliveryFee, createNotification, bulkCreateNotifications } from './helpers';

import { isWithinWorkingHours } from '../../utils/time';
import { OrderDistributionService } from '../../services/order-distribution.service';

const router = Router();
router.use(authenticateJWT);

router.use((req, res, next) => {
    console.log(`[CUSTOMER_ROUTER] ${req.method} ${req.url} (authenticated user: ${(req as any).user?.id})`);
    next();
});

// POST /api/v1/grocery/orders
router.post('/orders', async (req: AuthRequest, res: Response) => {
    const t = await sequelize.transaction();
    try {
        const { store_id, items, delivery_address, delivery_lat, delivery_lng, notes, group_id } = req.body;

        const store = await Store.findOne({ where: { id: store_id, is_approved: true }, transaction: t });
        if (!store) { await t.rollback(); return res.status(404).json({ detail: 'Store not found or not approved' }); }
        if (!store.is_accepting_orders) { await t.rollback(); return res.status(400).json({ detail: 'Store is currently not accepting new orders' }); }

        // --- Working Hours Check ---
        if (!isWithinWorkingHours(store.working_hours)) {
            await t.rollback();
            return res.status(400).json({ 
                detail: `المحل "${store.name}" مغلق حالياً. أوقات العمل: ${store.working_hours || 'غير محددة'}`,
                is_closed: true 
            });
        }

        const settings = await getSettings();
        const baseFee = parseFloat(settings.base_delivery_fee || '2.99');
        const perKm = parseFloat(settings.per_km_fee || '0.5');

        const { fee, area_type, allowed } = await getStoreDeliveryFee(store_id, delivery_lat, delivery_lng, baseFee, perKm);

        if (!allowed) {
            await t.rollback();
            return res.status(400).json({ 
                detail: area_type === 'C' ? 'التوصيل غير متوفر لمنطقتك حالياً' : 'موقعك خارج نطاق توصيل هذا المحل',
                not_allowed: true,
                area_type
            });
        }

        let delivery_fee = fee;
        const dist = haversineDistance(delivery_lat, delivery_lng, store.latitude, store.longitude);
        if (fee === -1) {
            delivery_fee = calcDeliveryFee(dist, baseFee, perKm);
        }


        // Batch-fetch all products + their units in 2 queries — replaces 2 per-item queries
        const productIds = (items as any[]).map((i: any) => i.product_id);
        const [allProducts, allProductUnits] = await Promise.all([
            Product.findAll({ where: { id: productIds }, transaction: t }),
            ProductUnit.findAll({
                where: { product_id: productIds },
                include: [{ model: Unit, as: 'unit' }],
                transaction: t,
            }),
        ]);

        const productMap: Record<number, InstanceType<typeof Product>> =
            Object.fromEntries(allProducts.map(p => [p.id, p]));
        const puByUnitId: Record<string, any> = {};
        const puByUnitName: Record<string, any> = {};
        for (const pu of allProductUnits) {
            puByUnitId[`${pu.product_id}:${pu.unit_id}`] = pu;
            const n  = (pu as any).unit?.name;
            const na = (pu as any).unit?.name_ar;
            if (n)  puByUnitName[`${pu.product_id}:${n}`]  = pu;
            if (na) puByUnitName[`${pu.product_id}:${na}`] = pu;
        }

        let subtotal = 0;
        const orderItemsData: any[] = [];
        const now = new Date();
        for (const item of items) {
            const product = productMap[item.product_id];
            if (!product) { await t.rollback(); return res.status(404).json({ detail: `Product ${item.product_id} not found` }); }
            if (!product.is_available) { await t.rollback(); return res.status(400).json({ detail: `${product.name} is currently unavailable` }); }

            // --- Stock Check & Decrement ---
            // If store_id is set (direct order), we check stock in that store
            const storeProduct = await StoreProduct.findOne({
                where: { store_id, product_id: product.id },
                transaction: t
            });
            if (!storeProduct) { await t.rollback(); return res.status(404).json({ detail: `Product ${product.name} not assigned to this store` }); }
            if (storeProduct.stock_quantity !== null && storeProduct.stock_quantity < item.quantity) {
                await t.rollback();
                return res.status(400).json({ 
                    detail: `عذراً، الكمية المطلوبة من "${product.name}" غير متوفرة. المتبقي: ${storeProduct.stock_quantity}`,
                    insufficient_stock: true 
                });
            }
            // Decrement stock
            if (storeProduct.stock_quantity !== null) {
                await StoreProduct.decrement('stock_quantity', {
                    by: item.quantity,
                    where: { store_id, product_id: product.id },
                    transaction: t
                });
            }
            // -------------------------------

            let pu: any = null;
            if (item.unit_id) {
                pu = puByUnitId[`${item.product_id}:${item.unit_id}`];
            } else if (item.unit_name) {
                pu = puByUnitName[`${item.product_id}:${item.unit_name}`];
            }
            if (!pu) { await t.rollback(); return res.status(404).json({ detail: `Unit not found for product ${product.name}` }); }

            let unitPrice = pu.price;
            if (storeProduct.sale_price !== null && storeProduct.sale_price !== undefined) {
                unitPrice = Number(storeProduct.sale_price);
            } else if (storeProduct.override_price !== null && storeProduct.override_price !== undefined) {
                unitPrice = Number(storeProduct.override_price);
            }

            // ADDING CUSTOMIZATION PRICES
            let customizationExtra = 0;
            if (item.customizations && Array.isArray(item.customizations)) {
                for (const stage of item.customizations) {
                    if (stage.options && Array.isArray(stage.options)) {
                        for (const opt of stage.options) {
                            customizationExtra += (Number(opt.price) || 0);
                        }
                    }
                }
            }
            unitPrice += customizationExtra;

            const lineTotal = Math.round(unitPrice * item.quantity * 100) / 100;
            subtotal += lineTotal;
            orderItemsData.push({
                product_id: product.id,
                product_name: product.name,
                quantity: item.quantity,
                unit_price: unitPrice,
                subtotal: lineTotal,
                unit_name: item.unit_name || pu.unit?.name_ar || pu.unit?.name || 'unit',
                product_unit_id: pu.id,
                customizations: item.customizations || null,
            });
        }

        const total = Math.round((subtotal + delivery_fee) * 100) / 100;

        const order = await Order.create({ user_id: req.user.id, store_id, status: 'pending', subtotal, delivery_fee, total, delivery_address, delivery_lat, delivery_lng, notes, group_id, created_at: now, updated_at: now }, { transaction: t });

        // Batch insert all items in one statement
        await OrderItem.bulkCreate(orderItemsData.map(oi => ({ ...oi, order_id: order.id })), { transaction: t });

        await t.commit();
        console.log(`[ORDER_CREATED] Order #${order.id} created for StoreID: ${store_id} (UserID: ${store.user_id})`);
        await createNotification(store.user_id, '🛒 New Order Received!', `New order #${order.id} worth ₪${total.toFixed(2)} has been placed.`, 'new_order', order.id);

        res.status(201).json({ ...order.toJSON(), items: orderItemsData });
    } catch (e: any) {
        await t.rollback();
        res.status(500).json({ detail: e.message });
    }
});

// POST /api/v1/grocery/orders/smart
// Smart distribution: resolves prices, runs greedy set cover, creates optimal sub-orders
router.post('/orders/smart', async (req: AuthRequest, res: Response) => {
    const t = await sequelize.transaction();
    try {
        const { items, delivery_address, delivery_lat, delivery_lng, notes } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            await t.rollback();
            return res.status(400).json({ detail: 'Items are required' });
        }

        // Batch-fetch all products + their units in 2 queries — replaces 2 per-item queries
        const productIds = (items as any[]).map((i: any) => i.product_id);
        const [allProducts, allProductUnits] = await Promise.all([
            Product.findAll({ where: { id: productIds }, transaction: t }),
            ProductUnit.findAll({
                where: { product_id: productIds },
                include: [{ model: Unit, as: 'unit' }],
                transaction: t,
            }),
        ]);

        const productMap: Record<number, InstanceType<typeof Product>> =
            Object.fromEntries(allProducts.map(p => [p.id, p]));
        const puByUnitId: Record<string, any> = {};
        const puByUnitName: Record<string, any> = {};
        for (const pu of allProductUnits) {
            puByUnitId[`${pu.product_id}:${pu.unit_id}`] = pu;
            const n  = (pu as any).unit?.name;
            const na = (pu as any).unit?.name_ar;
            if (n)  puByUnitName[`${pu.product_id}:${n}`]  = pu;
            if (na) puByUnitName[`${pu.product_id}:${na}`] = pu;
        }

        // 1. Resolve product details and prices for each item (no per-item DB queries)
        const resolvedItems: any[] = [];
        for (const item of items) {
            const product = productMap[item.product_id];
            if (!product) { await t.rollback(); return res.status(404).json({ detail: `Product ${item.product_id} not found` }); }
            if (!product.is_available) { await t.rollback(); return res.status(400).json({ detail: `${product.name} is currently unavailable` }); }

            let pu: any = null;
            if (item.unit_id) {
                pu = puByUnitId[`${item.product_id}:${item.unit_id}`];
            } else if (item.unit_name) {
                pu = puByUnitName[`${item.product_id}:${item.unit_name}`];
            }
            if (!pu) { await t.rollback(); return res.status(404).json({ detail: `Unit not found for product ${product.name}` }); }

            let unitPrice = pu.price;

            // ADDING CUSTOMIZATION PRICES for Smart Order
            let customizationExtra = 0;
            if (item.customizations && Array.isArray(item.customizations)) {
                for (const stage of item.customizations) {
                    if (stage.options && Array.isArray(stage.options)) {
                        for (const opt of stage.options) {
                            customizationExtra += (Number(opt.price) || 0);
                        }
                    }
                }
            }
            unitPrice += customizationExtra;

            const lineTotal = Math.round(unitPrice * item.quantity * 100) / 100;

            resolvedItems.push({
                product_id: product.id,
                product_name: product.name,
                quantity: item.quantity,
                unit_price: unitPrice,
                subtotal: lineTotal,
                unit_name: pu.unit?.name_ar || pu.unit?.name || item.unit_name || null,
                customizations: item.customizations || null,
            });
        }

        // 2. Run distribution algorithm
        const distributionService = new OrderDistributionService();
        const distResult = await distributionService.distributeOrder(
            resolvedItems,
            delivery_lat,
            delivery_lng
        );

        if (!distResult.fulfilled) {
            await t.rollback();
            const unfulfillableNames = distResult.unfulfillableItems.map((i: any) => i.product_name).join(', ');
            return res.status(422).json({
                detail: `Order cannot be fulfilled. The following items are not available in any active store: ${unfulfillableNames}`,
                unfulfillableItems: distResult.unfulfillableItems,
            });
        }

        // 3. Create one order per assigned store
        const groupId = `GRP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date();
        const createdOrders: any[] = [];
        const settings = await getSettings();

        // Batch-fetch all assigned stores — replaces 1 query per assignment
        const assignmentStoreIds = distResult.assignments.map((a: any) => a.store_id);
        const assignmentStores = await Store.findAll({
            where: { id: assignmentStoreIds },
            include: [{ model: StoreGroup, as: 'group' }],
            transaction: t
        });
        const assignmentStoreMap: Record<number, InstanceType<typeof Store>> =
            Object.fromEntries(assignmentStores.map((s: any) => [s.id, s]));

        // Check working hours and initialize group tracker
        const processedGroups = new Set<number>();

        for (const assignment of distResult.assignments) {
            const store = assignmentStoreMap[assignment.store_id];
            if (store && !isWithinWorkingHours(store.working_hours)) {
                await t.rollback();
                return res.status(400).json({
                    detail: `عذراً، المحل "${store.name}" مغلق حالياً ولا يستقبل طلبات. أوقات العمل: ${store.working_hours}`,
                    is_closed: true,
                    store_name: store.name
                });
            }
        }

        for (const assignment of distResult.assignments) {
            const store = assignmentStoreMap[assignment.store_id];
            if (!store) { await t.rollback(); return res.status(404).json({ detail: `Store ${assignment.store_id} not found` }); }

            const baseFee = parseFloat(settings.base_delivery_fee || '2.99');
            const perKm = parseFloat(settings.per_km_fee || '0.5');

            // --- Individual Store Range Check (REQUIRED even for grouped stores) ---
            const rangeInfo = await getStoreDeliveryFee(assignment.store_id, delivery_lat, delivery_lng, baseFee, perKm);
            if (!rangeInfo.allowed) {
                await t.rollback();
                return res.status(400).json({
                    detail: 'عذراً، التوصيل غير متوفر لموقعك',
                    not_allowed: true,
                    store_id: assignment.store_id,
                    area_type: rangeInfo.area_type
                });
            }

            let delivery_fee = 0;
            if (store.group_id && store.group && store.group.is_active) {
                if (!processedGroups.has(store.group_id)) {
                    delivery_fee = Number(store.group.delivery_fee);
                    processedGroups.add(store.group_id);
                } else {
                    delivery_fee = 0; // Covered by group
                }
            } else {
                delivery_fee = rangeInfo.fee;
                if (delivery_fee === -1) {
                    const dist = haversineDistance(delivery_lat, delivery_lng, store.latitude, store.longitude);
                    delivery_fee = calcDeliveryFee(dist, baseFee, perKm);
                }
            }

             let subtotal = 0;
             for (const oi of assignment.items) {
                  const sp = await StoreProduct.findOne({ where: { store_id: assignment.store_id, product_id: oi.product_id }, transaction: t });
                  if (sp) {
                       if (sp.sale_price !== null && sp.sale_price !== undefined) oi.unit_price = Number(sp.sale_price);
                       else if (sp.override_price !== null && sp.override_price !== undefined) oi.unit_price = Number(sp.override_price);
                       
                       // RE-ADD CUSTOMIZATION PRICES HERE
                       let customizationExtra = 0;
                       if (oi.customizations && Array.isArray(oi.customizations)) {
                           for (const stage of oi.customizations) {
                               if (stage.options && Array.isArray(stage.options)) {
                                   for (const opt of stage.options) {
                                       customizationExtra += (Number(opt.price) || 0);
                                   }
                               }
                           }
                       }
                       oi.unit_price += customizationExtra;
                       oi.subtotal = Math.round(oi.unit_price * oi.quantity * 100) / 100;
                  }
                  subtotal += oi.subtotal;
             }

            const total = Math.round((subtotal + delivery_fee) * 100) / 100;

            const order = await Order.create({
                user_id: req.user.id,
                store_id: assignment.store_id,
                status: 'pending',
                subtotal,
                delivery_fee,
                total,
                delivery_address,
                delivery_lat,
                delivery_lng,
                notes: notes || null,
                group_id: distResult.assignments.length > 1 ? groupId : null,
                created_at: now,
                updated_at: now,
            }, { transaction: t });

            // Batch insert items for this order and decrement stock
            for (const oi of assignment.items) {
                await StoreProduct.decrement('stock_quantity', {
                    by: oi.quantity,
                    where: { store_id: assignment.store_id, product_id: oi.product_id, stock_quantity: { [Op.ne]: null } },
                    transaction: t
                });
            }
            await OrderItem.bulkCreate(assignment.items.map((oi: any) => ({ ...oi, order_id: order.id })), { transaction: t });

            createdOrders.push({ ...order.toJSON(), items: assignment.items });
            console.log(`[SMART_ORDER_CREATED] Order #${order.id} for StoreID: ${assignment.store_id} (UserID: ${store.user_id})`);
            
            // Notify store owner
            await createNotification(store.user_id, '🛒 New Order Received!', `New order #${order.id} worth ₪${total.toFixed(2)} has been placed.`, 'new_order', order.id);
        }

        await t.commit();

        if (createdOrders.length === 1) {
            res.status(201).json(createdOrders[0]);
        } else {
            res.status(201).json({
                distributed: true,
                group_id: groupId,
                total_stores: createdOrders.length,
                orders: createdOrders,
            });
        }
    } catch (e: any) {
        await t.rollback();
        res.status(500).json({ detail: e.message });
    }
});

// GET /api/v1/grocery/my-orders
router.get('/my-orders', async (req: AuthRequest, res: Response) => {
    try {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
        const offset = (page - 1) * limit;

        const { count, rows: orders } = await Order.findAndCountAll({
            where: { user_id: req.user.id },
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

// POST /api/v1/grocery/orders/:id/rate
router.post('/orders/:id/rate', async (req: AuthRequest, res: Response) => {
    try {
        const orderId = parseInt(req.params.id as string);
        const { store_rating, driver_rating, comment } = req.body;
        const order = await Order.findOne({ where: { id: orderId, user_id: req.user.id } });
        if (!order) return res.status(404).json({ detail: 'Order not found' });
        if (order.status !== 'delivered') return res.status(400).json({ detail: 'Can only rate delivered orders' });

        const t = await sequelize.transaction();
        try {
            await Rating.create({ user_id: req.user.id, order_id: orderId, store_id: order.store_id, driver_id: order.driver_id ?? undefined, store_rating, driver_rating, comment, created_at: new Date() }, { transaction: t });

            if (store_rating) {
                const store = await Store.findByPk(order.store_id, { transaction: t });
                if (store) {
                    const newTotal = (store.total_ratings ?? 0) + 1;
                    const newRating = Math.round((((store.rating ?? 0) * (newTotal - 1)) + store_rating) / newTotal * 10) / 10;
                    await store.update({ rating: newRating, total_ratings: newTotal }, { transaction: t });
                }
            }
            await t.commit();
            res.json({ message: 'Rating submitted successfully' });
        } catch (e: any) {
            await t.rollback();
            res.status(500).json({ detail: e.message });
        }
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

// Unified Cancellation Route
// This handles both single orders and consolidated groups of orders
router.post('/orders/cancel/:id', async (req: AuthRequest, res: Response) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        console.log(`[CANCEL_REQUEST] ID: ${id} for user ${req.user.id}`);

        // 1. Try to see if this is a group ID
        let orders = await Order.findAll({
            where: { group_id: id, user_id: req.user.id },
            transaction: t
        });

        // 2. If not a group ID, try to see if it is a single order ID
        if (orders.length === 0) {
            const idInt = parseInt(id as string);
            if (!isNaN(idInt)) {
                const singleOrder = await Order.findOne({
                    where: { id: idInt, user_id: req.user.id },
                    transaction: t
                });
                if (singleOrder) {
                    orders = [singleOrder];
                }
            }
        }

        if (orders.length === 0) {
            await t.rollback();
            console.log(`[CANCEL_ERROR] No orders found with ID/Group: ${id as string} (type: ${typeof id})`);
            return res.status(404).json({ detail: `Order(s) not found for cancellation. (ID: ${id})` });
        }

        // 3. Validation
        const nonPending = orders.filter(o => o.status !== 'pending' && o.status !== 'awaiting_customer');
        if (nonPending.length > 0) {
            await t.rollback();
            console.log(`[CANCEL_ERROR] Some orders not pending: ${nonPending.map(o => o.id)}`);
            return res.status(400).json({ detail: 'Some parts of this order are already being processed and cannot be cancelled.' });
        }

        // 4. Cancel all and RESTORE Stock
        // Fetch all items for these orders to restore stock
        const itemsToRestore = await OrderItem.findAll({
            where: { order_id: orders.map(o => o.id) },
            transaction: t
        });

        for (const item of itemsToRestore) {
            // Find the order to get the store_id (slow? maybe. but safe)
            const order = orders.find(o => o.id === item.order_id);
            if (order) {
                await StoreProduct.increment('stock_quantity', {
                    by: item.quantity,
                    where: { store_id: order.store_id, product_id: item.product_id, stock_quantity: { [Op.ne]: null } },
                    transaction: t
                });
            }
        }

        await Order.update(
            { status: 'cancelled', updated_at: new Date() },
            { where: { id: orders.map(o => o.id) }, transaction: t }
        );

        // Batch-fetch stores (deduplicated) — eliminates N+1 store lookup
        const storeIds = [...new Set(orders.map(o => o.store_id))];
        const stores = await Store.findAll({
            where: { id: storeIds },
            attributes: ['id', 'user_id', 'name'],
            transaction: t,
        });
        const storeMap: Record<number, InstanceType<typeof Store>> =
            Object.fromEntries(stores.map(s => [s.id, s]));

        // Batch-create all store notifications in one INSERT
        const notifications = orders
            .map(o => storeMap[o.store_id])
            .filter(Boolean)
            .map((store, i) => ({
                user_id: store.user_id,
                title: '⚠️ Order Cancelled',
                body: `Order #${orders[i].id} cancelled by customer.`,
                type: 'order_cancelled',
                order_id: orders[i].id,
                is_read: false,
                created_at: new Date(),
            }));

        if (notifications.length > 0) {
            await Notification.bulkCreate(notifications as any, { transaction: t });
        }

        await t.commit();
        console.log(`[CANCEL_SUCCESS] Cancelled ${orders.length} order(s) for user ${req.user.id}`);
        res.json({ message: 'Order(s) cancelled successfully', count: orders.length });
    } catch (e: any) {
        if (t) await t.rollback();
        console.error('[CANCEL_CRITICAL]', e);
        res.status(500).json({ detail: e.message });
    }
});

// Alias for old endpoints for backward compatibility if needed (but we will update frontend)
router.post('/orders/:id/cancel', (req, res) => {
    // Validate id is a non-empty alphanumeric/hyphen/underscore string before using it
    // in a redirect URL to prevent path-traversal or log-injection attacks.
    const id = req.params.id;
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
        return res.status(400).json({ detail: 'Invalid order id' });
    }
    res.redirect(307, `/api/v1/grocery/orders/cancel/${id}`);
});
router.post('/orders/cancel-group/:groupId', (req, res) => res.redirect(307, `/api/v1/grocery/orders/cancel/${req.params.groupId}`));

// POST /api/v1/grocery/orders/:id/resolve-missing
router.post('/orders/:id/resolve-missing', async (req: AuthRequest, res: Response) => {
    const t = await sequelize.transaction();
    try {
        const orderId = parseInt(req.params.id as string);
        const { action } = req.body; // 'continue' or 'cancel'

        const order = await Order.findOne({
            where: { id: orderId, user_id: req.user.id },
            transaction: t
        });

        if (!order) {
            await t.rollback();
            return res.status(404).json({ detail: 'Order not found' });
        }

        if (order.status !== 'awaiting_customer' && order.status !== 'unavailable') {
            await t.rollback();
            return res.status(400).json({ detail: 'No missing items resolution pending' });
        }

        const store = await Store.findByPk(order.store_id, { transaction: t });

        if (action === 'cancel') {
            let groupOrders = [order];
            if (order.group_id) {
                groupOrders = await Order.findAll({ where: { group_id: order.group_id, user_id: req.user.id }, transaction: t });
            } else {
                // Heuristic grouping (same user, address, roughly same time)
                const createdAt = order.created_at ? new Date(order.created_at) : new Date();
                const thirtyMinsBefore = new Date(createdAt.getTime() - 30 * 60000);
                const thirtyMinsAfter = new Date(createdAt.getTime() + 30 * 60000);
                const related = await Order.findAll({
                    where: {
                        user_id: req.user.id,
                        delivery_address: order.delivery_address,
                        created_at: { [Op.between]: [thirtyMinsBefore, thirtyMinsAfter] }
                    },
                    transaction: t
                });
                groupOrders = related;
            }

            const cancelableOrders = groupOrders.filter(go => go.status !== 'cancelled' && go.status !== 'delivered');

            if (cancelableOrders.length > 0) {
                await Order.update(
                    { status: 'cancelled', updated_at: new Date() },
                    { where: { id: cancelableOrders.map(go => go.id) }, transaction: t }
                );

                const cancelStoreIds = [...new Set(cancelableOrders.map(go => go.store_id))];
                const cancelStores = await Store.findAll({
                    where: { id: cancelStoreIds }, attributes: ['id', 'user_id'], transaction: t
                });
                const cancelStoreMap: Record<number, InstanceType<typeof Store>> =
                    Object.fromEntries(cancelStores.map(s => [s.id, s]));

                await bulkCreateNotifications(
                    cancelableOrders
                        .map(go => {
                            const s = cancelStoreMap[go.store_id];
                            if (!s) return null;
                            return {
                                user_id: s.user_id,
                                title: '❌ Order Cancelled',
                                body: `Customer response: Cancelled entire order #${go.id} due to missing items in their consolidated order.`,
                                type: 'resolution_cancel',
                                order_id: go.id,
                            };
                        })
                        .filter((n): n is NonNullable<typeof n> => n !== null),
                    t
                );
            }

            await t.commit();
            return res.json({ message: 'Order group cancelled as requested' });
        }

        if (action === 'continue') {
            const allOrders = await Order.findAll({
                where: { group_id: order.group_id },
                transaction: t
            });

            for (const subOrder of allOrders) {
                // Only process orders that are not already finalized
                if (['delivered', 'cancelled', 'unavailable', 'rejected'].includes(subOrder.status)) continue;

                if (subOrder.status === 'awaiting_customer') {
                    if (subOrder.issue_details === 'STORE_CANCELLED') {
                        // Mark all items as unavailable for this sub-order record
                        await OrderItem.update({ status: 'unavailable' }, {
                            where: { order_id: subOrder.id },
                            transaction: t
                        });

                        await subOrder.update({
                            status: 'unavailable',
                            issue_details: 'Unfulfillable (Resolved by customer)',
                            updated_at: new Date()
                        }, { transaction: t });
                        continue;
                    }

                    if (subOrder.issue_details) {
                        const missingItemIds = subOrder.issue_details.split(',');
                        // Remove missing items
                        const missingItems = await OrderItem.findAll({
                            where: { id: missingItemIds, order_id: subOrder.id },
                            transaction: t
                        });

                        let deductedSubtotal = 0;
                        for (const item of missingItems) {
                            deductedSubtotal += Number(item.subtotal);
                            await item.update({ status: 'unavailable' }, { transaction: t });
                        }

                        const remainingItemsCount = await OrderItem.count({
                            where: { order_id: subOrder.id, status: 'available' },
                            transaction: t
                        });

                        if (remainingItemsCount === 0) {
                            await subOrder.update({
                                status: 'unavailable',
                                subtotal: 0,
                                total: 0,
                                issue_details: 'All items missing (Resolved by customer)',
                                updated_at: new Date()
                            }, { transaction: t });
                        } else {
                            const newSubtotal = Math.max(0, Number(subOrder.subtotal) - deductedSubtotal);
                            const newTotal = newSubtotal + Number(subOrder.delivery_fee);
                            await subOrder.update({
                                status: 'accepted',
                                subtotal: newSubtotal,
                                total: newTotal,
                                issue_details: null,
                                updated_at: new Date()
                            }, { transaction: t });
                        }
                        continue;
                    }
                }

                // If it was just pending, accept it now
                if (subOrder.status === 'pending') {
                    await subOrder.update({ status: 'accepted', updated_at: new Date() }, { transaction: t });
                }
            }

            // Batch-fetch all stores for the notifications — avoids a per-order DB round-trip
            const continueStoreIds = [...new Set(allOrders.map(o => o.store_id))];
            const continueStores = await Store.findAll({
                where: { id: continueStoreIds }, attributes: ['id', 'user_id'], transaction: t
            });
            const continueStoreMap: Record<number, InstanceType<typeof Store>> =
                Object.fromEntries(continueStores.map(s => [s.id, s]));

            await bulkCreateNotifications(
                allOrders
                    .map(subOrder => {
                        const s = continueStoreMap[subOrder.store_id];
                        if (!s) return null;
                        if (subOrder.status === 'accepted') {
                            return { user_id: s.user_id, title: '✅ Order Confirmed', body: `Customer chose to proceed with your store for order #${subOrder.id}.`, type: 'resolution_continue', order_id: subOrder.id };
                        } else if (subOrder.status === 'unavailable') {
                            return { user_id: s.user_id, title: 'ℹ️ Order Resolved (Unavailable)', body: `Customer acknowledged that you cannot fulfill order #${subOrder.id}. Moved to history.`, type: 'resolution_continue', order_id: subOrder.id };
                        }
                        return null;
                    })
                    .filter((n): n is NonNullable<typeof n> => n !== null),
                t
            );

            // 4. Check if the group is now available for drivers
            // (i.e., at least one is ready and NO others are pending/preparing)
            const readyCount = allOrders.filter(o => o.status === 'ready').length;
            const pendingCount = allOrders.filter(o => ['pending', 'accepted', 'preparing', 'awaiting_customer'].includes(o.status)).length;

            if (readyCount > 0 && pendingCount === 0) {
                const allDrivers = await User.findAll({ 
                    where: { role: 'driver', status: 'active', is_available: true }, 
                    attributes: ['id', 'working_hours'],
                    transaction: t 
                });

                const activeDrivers = allDrivers.filter(driver => isWithinWorkingHours(driver.working_hours));

                if (activeDrivers.length > 0) {
                    await bulkCreateNotifications(
                        activeDrivers.map(driver => ({
                            user_id: driver.id,
                            title: '🚀 New Group Delivery Available!',
                            body: `A group order covering multiple stores is now ready for pickup!`,
                            type: 'new_delivery',
                            order_id: order.id
                        }))
                    );
                }
            }

            await t.commit();
            return res.json({ message: 'Order group resolved. Stores can now begin preparation.' });
        }

        await t.rollback();
        res.status(400).json({ detail: 'Invalid action' });
    } catch (e: any) {
        if (t) await t.rollback();
        console.error('Resolve missing error:', e);
        res.status(500).json({ detail: e.message || 'Internal server error' });
    }
});

// ── Saved Addresses ──────────────────────────────────────────────

// GET /api/v1/grocery/addresses
router.get('/addresses', async (req: AuthRequest, res: Response) => {
    try {
        const addresses = await UserAddress.findAll({
            where: { user_id: req.user.id },
            order: [['is_default', 'DESC'], ['created_at', 'DESC']],
        });
        res.json(addresses);
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

// POST /api/v1/grocery/addresses
router.post('/addresses', async (req: AuthRequest, res: Response) => {
    try {
        const { label, address, latitude, longitude, is_default } = req.body;
        if (!address || latitude == null || longitude == null) {
            return res.status(400).json({ detail: 'address, latitude, and longitude are required' });
        }

        // If marking as default, unset all others first
        if (is_default) {
            await UserAddress.update({ is_default: false } as any, { where: { user_id: req.user.id } });
        }

        const newAddr = await UserAddress.create({
            user_id: req.user.id,
            label: label || 'Home',
            address,
            latitude,
            longitude,
            is_default: is_default || false,
        });
        res.status(201).json(newAddr);
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

// DELETE /api/v1/grocery/addresses/:id
router.delete('/addresses/:id', async (req: AuthRequest, res: Response) => {
    try {
        const addr = await UserAddress.findOne({ where: { id: parseInt(req.params.id as string), user_id: req.user.id } });
        if (!addr) return res.status(404).json({ detail: 'Address not found' });
        await addr.destroy();
        res.json({ message: 'Address deleted' });
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

// PUT /api/v1/grocery/addresses/:id/default
router.put('/addresses/:id/default', async (req: AuthRequest, res: Response) => {
    try {
        const addr = await UserAddress.findOne({ where: { id: parseInt(req.params.id as string), user_id: req.user.id } });
        if (!addr) return res.status(404).json({ detail: 'Address not found' });

        await UserAddress.update({ is_default: false } as any, { where: { user_id: req.user.id } });
        await addr.update({ is_default: true } as any);
        res.json({ message: 'Default address updated' });
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

export default router;
