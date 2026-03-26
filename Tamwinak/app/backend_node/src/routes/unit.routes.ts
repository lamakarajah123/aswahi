import { Router, Request, Response } from 'express';
import { Unit } from '../models';
import { authenticateJWT, AuthRequest } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticateJWT);

// GET /api/v1/units
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const units = await Unit.findAll({ order: [['id', 'ASC']] });
        res.json(units);
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

// POST /api/v1/units
router.post('/', async (req: AuthRequest, res: Response) => {
    try {
        if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
            return res.status(403).json({ detail: 'Admin access required' });
        }
        const { name, name_ar, is_active, step, allow_decimal } = req.body;
        if (!name) return res.status(400).json({ detail: 'Name is required' });

        const unit = await Unit.create({
            name,
            name_ar: name_ar || null,
            is_active: is_active ?? true,
            step,
            allow_decimal: allow_decimal ?? false,
        });

        res.status(201).json(unit);
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

// PUT /api/v1/units/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
    try {
        if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
            return res.status(403).json({ detail: 'Admin access required' });
        }
        const unit = await Unit.findByPk(String(req.params.id));
        if (!unit) return res.status(404).json({ detail: 'Unit not found' });

        const { name, name_ar, is_active, step, allow_decimal } = req.body;

        await unit.update({
            ...(name !== undefined && { name }),
            ...(name_ar !== undefined && { name_ar: name_ar || null }),
            ...(is_active !== undefined && { is_active }),
            ...(step !== undefined && { step }),
            ...(allow_decimal !== undefined && { allow_decimal }),
        });

        res.json(unit);
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

// DELETE /api/v1/units/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
    try {
        if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
            return res.status(403).json({ detail: 'Admin access required' });
        }
        const unit = await Unit.findByPk(String(req.params.id));
        if (!unit) return res.status(404).json({ detail: 'Unit not found' });

        await unit.destroy();
        res.json({ message: 'Unit deleted' });
    } catch (e: any) {
        if (e.name === 'SequelizeForeignKeyConstraintError') {
            return res.status(400).json({ detail: 'Cannot delete unit because it is currently assigned to one or more products.' });
        }
        res.status(500).json({ detail: e.message });
    }
});

export default router;
