import { Router, Request, Response } from 'express';
import { StoresService } from '../services/store.service';
import { StoresDataSchema, StoresUpdateDataSchema } from '../validators/store.validator';
import { authenticateJWT, AuthRequest } from '../middlewares/auth.middleware';

const router = Router();
const service = new StoresService();

router.use(authenticateJWT);

// GET /api/v1/entities/stores
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const skip = parseInt(req.query.skip as string || '0');
        const limit = parseInt(req.query.limit as string || '20');
        const userId = req.user.id;

        const result = await service.getList(skip, limit, userId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

// GET /api/v1/entities/stores/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const id = parseInt(req.params.id as string);
        const userId = req.user.id;

        const result = await service.getById(id, userId);
        if (!result) return res.status(404).json({ detail: 'Stores not found' });

        res.json(result);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

// POST /api/v1/entities/stores
router.post('/', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.id;
        // Validate request body
        const validatedData = StoresDataSchema.parse(req.body);

        const result = await service.create(validatedData, userId);
        res.status(201).json(result);
    } catch (error: any) {
        if (error.errors) { // Zod error
            return res.status(400).json({ detail: error.errors });
        }
        res.status(500).json({ detail: error.message });
    }
});

// PUT /api/v1/entities/stores/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const id = parseInt(req.params.id as string);
        const userId = req.user.id;

        const validatedData = StoresUpdateDataSchema.parse(req.body);
        const result = await service.update(id, validatedData, userId);

        if (!result) return res.status(404).json({ detail: 'Stores not found' });

        res.json(result);
    } catch (error: any) {
        if (error.errors) {
            return res.status(400).json({ detail: error.errors });
        }
        res.status(500).json({ detail: error.message });
    }
});

export default router;
