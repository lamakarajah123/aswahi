import { z } from 'zod';

export const AssignRoleSchema = z.object({
    user_id: z.string(),
    role_id: z.number().int().positive(),
});

export const UpdateRolePermissionsSchema = z.object({
    permission_ids: z.array(z.number().int().positive()),
});

export const CreatePermissionSchema = z.object({
    name: z.string(),
    description: z.string().nullable().optional(),
    module: z.string(),
    action: z.string(),
});

export const UpdatePermissionSchema = CreatePermissionSchema.partial();
