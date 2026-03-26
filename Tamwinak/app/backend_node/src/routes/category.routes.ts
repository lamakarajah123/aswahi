import { Router, Response } from 'express';
import { authenticateJWT, AuthRequest } from '../middlewares/auth.middleware';
import { Category, Product } from '../models';
import { z } from 'zod';
import { Op } from 'sequelize';

const router = Router();

const CategorySchema = z.object({
    name: z.string().min(1),
    name_ar: z.string().nullable().optional(),
    icon: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    sort_order: z.number().int().optional().default(0),
    is_active: z.boolean().optional().default(true),
});

// GET /api/v1/categories
router.get('/', async (_req: AuthRequest, res: Response) => {
    try {
        const categories = await Category.findAll({ order: [['sort_order', 'ASC'], ['name', 'ASC']] });
        res.json(categories);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

// GET /api/v1/categories/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const category = await Category.findByPk(parseInt(req.params.id as string));
        if (!category) return res.status(404).json({ detail: 'Category not found' });
        res.json(category);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

// POST /api/v1/categories
router.post('/', authenticateJWT, async (req: AuthRequest, res: Response) => {
    try {
        if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
            return res.status(403).json({ detail: 'Only admins can add categories' });
        }
        const data = CategorySchema.parse(req.body);
        const existing = await Category.findOne({ where: { name: data.name } });
        if (existing) return res.status(409).json({ detail: 'A category with this name already exists' });
        const category = await Category.create({ ...data, created_at: new Date() });
        res.status(201).json(category);
    } catch (error: any) {
        if (error.errors) return res.status(400).json({ detail: error.errors });
        res.status(500).json({ detail: error.message });
    }
});

// PUT /api/v1/categories/:id
router.put('/:id', authenticateJWT, async (req: AuthRequest, res: Response) => {
    try {
        if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
            return res.status(403).json({ detail: 'Only admins can update categories' });
        }
        const category = await Category.findByPk(parseInt(req.params.id as string));
        if (!category) return res.status(404).json({ detail: 'Category not found' });
        const data = CategorySchema.partial().parse(req.body);
        // Check name uniqueness if being changed
        if (data.name && data.name !== category.name) {
            const existing = await Category.findOne({ where: { name: data.name, id: { [Op.ne]: category.id } } });
            if (existing) return res.status(409).json({ detail: 'A category with this name already exists' });
        }
        await category.update(data);
        res.json(category);
    } catch (error: any) {
        if (error.errors) return res.status(400).json({ detail: error.errors });
        res.status(500).json({ detail: error.message });
    }
});

// DELETE /api/v1/categories/:id
router.delete('/:id', authenticateJWT, async (req: AuthRequest, res: Response) => {
    try {
        if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
            return res.status(403).json({ detail: 'Only admins can delete categories' });
        }
        const category = await Category.findByPk(parseInt(req.params.id as string));
        if (!category) return res.status(404).json({ detail: 'Category not found' });
        // Detach products before deletion (category_id → null)
        await Product.update({ category_id: null }, { where: { category_id: category.id } });
        await category.destroy();
        res.json({ message: 'Category deleted', id: req.params.id });
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

// GET /api/v1/categories/:id/products — list products assigned to this category
router.get('/:id/products', async (req: AuthRequest, res: Response) => {
    try {
        const category = await Category.findByPk(parseInt(req.params.id as string));
        if (!category) return res.status(404).json({ detail: 'Category not found' });
        const products = await Product.findAll({ where: { category_id: category.id }, order: [['name', 'ASC']] });
        res.json(products);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

// PATCH /api/v1/categories/:id/assign-products — assign an array of productIds to this category
router.patch('/:id/assign-products', authenticateJWT, async (req: AuthRequest, res: Response) => {
    try {
        if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
            return res.status(403).json({ detail: 'Only admins can assign products' });
        }
        const category = await Category.findByPk(parseInt(req.params.id as string));
        if (!category) return res.status(404).json({ detail: 'Category not found' });
        const { product_ids } = req.body as { product_ids: number[] };
        if (!Array.isArray(product_ids)) return res.status(400).json({ detail: 'product_ids must be an array' });
        await Product.update({ category_id: category.id }, { where: { id: product_ids } });
        res.json({ message: `Assigned ${product_ids.length} products to category` });
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

export default router;
