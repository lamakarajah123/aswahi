import { Router, Request, Response } from 'express';
import { OrderService } from '../services/order.service';
import { OrderDataSchema, OrderUpdateDataSchema } from '../validators/order.validator';

import { authenticateJWT, AuthRequest } from '../middlewares/auth.middleware';

const router = Router();
const service = new OrderService();

router.use(authenticateJWT);

// GET /api/v1/entities/orders
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const skip = parseInt(req.query.skip as string || '0');
        const limit = parseInt(req.query.limit as string || '20');
        const userId = req.user.id;
        const storeId = req.query.store_id ? parseInt(req.query.store_id as string) : undefined;
        const groupId = req.query.group_id as string | undefined;

        const result = await service.getList(skip, limit, userId, storeId, groupId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

// GET /api/v1/entities/orders/group/:groupId
router.get('/group/:groupId', async (req: AuthRequest, res: Response) => {
    try {
        const groupId = req.params.groupId as string;
        const userId = req.user.id;

        const orders = await service.getByGroupId(groupId, userId);
        if (!orders || orders.length === 0) {
            return res.status(404).json({ detail: 'No orders found for this group' });
        }

        res.json({
            group_id: groupId,
            total_stores: orders.length,
            orders,
        });
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

// GET /api/v1/entities/orders/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const id = parseInt(req.params.id as string);
        const userId = req.user.id;

        const result = await service.getById(id, userId);
        if (!result) return res.status(404).json({ detail: 'Order not found' });

        res.json(result);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

// POST /api/v1/entities/orders
router.post('/', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.id;
        const validatedData = OrderDataSchema.parse(req.body);

        const result = await service.create(validatedData, userId);
        res.status(201).json(result);
    } catch (error: any) {
        // Smart distribution: unfulfillable items
        if (error.statusCode === 422) {
            return res.status(422).json({
                detail: error.message,
                unfulfillableItems: error.unfulfillableItems || [],
            });
        }
        if (error.errors) {
            return res.status(400).json({ detail: error.errors });
        }
        res.status(500).json({ detail: error.message });
    }
});

// PUT /api/v1/entities/orders/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const id = parseInt(req.params.id as string);
        const userId = req.user.id;

        const validatedData = OrderUpdateDataSchema.parse(req.body);
        const result = await service.update(id, validatedData, userId);

        if (!result) return res.status(404).json({ detail: 'Order not found' });

        res.json(result);
    } catch (error: any) {
        if (error.errors) {
            return res.status(400).json({ detail: error.errors });
        }
        res.status(500).json({ detail: error.message });
    }
});

// DELETE /api/v1/entities/orders/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const id = parseInt(req.params.id as string);
        const userId = req.user.id;

        const success = await service.delete(id, userId);
        if (!success) return res.status(404).json({ detail: 'Order not found' });

        res.json({ message: 'Order deleted successfully', id });
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

export default router;
