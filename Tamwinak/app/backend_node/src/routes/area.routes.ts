import { Router, Response } from 'express';
import { authenticateJWT, AuthRequest } from '../middlewares/auth.middleware';
import { DeliveryArea } from '../models';
import { z } from 'zod';
import { Op } from 'sequelize';

const router = Router();

const AreaSchema = z.object({
    store_id: z.number().int().positive().nullable().optional(),
    area_type: z.enum(['A', 'B', 'C']).nullable().optional(),
    delivery_fee: z.number().min(0).optional().default(0),
    name: z.string().min(1),
    name_ar: z.string().nullable().optional(),
    boundaries: z.object({
        type: z.literal('Polygon'),
        coordinates: z.array(z.array(z.array(z.number()))),
    }),
    color: z.string().max(20).optional().default('#3B82F6'),
    is_active: z.boolean().optional().default(true),
});


// GET /api/v1/areas
router.get('/', async (_req: AuthRequest, res: Response) => {
    try {
        const areas = await DeliveryArea.findAll({
            order: [['name', 'ASC']],
        });
        res.json(areas);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

// GET /api/v1/areas/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const area = await DeliveryArea.findByPk(parseInt(req.params.id as string));
        if (!area) return res.status(404).json({ detail: 'Area not found' });
        res.json(area);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

// POST /api/v1/areas
router.post('/', authenticateJWT, async (req: AuthRequest, res: Response) => {
    try {
        if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
            return res.status(403).json({ detail: 'Only admins can create areas' });
        }
        const data = AreaSchema.parse(req.body);
        if (data.store_id && data.area_type) {
            const existingZone = await DeliveryArea.findOne({ where: { store_id: data.store_id, area_type: data.area_type } });
            if (existingZone) return res.status(409).json({ detail: `Zone ${data.area_type} already exists for this store.` });
        }
        const now = new Date();
        const area = await DeliveryArea.create({ ...data, created_at: now, updated_at: now } as any);
        res.status(201).json(area);
    } catch (error: any) {
        if (error.errors) return res.status(400).json({ detail: error.errors });
        res.status(500).json({ detail: error.message });
    }
});

// PUT /api/v1/areas/:id
router.put('/:id', authenticateJWT, async (req: AuthRequest, res: Response) => {
    try {
        if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
            return res.status(403).json({ detail: 'Only admins can update areas' });
        }
        const area = await DeliveryArea.findByPk(parseInt(req.params.id as string));
        if (!area) return res.status(404).json({ detail: 'Area not found' });
        const data = AreaSchema.partial().parse(req.body);

        if (data.store_id && data.area_type) {
            const existingZone = await DeliveryArea.findOne({ 
                where: { 
                    store_id: data.store_id, 
                    area_type: data.area_type,
                    id: { [Op.ne]: area.id }
                } 
            });
            if (existingZone) return res.status(409).json({ detail: `Zone ${data.area_type} already exists for this store.` });
        }
        
        await area.update({ ...data, updated_at: new Date() } as any);

        res.json(area);
    } catch (error: any) {
        if (error.errors) return res.status(400).json({ detail: error.errors });
        res.status(500).json({ detail: error.message });
    }
});

// DELETE /api/v1/areas/:id
router.delete('/:id', authenticateJWT, async (req: AuthRequest, res: Response) => {
    try {
        if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
            return res.status(403).json({ detail: 'Only admins can delete areas' });
        }
        const area = await DeliveryArea.findByPk(parseInt(req.params.id as string));
        if (!area) return res.status(404).json({ detail: 'Area not found' });
        await area.destroy();
        res.json({ message: 'Area deleted', id: req.params.id });
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

export default router;
