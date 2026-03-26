import { z } from 'zod';

export const LanguageDataSchema = z.object({
    code: z.string().min(2).max(10),
    name: z.string().min(1),
    isDefault: z.boolean().optional(),
    isRtl: z.boolean().optional(),
    translations: z.record(z.string(), z.string()).optional()
});

export const LanguageUpdateDataSchema = LanguageDataSchema.partial();
