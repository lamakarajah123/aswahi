import { Router, Response } from 'express';
import { authenticateJWT, AuthRequest } from '../middlewares/auth.middleware';
import { Industry } from '../models';
import { z } from 'zod';

const router = Router();
router.use(authenticateJWT);

const IndustrySchema = z.object({
    name: z.string().min(1),
    name_ar: z.string().nullable().optional(),
    icon: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    is_active: z.boolean().optional().default(true),
});

// GET /api/v1/industries
router.get('/', async (_req: AuthRequest, res: Response) => {
    try {
        const industries = await Industry.findAll({ order: [['id', 'ASC']] });
        res.json(industries);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

// GET /api/v1/industries/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const industry = await Industry.findByPk(parseInt(req.params.id as string));
        if (!industry) return res.status(404).json({ detail: 'Industry not found' });
        res.json(industry);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

// POST /api/v1/industries
router.post('/', async (req: AuthRequest, res: Response) => {
    try {
        if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
            return res.status(403).json({ detail: 'Only admins can add industries' });
        }
        const data = IndustrySchema.parse(req.body);
        const industry = await Industry.create({ ...data, created_at: new Date() });
        res.status(201).json(industry);
    } catch (error: any) {
        if (error.errors) return res.status(400).json({ detail: error.errors });
        res.status(500).json({ detail: error.message });
    }
});

// PUT /api/v1/industries/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
    try {
        if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
            return res.status(403).json({ detail: 'Only admins can update industries' });
        }
        const industry = await Industry.findByPk(parseInt(req.params.id as string));
        if (!industry) return res.status(404).json({ detail: 'Industry not found' });
        const data = IndustrySchema.partial().parse(req.body);
        await industry.update(data);
        res.json(industry);
    } catch (error: any) {
        if (error.errors) return res.status(400).json({ detail: error.errors });
        res.status(500).json({ detail: error.message });
    }
});

// DELETE /api/v1/industries/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
    try {
        if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
            return res.status(403).json({ detail: 'Only admins can delete industries' });
        }
        const industry = await Industry.findByPk(parseInt(req.params.id as string));
        if (!industry) return res.status(404).json({ detail: 'Industry not found' });
        await industry.destroy();
        res.json({ message: 'Industry deleted', id: req.params.id });
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

export default router;
