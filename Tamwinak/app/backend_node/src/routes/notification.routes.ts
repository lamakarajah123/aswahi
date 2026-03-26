import { Router, Response } from 'express';
import { authenticateJWT, AuthRequest } from '../middlewares/auth.middleware';
import { Notification } from '../models';

const router = Router();

router.use(authenticateJWT);

// GET /api/v1/entities/notifications
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit as string || '50');
        const skip = parseInt(req.query.skip as string || '0');

        const { count, rows } = await Notification.findAndCountAll({
            where: { user_id: userId },
            order: [['id', 'DESC']],
            limit,
            offset: skip,
        });

        res.json({ items: rows, total: count, limit, skip });
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

export default router;
