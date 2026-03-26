import { Router, Response } from 'express';
import { Op } from 'sequelize';
import { authenticateJWT, AuthRequest } from '../../middlewares/auth.middleware';
import { Store, Order, User, OrderItem, StoreProduct } from '../../models';
import { haversineDistance, createNotification, bulkCreateNotifications } from './helpers';

const router = Router();
router.use(authenticateJWT);

// GET /api/v1/grocery/driver/available-orders
router.get('/driver/available-orders', async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user.is_available) {
            return res.json([]);
        }

        const lat = parseFloat(req.query.lat as string);
        const lng = parseFloat(req.query.lng as string);

        // Find all orders that are currently "ready" and unassigned
        // IMPORTANT: Never show 'unavailable' or 'cancelled' orders to drivers
        const readyOrders = await Order.findAll({
            where: {
                status: 'ready',
                driver_id: null
            }
        });

        // Filter out grouped orders that are not fully ready
        const groupIdsToCheck = new Set(readyOrders.map(o => o.group_id).filter((id): id is string => id !== null && id !== undefined));

        let validReadyOrders = [...readyOrders];
        if (groupIdsToCheck.size > 0) {
            // Find if any order in these groups is NOT ready
            const notReadyInGroups = await Order.findAll({
                where: {
                    group_id: { [Op.in]: Array.from(groupIdsToCheck) as string[] },
                    status:   { [Op.notIn]: ['ready', 'cancelled', 'unavailable'] }
                }
            });
            const partialGroupIds = new Set(notReadyInGroups.map(o => o.group_id));

            // Keep only singles or fully ready groups
            validReadyOrders = readyOrders.filter(o => !o.group_id || !partialGroupIds.has(o.group_id));
        }

        if (validReadyOrders.length === 0) {
            return res.json([]);
        }

        // Batch-fetch stores + items in two queries — eliminates the dual N+1 sequential loop
        const orderIds  = validReadyOrders.map(o => o.id);
        const storeIds  = [...new Set(validReadyOrders.map(o => o.store_id))];

        const [stores, itemRows] = await Promise.all([
            Store.findAll({
                where: { id: storeIds },
                attributes: ['id', 'name', 'address', 'latitude', 'longitude'],
            }),
            OrderItem.findAll({
                where: { order_id: { [Op.in]: orderIds }, status: 'available' },
            }),
        ]);

        const storeMap: Record<number, InstanceType<typeof Store>> =
            Object.fromEntries(stores.map(s => [s.id, s]));
        const itemsByOrder: Record<number, any[]> = {};
        for (const item of itemRows) {
            (itemsByOrder[item.order_id] ??= []).push(item.toJSON());
        }

        const available = [];
        for (const order of validReadyOrders) {
            const store = storeMap[order.store_id];
            if (!store) continue;

            const dist = haversineDistance(lat, lng, store.latitude, store.longitude);
            if (dist <= 500) {
                available.push({
                    ...order.toJSON(),
                    store_name: store.name,
                    store_address: store.address,
                    store_lat: store.latitude,
                    store_lng: store.longitude,
                    items: itemsByOrder[order.id] ?? [],
                    delivery_lat: order.delivery_lat,
                    delivery_lng: order.delivery_lng,
                    distance_km: Math.round(dist * 100) / 100
                });
            }
        }

        // Grouping logic for available orders
        const groupedMap: Record<string, any> = {};
        const singles: any[] = [];

        available.forEach(order => {
            if (order.group_id) {
                if (!groupedMap[order.group_id]) {
                    groupedMap[order.group_id] = {
                        is_group: true,
                        group_id: order.group_id,
                        delivery_address: order.delivery_address,
                        delivery_lat: order.delivery_lat,
                        delivery_lng: order.delivery_lng,
                        distance_km: order.distance_km,
                        created_at: order.created_at,
                        orders: []
                    };
                }
                groupedMap[order.group_id].orders.push(order);
            } else {
                singles.push({ ...order, is_group: false });
            }
        });

        const result = [...singles, ...Object.values(groupedMap)];
        result.sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0));
        res.json(result);
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

// GET /api/v1/grocery/driver/status
router.get('/driver/status', async (req: AuthRequest, res: Response) => {
    try {
        res.json({ is_available: req.user.is_available });
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

// PUT /api/v1/grocery/driver/status
router.put('/driver/status', async (req: AuthRequest, res: Response) => {
    try {
        const { is_available } = req.body;
        await req.user.update({ is_available });
        res.json({ message: 'Status updated', is_available: req.user.is_available });
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

// GET /api/v1/grocery/driver/my-deliveries
router.get('/driver/my-deliveries', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.id;

        // Eager-load items to eliminate the N+1 OrderItem query per delivery
        const deliveries = await Order.findAll({
            where: {
                driver_id: userId,
                status: { [Op.notIn]: ['unavailable', 'cancelled'] }
            },
            order: [['created_at', 'DESC']],
            include: [
                { model: OrderItem, as: 'items', where: { status: 'available' }, required: false },
            ],
        });

        // Batch-fetch all stores and customers in two queries instead of 2 per row
        const storeIds  = [...new Set(deliveries.map(o => o.store_id))];
        const userIds   = [...new Set(deliveries.map(o => o.user_id))];

        const [stores, customers] = await Promise.all([
            storeIds.length  ? Store.findAll({ where: { id: storeIds },  attributes: ['id', 'name', 'latitude', 'longitude'] }) : [],
            userIds.length   ? User.findAll({  where: { id: userIds  },  attributes: ['id', 'name', 'phone'] }) : [],
        ]);

        const storeMap:    Record<number, InstanceType<typeof Store>> = Object.fromEntries(stores.map(s => [s.id, s]));
        const customerMap: Record<string, InstanceType<typeof User>>  = Object.fromEntries(customers.map(c => [c.id, c]));

        const result = deliveries.map(o => {
            const store    = storeMap[o.store_id];
            const customer = customerMap[o.user_id];
            return {
                id: o.id,
                store_name: store?.name ?? 'Unknown',
                status: o.status,
                delivery_fee: o.delivery_fee,
                delivery_address: o.delivery_address,
                delivery_lat: o.delivery_lat,
                delivery_lng: o.delivery_lng,
                customer_name: customer?.name || 'Unknown User',
                customer_phone: customer?.phone || 'N/A',
                store_lat: store?.latitude,
                store_lng: store?.longitude,
                notes: (o as any).notes || null,
                group_id: o.group_id,
                items: ((o as any).items ?? []).map((i: any) => i.toJSON()),
                created_at: o.created_at
            };
        });

        // Grouping logic for driver's current deliveries
        const activeGroups: Record<string, any> = {};
        const individualDeliveries: any[] = [];

        result.forEach(d => {
            if (d.group_id) {
                if (!activeGroups[d.group_id]) {
                    activeGroups[d.group_id] = {
                        is_group: true,
                        group_id: d.group_id,
                        status: d.status,
                        delivery_address: d.delivery_address,
                        delivery_lat: d.delivery_lat,
                        delivery_lng: d.delivery_lng,
                        customer_name: d.customer_name,
                        customer_phone: d.customer_phone,
                        notes: d.notes,
                        created_at: d.created_at,
                        orders: []
                    };
                }
                activeGroups[d.group_id].orders.push(d);
            } else {
                individualDeliveries.push({ ...d, is_group: false });
            }
        });

        const finalDeliveries = [...individualDeliveries, ...Object.values(activeGroups)];

        const total_earnings = deliveries.reduce((sum, o) => sum + (o.status === 'delivered' ? o.delivery_fee : 0), 0);
        const total_deliveries = deliveries.filter(o => o.status === 'delivered').length;

        res.json({
            deliveries: finalDeliveries,
            total_earnings: Math.round(total_earnings * 100) / 100,
            total_deliveries
        });
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

router.post('/driver/accept-order/:id', async (req: AuthRequest, res: Response) => {
    try {
        const orderId = parseInt(req.params.id as string);

        // Check the order exists and is in a take-able state before attempting assignment
        const order = await Order.findOne({ where: { id: orderId, status: 'ready' } });
        if (!order) return res.status(404).json({ detail: 'Order not available' });

        // Early conflict check: if already taken, return a clear 409 immediately
        if (order.driver_id !== null) {
            return res.status(409).json({ detail: 'This order has already been taken by another driver.' });
        }

        const now = new Date();

        if (order.group_id) {
            // Atomically claim all unassigned ready orders in the group in one UPDATE statement
            const [affectedCount] = await Order.update(
                { driver_id: req.user.id, updated_at: now },
                { where: { group_id: order.group_id, status: 'ready', driver_id: null } }
            );

            if (affectedCount === 0) {
                return res.status(409).json({ detail: 'This grouped order has already been taken by another driver.' });
            }

            // Notify customers – re-fetch only the orders we just claimed
            const claimedOrders = await Order.findAll({
                where: { group_id: order.group_id, driver_id: req.user.id }
            });
            for (const go of claimedOrders) {
                await createNotification(go.user_id, '🚗 Driver Assigned', `A driver is heading to the stores to pick up your grouped order items!`, 'order_status', go.id);
            }
            return res.json({ message: `Grouped order accepted (${affectedCount} items)` });
        } else {
            // Atomic single-order assignment: only succeeds if driver_id is still NULL
            const [affected] = await Order.update(
                { driver_id: req.user.id, updated_at: now },
                { where: { id: orderId, status: 'ready', driver_id: null } }
            );

            if (affected === 0) {
                return res.status(409).json({ detail: 'This order has already been taken by another driver.' });
            }

            await createNotification(order.user_id, '🚗 Driver Assigned', `A driver is heading to the store to pick up your order #${orderId}!`, 'order_status', orderId);
            return res.json({ message: 'Order accepted' });
        }
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

router.put('/driver/orders/:id/status', async (req: AuthRequest, res: Response) => {
    try {
        const orderId = parseInt(req.params.id as string);
        const { status, reason } = req.body;
        const driverId = req.user.id;

        const order = await Order.findOne({ where: { id: orderId, driver_id: driverId } });
        if (!order) return res.status(404).json({ detail: 'Order not found for this driver' });

        // valid statuses for driver flow: picked_up -> delivering -> delivered -> (or returned)
        const validStatuses = ['picked_up', 'delivering', 'delivered', 'returned'];
        if (!validStatuses.includes(status)) return res.status(400).json({ detail: 'Invalid status update for driver' });

        const now = new Date();
        const updateData: any = { status, updated_at: now };
        if (status === 'returned' && reason) {
            updateData.issue_details = `Return Reason: ${reason}`;
        }

        if (order.group_id && status !== 'picked_up') { // picked_up is strictly individual for grouped orders
            const groupOrders = await Order.findAll({ where: { group_id: order.group_id, driver_id: driverId } });

            // Validation: Delivery transition requires all orders individually picked up
            if (status === 'delivering') {
                const notPickedUp = groupOrders.filter(o => o.status !== 'picked_up');
                if (notPickedUp.length > 0) {
                    return res.status(400).json({ detail: 'You must pick up all items from all stores before marking the group as On the Way.' });
                }
            }

            // Bulk-update all orders in the group — single UPDATE ... WHERE id IN (...)
            await Order.update(updateData, { where: { id: groupOrders.map(o => o.id) } });

            // Batch notifications for all group members
            let groupNotificationTitle = '';
            let groupNotificationBody = '';
            let groupNotificationType = '';
            if (status === 'returned') {
                groupNotificationTitle = '❌ Order Returned';
                groupNotificationBody = `Your order was returned by the driver. Reason: ${reason}. Support will contact you.`;
                groupNotificationType = 'order_returned';
            } else if (status === 'delivered') {
                groupNotificationTitle = '✅ Order Delivered!';
                groupNotificationBody = `Your grouped order items have been delivered!`;
                groupNotificationType = 'order_status';
            } else if (status === 'delivering') {
                groupNotificationTitle = '📍 Delivery In Progress';
                groupNotificationBody = `Driver is approaching with your grouped order!`;
                groupNotificationType = 'order_status';
            }
            if (groupNotificationType) {
                await bulkCreateNotifications(
                    groupOrders.map(go => ({
                        user_id: go.user_id,
                        title: groupNotificationTitle,
                        body: groupNotificationBody,
                        type: groupNotificationType,
                        order_id: go.id,
                    }))
                );
            }

            if (status === 'returned') {
                // Restore stock for all orders in the group
                for (const go of groupOrders) {
                    const groupItems = await OrderItem.findAll({ where: { order_id: go.id } });
                    for (const item of groupItems) {
                        await StoreProduct.increment('stock_quantity', {
                            by: item.quantity,
                            where: { store_id: go.store_id, product_id: item.product_id, stock_quantity: { [Op.ne]: null } }
                        });
                    }
                }

                const admins = await User.findAll({ where: { role: 'admin' }, attributes: ['id'] });
                await bulkCreateNotifications(
                    admins.map(admin => ({
                        user_id: admin.id,
                        title: '⚠️ Order Returned by Driver',
                        body: `Driver ${req.user.name} returned grouped order ${order.group_id}. Reason: ${reason}. Please review.`,
                        type: 'order_returned_admin',
                        order_id: order.id,
                    }))
                );
            }

            return res.json({ message: `Status updated to ${status} for the group` });
        } else {
            // Individual update (singles, or a specific picked_up event within a group)
            await order.update(updateData);

            if (status === 'returned') {
                // Restore stock for single order
                const singleItems = await OrderItem.findAll({ where: { order_id: orderId } });
                for (const item of singleItems) {
                    await StoreProduct.increment('stock_quantity', {
                        by: item.quantity,
                        where: { store_id: order.store_id, product_id: item.product_id, stock_quantity: { [Op.ne]: null } }
                    });
                }

                await createNotification(order.user_id, '❌ Order Returned', `Your order #${orderId} was returned by the driver. Reason: ${reason}. Support will contact you.`, 'order_returned', orderId);
                const admins = await User.findAll({ where: { role: 'admin' }, attributes: ['id'] });
                await bulkCreateNotifications(
                    admins.map(admin => ({
                        user_id: admin.id,
                        title: '⚠️ Order Returned by Driver',
                        body: `Driver ${req.user.name} returned order #${orderId}. Reason: ${reason}. Please review.`,
                        type: 'order_returned_admin',
                        order_id: orderId,
                    }))
                );
            } else if (status === 'delivered') {
                await createNotification(order.user_id, '✅ Order Delivered!', `Your order #${orderId} has been delivered!`, 'order_status', orderId);
            } else if (status === 'delivering') {
                await createNotification(order.user_id, '📍 Delivery In Progress', `Your driver is now approaching your address with your order!`, 'order_status', orderId);
            } else if (status === 'picked_up') {
                await createNotification(order.user_id, '🛍️ Order Picked Up!', `Your order #${orderId} has been picked up from the store!`, 'order_status', orderId);
            }
            return res.json({ message: `Status updated to ${status}` });
        }
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

export default router;
