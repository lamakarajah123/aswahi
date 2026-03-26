import { Router, Response } from 'express';
import { authenticateJWT, AuthRequest } from '../../middlewares/auth.middleware';
import { Notification } from '../../models';

const router = Router();
router.use(authenticateJWT);

// GET /api/v1/grocery/notifications/unread-count
router.get('/notifications/unread-count', async (req: AuthRequest, res: Response) => {
    try {
        const count = await Notification.count({
            where: { user_id: req.user.id, is_read: false },
        });
        res.json({ unread_count: count });
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

// GET /api/v1/grocery/notifications/recent
router.get('/notifications/recent', async (req: AuthRequest, res: Response) => {
    try {
        const limit = parseInt((req.query.limit as string) || '20');
        const notifs = await Notification.findAll({
            where: { user_id: req.user.id },
            order: [['created_at', 'DESC']],
            limit,
        });
        res.json(notifs.map((n: any) => n.dataValues));
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

// PUT /api/v1/grocery/notifications/mark-all-read
router.put('/notifications/mark-all-read', async (req: AuthRequest, res: Response) => {
    try {
        await Notification.update(
            { is_read: true } as any,
            { where: { user_id: req.user.id, is_read: false } }
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

// PUT /api/v1/grocery/notifications/:id/read
router.put('/notifications/:id/read', async (req: AuthRequest, res: Response) => {
    try {
        const notif = await Notification.findOne({
            where: { id: parseInt(req.params.id as string), user_id: req.user.id },
        });
        if (!notif) return res.status(404).json({ detail: 'Notification not found' });
        await notif.update({ is_read: true } as any);
        res.json({ message: 'Notification marked as read' });
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

export default router;
