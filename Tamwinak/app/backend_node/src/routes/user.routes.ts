import { Router, Request, Response } from 'express';
import { Op, QueryTypes } from 'sequelize';
import { authenticateJWT, AuthRequest } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/rbac.middleware';
import { User, Order } from '../models';
import { sequelize } from '../config/database';

const router = Router();

// PUT /api/v1/users/:id/approve  — Admin approves a pending user (driver)
router.put('/:id/approve', authenticateJWT, requireRoles(['admin']), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id as string, { attributes: ['id', 'email', 'status'] });

        if (!user) {
            return res.status(404).json({ detail: 'User not found' });
        }

        if (user.status !== 'pending') {
            return res.status(400).json({ detail: 'User is not in pending status' });
        }

        await user.update({ status: 'active' } as any);

        res.json({ message: 'User approved successfully', user: { id: user.id, email: user.email, status: user.status } });
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

// PUT /api/v1/users/:id/reject  — Admin rejects a pending user (driver)
router.put('/:id/reject', authenticateJWT, requireRoles(['admin']), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id as string, { attributes: ['id', 'status'] });

        if (!user) {
            return res.status(404).json({ detail: 'User not found' });
        }

        if (user.status !== 'pending') {
            return res.status(400).json({ detail: 'User is not in pending status' });
        }

        // We can either delete the user or mark them as rejected.
        await user.update({ status: 'rejected' } as any);

        res.json({ message: 'User rejected successfully' });
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

// GET /api/v1/users/pending  — Admin gets pending users
router.get('/pending', authenticateJWT, requireRoles(['admin']), async (req: AuthRequest, res: Response) => {
    try {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
        const offset = (page - 1) * limit;

        const { count, rows: users } = await User.findAndCountAll({
            where: { status: 'pending' },
            attributes: ['id', 'email', 'name', 'role', 'status', 'phone', 'address', 'work_area', 'working_hours', 'vehicle_type'],
            limit,
            offset,
        });
        const data = users.map(u => ({
            id: u.id,
            email: u.email,
            name: u.name,
            role: u.role,
            status: u.status,
            phone: u.phone,
            address: u.address,
            work_area: u.work_area,
            working_hours: u.working_hours,
            vehicle_type: u.vehicle_type
        }));
        res.json({ data, total: count, page, totalPages: Math.ceil(count / limit), limit });
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

// GET /api/v1/users/drivers  — Admin gets approved drivers to keep their info
router.get('/drivers', authenticateJWT, requireRoles(['admin']), async (req: AuthRequest, res: Response) => {
    try {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
        const offset = (page - 1) * limit;

        const users = await User.findAll({
            where: { role: 'driver', status: { [Op.in]: ['active', 'archived'] } },
            limit,
            offset,
            order: [['created_at', 'DESC']]
        });
        const count = await User.count({ where: { role: 'driver', status: { [Op.in]: ['active', 'archived'] } } });

        // Fetch aggregate counts for all drivers in one single query for performance and accuracy
        const stats = await sequelize.query(`
            SELECT 
                TRIM(CAST(driver_id AS TEXT)) as d_id, 
                COUNT(*) as total_count,
                COUNT(*) FILTER (WHERE status ILIKE 'delivered' OR status ILIKE 'تم التوصيل' OR status ILIKE 'completed' OR status ILIKE 'done') as delivered_count
            FROM orders
            WHERE driver_id IS NOT NULL AND driver_id <> ''
            GROUP BY TRIM(CAST(driver_id AS TEXT))
        `, { type: QueryTypes.SELECT }) as any[];

        const statsMap: Record<string, { total: number, delivered: number }> = {};
        stats.forEach(s => {
            statsMap[String(s.d_id).trim()] = {
                total: parseInt(s.total_count || '0'),
                delivered: parseInt(s.delivered_count || '0')
            };
        });

        const data = users.map(u => {
            const userId = String(u.id).trim();
            const driverStats = statsMap[userId] || { total: 0, delivered: 0 };
            return {
                id: u.id,
                email: u.email,
                name: u.name,
                role: u.role,
                status: u.status,
                phone: u.phone,
                address: u.address,
                work_area: u.work_area,
                working_hours: u.working_hours,
                vehicle_type: u.vehicle_type,
                order_count: driverStats.total,
                delivered_count: driverStats.delivered
            };
        });
        res.json({ data, total: count, page, totalPages: Math.ceil(count / limit), limit });
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

// PUT /api/v1/users/:id/archive  — Admin archives a user (driver or any role)
router.put('/:id/archive', authenticateJWT, requireRoles(['admin']), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id as string, { attributes: ['id'] });

        if (!user) {
            return res.status(404).json({ detail: 'User not found' });
        }

        await user.update({ status: 'archived' } as any);

        res.json({ message: 'User archived successfully' });
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

// PUT /api/v1/users/:id/unarchive  — Admin unarchives a user
router.put('/:id/unarchive', authenticateJWT, requireRoles(['admin']), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id as string, { attributes: ['id'] });

        if (!user) {
            return res.status(404).json({ detail: 'User not found' });
        }

        await user.update({ status: 'active' } as any);

        res.json({ message: 'User unarchived successfully' });
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

export default router;
