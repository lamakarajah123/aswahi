import { Router, Request, Response } from 'express';
import { LanguageService } from '../services/language.service';
import { LanguageDataSchema, LanguageUpdateDataSchema } from '../validators/language.validator';
import { authenticateJWT, AuthRequest } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/rbac.middleware';

const router = Router();
const service = new LanguageService();


// GET /api/v1/languages
router.get('/', async (req: Request, res: Response) => {
    try {
        const skip = parseInt(req.query.skip as string || '0');
        const limit = parseInt(req.query.limit as string || '100'); // Higher limit for languages

        const result = await service.getList(skip, limit);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

// GET /api/v1/languages/code/:code
router.get('/code/:code', async (req: Request, res: Response) => {
    try {
        const code = req.params.code as string;
        const result = await service.getByCode(code);
        if (!result) return res.status(404).json({ detail: 'Language not found' });

        res.json(result);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

// GET /api/v1/languages/:id
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id as string);
        const result = await service.getById(id);
        if (!result) return res.status(404).json({ detail: 'Language not found' });

        res.json(result);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

// Admin only routes
router.use(authenticateJWT);
router.use(requireRoles(['admin']));

// POST /api/v1/languages
router.post('/', async (req: AuthRequest, res: Response) => {
    try {
        const validatedData = LanguageDataSchema.parse(req.body);
        const result = await service.create(validatedData);
        res.status(201).json(result);
    } catch (error: any) {
        if (error.errors) {
            return res.status(400).json({ detail: error.errors });
        }
        // Unique constraint error for code
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ detail: 'Language code must be unique' });

        }
        res.status(500).json({ detail: error.message });
    }
});

// PUT /api/v1/languages/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const id = parseInt(req.params.id as string);
        const validatedData = LanguageUpdateDataSchema.parse(req.body);
        const result = await service.update(id, validatedData);

        if (!result) return res.status(404).json({ detail: 'Language not found' });

        res.json(result);
    } catch (error: any) {
        if (error.errors) {
            return res.status(400).json({ detail: error.errors });
        }
        res.status(500).json({ detail: error.message });
    }
});

// DELETE /api/v1/languages/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const id = parseInt(req.params.id as string);
        const success = await service.delete(id);
        if (!success) {
            return res.status(404).json({ detail: 'Language not found' });
        }

        res.status(204).send();
    } catch (error: any) {
        res.status(400).json({ detail: error.message });
    }
})

export default router;
