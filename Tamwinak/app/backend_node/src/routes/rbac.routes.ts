import { Router, Request, Response } from 'express';
import { authenticateJWT, AuthRequest } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/rbac.middleware';
import { RbacService } from '../services/rbac.service';
import { AssignRoleSchema, UpdateRolePermissionsSchema } from '../validators/rbac.validator';
import { UserRole, AuditLog } from '../models';

const router = Router();
const service = new RbacService();

router.use(authenticateJWT);

// GET /api/v1/rbac/me
router.get('/me', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.id;
        const { roles, permissions } = await service.getUserRolesAndPermissions(userId);

        res.json({
            user_id: userId,
            roles: roles.map((r: any) => r.name),
            role_details: roles.map((r: any) => ({ id: r.id, name: r.name, description: r.description })),
            permissions
        });
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

// GET /api/v1/rbac/roles (Admin only)
router.get('/roles', requireRoles(['admin', 'super_admin']) as any, async (req: AuthRequest, res: Response) => {
    try {
        const roles = await service.getRoles();
        // Ignoring count aggregations for simplicity based on prompt phase
        res.json(roles);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

// GET /api/v1/rbac/roles/:id/permissions
router.get('/roles/:id/permissions', requireRoles(['admin', 'super_admin']) as any, async (req: AuthRequest, res: Response) => {
    try {
        const roleId = parseInt(req.params.id as string);
        const permissions = await service.getRolePermissions(roleId);
        res.json(permissions);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

// PUT /api/v1/rbac/roles/:id/permissions (Super Admin only)
router.put('/roles/:id/permissions', requireRoles(['super_admin']) as any, async (req: AuthRequest, res: Response) => {
    try {
        const roleId = parseInt(req.params.id as string);
        const validated = UpdateRolePermissionsSchema.parse(req.body);

        await service.updateRolePermissions(roleId, validated.permission_ids);
        res.json({ message: `Role ${roleId} permissions updated` });
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

// GET /api/v1/rbac/permissions
router.get('/permissions', requireRoles(['admin', 'super_admin']) as any, async (req: AuthRequest, res: Response) => {
    try {
        const module = req.query.module as string | undefined;
        const permissions = await service.getAllPermissions(module);
        res.json(permissions);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

// POST /api/v1/rbac/assign-role
router.post('/assign-role', requireRoles(['admin', 'super_admin']) as any, async (req: AuthRequest, res: Response) => {
    try {
        const validated = AssignRoleSchema.parse(req.body);
        const assignedBy = req.user.id;

        await service.assignRole(validated.user_id, validated.role_id, assignedBy);
        res.json({ message: `Role assigned successfully` });
    } catch (error: any) {
        res.status(400).json({ detail: error.message });
    }
});

// DELETE /api/v1/rbac/revoke-role
router.delete('/revoke-role', requireRoles(['admin', 'super_admin']) as any, async (req: AuthRequest, res: Response) => {
    try {
        const userId = (req.query.user_id as string) || req.body.user_id;
        const roleId = parseInt((req.query.role_id as string) || req.body.role_id);

        if (!userId || isNaN(roleId)) return res.status(400).json({ detail: 'Invalid parameters' });

        await service.revokeRole(userId, roleId);
        res.json({ message: 'Role revoked' });
    } catch (error: any) {
        res.status(400).json({ detail: error.message });
    }
});

// GET /api/v1/rbac/user-roles (Admin only)
router.get('/user-roles', requireRoles(['admin', 'super_admin']) as any, async (req: AuthRequest, res: Response) => {
    try {
        const userRoles = await UserRole.findAll({ order: [['assigned_at', 'DESC']] });
        res.json(userRoles);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

// GET /api/v1/rbac/audit-logs (Admin only)
router.get('/audit-logs', requireRoles(['admin', 'super_admin']) as any, async (req: AuthRequest, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string || '50');
        const { count, rows } = await AuditLog.findAndCountAll({
            limit,
            order: [['created_at', 'DESC']]
        });
        res.json({ items: rows, total: count });
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

export default router;
