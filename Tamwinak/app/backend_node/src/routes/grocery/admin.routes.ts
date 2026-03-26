import { Router, Response } from 'express';
import { QueryTypes } from 'sequelize';
import { authenticateJWT, AuthRequest } from '../../middlewares/auth.middleware';
import { Store, Order, OrderItem, AppSetting, User, Industry, StoreIndustry, StoreGroup } from '../../models';
import { sequelize } from '../../config/database';
import { AuthService } from '../../services/auth.service';
import { EmailService } from '../../services/email.service';

const router = Router();
const authService = new AuthService();
const emailService = new EmailService();
router.use(authenticateJWT);

// GET /api/v1/grocery/admin/analytics
router.get('/admin/analytics', async (req: AuthRequest, res: Response) => {
    try {
        // Single aggregate query replaces two full-table Order.findAll() calls
        const [revenueStats] = await sequelize.query<{ total_revenue: string; gross_order_value: string }>(
            `SELECT
                COALESCE(SUM(CASE WHEN status = 'delivered' THEN total ELSE 0 END), 0) AS total_revenue,
                COALESCE(SUM(total), 0) AS gross_order_value
             FROM orders`,
            { type: QueryTypes.SELECT }
        );
        const total_revenue = revenueStats ? parseFloat(revenueStats.total_revenue) : 0;
        const gross_order_value = revenueStats ? parseFloat(revenueStats.gross_order_value) : 0;

        const [total_orders, total_stores, pending_approvals, active_drivers] = await Promise.all([
            Order.count(),
            Store.count(),
            Store.count({ where: { is_approved: false } }),
            User.count({ where: { role: 'driver', status: 'active' } }),
        ]);

        const orders_by_status_rows = await Order.findAll({ attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']], group: ['status'] });
        const orders_by_status: Record<string, number> = {};
        orders_by_status_rows.forEach((r: any) => { orders_by_status[r.status] = parseInt(r.dataValues.count); });

        // Batch-fetch stores — eliminates the N+1 (was 1 query per recent order)
        const recent_orders_rows = await Order.findAll({ order: [['created_at', 'DESC']], limit: 10 });
        const storeIds = [...new Set(recent_orders_rows.map(o => o.store_id))];
        const stores = storeIds.length
            ? await Store.findAll({ where: { id: storeIds }, attributes: ['id', 'name'] })
            : [];
        const storeMap: Record<number, string> = Object.fromEntries(stores.map(s => [s.id, s.name]));
        const recent_orders = recent_orders_rows.map(o => ({
            ...o.toJSON(),
            store_name: storeMap[o.store_id] ?? 'Unknown',
        }));

        res.json({
            total_orders: Number(total_orders) || 0,
            total_revenue: Math.round((Number(revenueStats?.total_revenue) || 0) * 100) / 100,
            gross_order_value: Math.round((Number(revenueStats?.gross_order_value) || 0) * 100) / 100,
            total_stores: Number(total_stores) || 0,
            pending_approvals: Number(pending_approvals) || 0,
            active_drivers: Number(active_drivers) || 0,
            orders_by_status,
            recent_orders
        });
    } catch (e: any) {
        console.error('[ADMIN_ANALYTICS_ERR]', e);
        res.status(500).json({ detail: e.message });
    }
});

// POST /api/v1/grocery/admin/test-email
router.post('/admin/test-email', async (req: AuthRequest, res: Response) => {
    try {
        const { to } = req.body;
        await emailService.sendStoreWelcomeEmail(to || 'test@example.com', 'Test Owner', 'Test Store', 'test-password-123');
        res.json({ message: 'Test email sent successfully' });
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

// GET /api/v1/grocery/admin/orders
router.get('/admin/orders', async (req: AuthRequest, res: Response) => {
    try {
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
        const offset = parseInt(req.query.offset as string) || 0;

        const { count, rows: orders } = await Order.findAndCountAll({
            order: [['created_at', 'DESC']],
            limit,
            offset,
            distinct: true
        });

        const orderIds = orders.map(o => o.id);
        const items = orderIds.length 
            ? await OrderItem.findAll({ where: { order_id: orderIds } })
            : [];

        const storeIds = [...new Set(orders.map(o => o.store_id))];
        const stores = storeIds.length 
            ? await Store.findAll({ where: { id: storeIds }, attributes: ['id', 'name'] })
            : [];
        
        const storeMap: Record<number, string> = Object.fromEntries(stores.map(s => [s.id, s.name]));

        res.json({
            items: orders.map(o => {
                const orderData = o.get({ plain: true });
                return { 
                    ...orderData, 
                    store_name: storeMap[o.store_id] ?? 'Unknown',
                    items: items.filter(item => item.order_id === o.id).map(i => i.get({ plain: true }))
                };
            }),
            total: count,
            limit,
            offset,
        });
    } catch (e: any) {
        console.error('[ADMIN_ORDERS_ROUTE_ERR]', e);
        res.status(500).json({ detail: "V5-Safe: " + e.message });
    }
});

// GET /api/v1/grocery/admin/settings
router.get('/admin/settings', async (req: AuthRequest, res: Response) => {
    try {
        const settings = await AppSetting.findAll();
        res.json(settings.map((s: any) => ({ id: s.dataValues.id, key: s.dataValues.key, value: s.dataValues.value, description: s.dataValues.description })));
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

// PUT /api/v1/grocery/admin/settings/:id
router.put('/admin/settings/:id', async (req: AuthRequest, res: Response) => {
    try {
        const setting = await AppSetting.findByPk(String(req.params.id));
        if (!setting) return res.status(404).json({ detail: 'Setting not found' });
        await setting.update({ value: req.body.value } as any);
        res.json({ message: 'Setting updated' });
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

// GET /api/v1/grocery/admin/stores
router.get('/admin/stores', async (req: AuthRequest, res: Response) => {
    try {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
        const offset = (page - 1) * limit;

        const { count, rows: stores } = await Store.findAndCountAll({ limit, offset, order: [['created_at', 'DESC']] });
        const userIds = stores.map(s => s.user_id);
        const users = userIds.length > 0
            ? await User.findAll({ where: { id: userIds }, attributes: ['id', 'email', 'name'] })
            : [];
        const storeIds = stores.map(s => s.id);
        const allOrders = storeIds.length > 0
            ? await Order.findAll({ where: { store_id: storeIds }, order: [['created_at', 'DESC']], limit: 100 })
            : [];

        const data = stores.map(s => {
            const owner = users.find(u => u.id === s.user_id);
            return {
                ...s.toJSON(),
                owner_email: owner?.email,
                owner_name: owner?.name,
                orders: allOrders.filter(o => o.store_id === s.id).map(o => o.toJSON())
            };
        });

        res.json({ data, total: count, page, totalPages: Math.ceil(count / limit), limit });
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

// POST /api/v1/grocery/admin/stores/with-owner
router.post('/admin/stores/with-owner', async (req: AuthRequest, res: Response) => {
    const { email, password, owner_name, store_name, description, address, phone, image_url, latitude, longitude } = req.body;

    if (!email || !password || !store_name || !address) {
        return res.status(400).json({ detail: 'Email, password, store name, and address are required' });
    }

    const t = await sequelize.transaction();
    try {
        // 1. Create User (inside transaction)
        const signupResult = await authService.signupWithPassword({
            email,
            password,
            name: owner_name || store_name,
            role: 'store_owner',
            phone,
            address,
            transaction: t,
        });

        const userId = signupResult.user.id;

        // 2. Create Store (inside same transaction — rolls back user if this fails)
        const store = await Store.create({
            user_id: userId,
            name: store_name,
            description: description || null,
            address: address,
            phone: phone || null,
            image_url: image_url || null,
            latitude: parseFloat(latitude) || 32.2211,
            longitude: parseFloat(longitude) || 35.2544,
            is_approved: true, // admin auto-approves
            is_active: true,
            rating: 0,
            total_ratings: 0,
            working_hours: req.body.working_hours || '00:00-23:59'
        } as any, { transaction: t });

        await t.commit();

        // 3. Send Welcome Email (after commit — fire-and-forget, non-critical)
        emailService.sendStoreWelcomeEmail(email, owner_name || store_name, store_name, password).catch((mailErr) => {
            console.error('Failed to send welcome email:', mailErr);
        });

        res.status(201).json({ message: 'Store and owner created successfully', store: store.toJSON() });
    } catch (e: any) {
        await t.rollback();
        res.status(500).json({ detail: e.message });
    }
});

// GET /api/v1/grocery/admin/stores/:id/industries
router.get('/admin/stores/:id/industries', async (req: AuthRequest, res: Response) => {
    try {
        const store = await Store.findByPk(String(req.params.id), {
            include: [{ model: Industry, as: 'industries', through: { attributes: [] } }],
            attributes: ['id'],
        });
        if (!store) return res.status(404).json({ detail: 'Store not found' });
        res.json((store as any).industries ?? []);
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

// PUT /api/v1/grocery/admin/stores/:id/industries  (replace all)
router.put('/admin/stores/:id/industries', async (req: AuthRequest, res: Response) => {
    try {
        if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
            return res.status(403).json({ detail: 'Admin access required' });
        }
        const storeId = parseInt(req.params.id as string);
        const { industry_ids }: { industry_ids: number[] } = req.body;

        if (!Array.isArray(industry_ids)) {
            return res.status(400).json({ detail: 'industry_ids must be an array' });
        }

        // Replace existing associations atomically
        const t = await sequelize.transaction();
        try {
            await StoreIndustry.destroy({ where: { store_id: storeId }, transaction: t });
            if (industry_ids.length > 0) {
                await StoreIndustry.bulkCreate(
                    industry_ids.map(iid => ({ store_id: storeId, industry_id: iid })),
                    { transaction: t }
                );
            }
            await t.commit();
            res.json({ message: 'Store industries updated', industry_ids });
        } catch (e: any) {
            await t.rollback();
            res.status(500).json({ detail: e.message });
        }
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

// PUT /api/v1/grocery/admin/stores/:id  (full store update by admin)
router.put('/admin/stores/:id', async (req: AuthRequest, res: Response) => {
    try {
        if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
            return res.status(403).json({ detail: 'Admin access required' });
        }
        const store = await Store.findByPk(String(req.params.id));
        if (!store) return res.status(404).json({ detail: 'Store not found' });

        const { 
            name, description, address, phone, image_url, latitude, longitude, 
            is_approved, is_active, working_hours, group_id 
        } = req.body;

        await store.update({
            ...(name !== undefined && { name }),
            ...(description !== undefined && { description: description || null }),
            ...(address !== undefined && { address }),
            ...(phone !== undefined && { phone: phone || null }),
            ...(image_url !== undefined && { image_url: image_url || null }),
            ...(latitude !== undefined && { latitude: parseFloat(latitude) }),
            ...(longitude !== undefined && { longitude: parseFloat(longitude) }),
            ...(is_approved !== undefined && { is_approved }),
            ...(is_active !== undefined && { is_active }),
            ...(working_hours !== undefined && { working_hours }),
            ...(group_id !== undefined && { group_id: group_id ? parseInt(group_id) : null })
        } as any);

        res.json({ message: 'Store updated successfully', store: store.toJSON() });
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

// PUT /api/v1/grocery/admin/stores/:id/approve

router.put('/admin/stores/:id/approve', async (req: AuthRequest, res: Response) => {
    try {
        const store = await Store.findByPk(String(req.params.id));
        if (!store) return res.status(404).json({ detail: 'Store not found' });
        await store.update({ is_approved: true } as any);
        res.json({ message: 'Store approved' });
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

// PUT /api/v1/grocery/admin/stores/:id/reject
router.put('/admin/stores/:id/reject', async (req: AuthRequest, res: Response) => {
    try {
        const store = await Store.findByPk(String(req.params.id));
        if (!store) return res.status(404).json({ detail: 'Store not found' });
        await store.update({ is_approved: false, is_active: false } as any);
        res.json({ message: 'Store rejected' });
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

// PUT /api/v1/grocery/admin/stores/:id/archive
router.put('/admin/stores/:id/archive', async (req: AuthRequest, res: Response) => {
    try {
        const store = await Store.findByPk(String(req.params.id));
        if (!store) return res.status(404).json({ detail: 'Store not found' });

        await store.update({ is_active: false } as any);

        // Let's also archive the store owner user.
        const user = await User.findByPk(store.user_id, { attributes: ['id'] });
        if (user) {
            await user.update({ status: 'archived' } as any);
        }

        res.json({ message: 'Store and owner archived' });
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

// PUT /api/v1/grocery/admin/stores/:id/unarchive
router.put('/admin/stores/:id/unarchive', async (req: AuthRequest, res: Response) => {
    try {
        const store = await Store.findByPk(String(req.params.id));
        if (!store) return res.status(404).json({ detail: 'Store not found' });

        await store.update({ is_active: true } as any);

        // Let's also unarchive the store owner user.
        const user = await User.findByPk(store.user_id, { attributes: ['id', 'status'] });
        if (user && user.getDataValue('status') === 'archived') {
            await user.update({ status: 'active' } as any);
        }

        res.json({ message: 'Store and owner unarchived' });
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

// PUT /api/v1/grocery/admin/stores/:id/toggle-price-management
router.put('/admin/stores/:id/toggle-price-management', async (req: AuthRequest, res: Response) => {
    try {
        const store = await Store.findByPk(String(req.params.id));
        if (!store) return res.status(404).json({ detail: 'Store not found' });
        
        await store.update({ can_manage_prices: !store.can_manage_prices } as any);
        res.json({ message: 'Price management toggled', can_manage_prices: store.can_manage_prices });
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

// --- Store Groups Management ---

router.get('/admin/store-groups', async (req: AuthRequest, res: Response) => {
    try {
        const groups = await StoreGroup.findAll({ 
            order: [['id', 'DESC']],
            include: [{ model: Store, as: 'stores', attributes: ['id', 'name'] }]
        });
        res.json(groups);
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

router.post('/admin/store-groups', async (req: AuthRequest, res: Response) => {
    const t = await sequelize.transaction();
    try {
        const { name, delivery_fee, is_active, store_ids } = req.body;
        const group = await StoreGroup.create({ 
            name, 
            delivery_fee: parseFloat(delivery_fee), 
            is_active: is_active ?? true 
        } as any, { transaction: t });
        
        if (Array.isArray(store_ids) && store_ids.length > 0) {
            const numericIds = store_ids.map(id => parseInt(String(id))).filter(id => !isNaN(id));
            if (numericIds.length > 0) {
                await Store.update({ group_id: group.id } as any, { 
                    where: { id: numericIds },
                    transaction: t
                });
            }
        }
        
        await t.commit();
        const freshGroup = await StoreGroup.findByPk(group.id, { 
            include: [{ model: Store, as: 'stores', attributes: ['id', 'name'] }] 
        });
        res.json(freshGroup);
    } catch (e: any) {
        await t.rollback();
        res.status(500).json({ detail: e.message });
    }
});

router.put('/admin/store-groups/:id', async (req: AuthRequest, res: Response) => {
    const trx = await sequelize.transaction();
    try {
        const group = await StoreGroup.findByPk(String(req.params.id));
        if (!group) {
            await trx.rollback();
            return res.status(404).json({ detail: 'Group not found' });
        }
        
        const { name, delivery_fee, is_active, store_ids } = req.body;
        await group.update({
            ...(name !== undefined && { name }),
            ...(delivery_fee !== undefined && { delivery_fee: parseFloat(delivery_fee) }),
            ...(is_active !== undefined && { is_active })
        } as any, { transaction: trx });

        if (store_ids !== undefined && Array.isArray(store_ids)) {
            // 1. Clear current associations for THIS group
            await Store.update({ group_id: null } as any, { 
                where: { group_id: group.id },
                transaction: trx
            });
            
            // 2. Assign new ones
            const numericIds = store_ids.map(id => parseInt(String(id))).filter(id => !isNaN(id));
            if (numericIds.length > 0) {
                await Store.update({ group_id: group.id } as any, { 
                    where: { id: numericIds },
                    transaction: trx
                });
            }
        }

        await trx.commit();
        const freshGroup = await StoreGroup.findByPk(group.id, { 
            include: [{ model: Store, as: 'stores', attributes: ['id', 'name'] }] 
        });
        res.json(freshGroup);
    } catch (e: any) {
        await trx.rollback();
        res.status(500).json({ detail: e.message });
    }
});

router.delete('/admin/store-groups/:id', async (req: AuthRequest, res: Response) => {
    try {
        const group = await StoreGroup.findByPk(String(req.params.id));
        if (!group) return res.status(404).json({ detail: 'Group not found' });
        
        // Remove from stores
        await Store.update({ group_id: null } as any, { where: { group_id: group.id } });
        
        await group.destroy();
        res.json({ message: 'Group deleted' });
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

export default router;
