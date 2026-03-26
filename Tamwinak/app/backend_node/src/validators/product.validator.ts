import { z } from 'zod';

export const ProductDataSchema = z.object({
    industry_id: z.number().int().min(1).nullable().optional(),
    name: z.string().min(1),
    description: z.string().nullable().optional(),
    image_url: z.string().nullable().optional(),
    category: z.string().nullable().optional(),
    is_available: z.boolean().nullable().optional(),
    created_at: z.string().datetime().nullable().optional(),
    store_id: z.number().int().optional(),
    price: z.number().optional(),
    unit: z.string().optional(),
});

export const ProductUpdateDataSchema = ProductDataSchema.partial();
