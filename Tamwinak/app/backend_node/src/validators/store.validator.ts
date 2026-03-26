import { z } from 'zod';

export const StoresDataSchema = z.object({
    name: z.string().min(1),
    description: z.string().nullable().optional(),
    address: z.string().min(1),
    latitude: z.number(),
    longitude: z.number(),
    phone: z.string().nullable().optional(),
    image_url: z.string().url().nullable().optional(),
    is_approved: z.boolean().nullable().optional(),
    is_active: z.boolean().nullable().optional(),
    rating: z.number().min(0).max(5).nullable().optional(),
    total_ratings: z.number().int().min(0).nullable().optional(),
    commission_rate: z.number().min(0).max(100).nullable().optional(),
    working_hours: z.string().nullable().optional(),
    created_at: z.string().datetime().nullable().optional()
});

export const StoresUpdateDataSchema = StoresDataSchema.partial();
