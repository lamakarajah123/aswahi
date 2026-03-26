import { User, Role, Permission, UserRole, RolePermission } from '../models';
import { sequelize } from '../config/database';

export class RbacService {
    /**
     * Fetches roles AND permissions for a user in 3 queries instead of 4
     * by sharing the single UserRole lookup.
     */
    async getUserRolesAndPermissions(userId: string): Promise<{ roles: Role[]; permissions: string[] }> {
        const userRoles = await UserRole.findAll({ where: { user_id: userId } });
        const roleIds = userRoles.map(ur => ur.role_id);

        if (roleIds.length === 0) return { roles: [], permissions: [] };

        const [roles, rolePermissions] = await Promise.all([
            Role.findAll({ where: { id: roleIds, is_active: true } }),
            RolePermission.findAll({ where: { role_id: roleIds } }),
        ]);

        const permissionIds = rolePermissions.map(rp => rp.permission_id);
        const permissions = permissionIds.length > 0
            ? await Permission.findAll({ where: { id: permissionIds } })
            : [];

        return { roles, permissions: permissions.map(p => p.name) };
    }

    async getUserPermissions(userId: string) {
        const userRoles = await UserRole.findAll({ where: { user_id: userId } });
        const roleIds = userRoles.map(ur => ur.role_id);

        if (roleIds.length === 0) return [];

        const rolePermissions = await RolePermission.findAll({ where: { role_id: roleIds } });
        const permissionIds = rolePermissions.map(rp => rp.permission_id);

        if (permissionIds.length === 0) return [];

        const permissions = await Permission.findAll({ where: { id: permissionIds } });
        return permissions.map(p => p.name);
    }

    async getUserRoles(userId: string) {
        const userRoles = await UserRole.findAll({ where: { user_id: userId } });
        const roleIds = userRoles.map(ur => ur.role_id);

        if (roleIds.length === 0) return [];

        const roles = await Role.findAll({ where: { id: roleIds, is_active: true } });
        return roles;
    }

    async assignRole(userId: string, roleId: number, assignedBy: string) {
        const existing = await UserRole.findOne({ where: { user_id: userId, role_id: roleId } });
        if (existing) throw new Error('Role already assigned to user');

        return UserRole.create({
            user_id: userId,
            role_id: roleId,
            assigned_by: assignedBy,
            assigned_at: new Date()
        });
    }

    async revokeRole(userId: string, roleId: number) {
        const assignment = await UserRole.findOne({ where: { user_id: userId, role_id: roleId } });
        if (!assignment) throw new Error('Role assignment not found');

        await assignment.destroy();
        return true;
    }

    async updateRolePermissions(roleId: number, permissionIds: number[]) {
        const transaction = await sequelize.transaction();
        try {
            await RolePermission.destroy({ where: { role_id: roleId }, transaction });

            const newLinks = permissionIds.map(pid => ({
                role_id: roleId,
                permission_id: pid,
                created_at: new Date()
            }));

            await RolePermission.bulkCreate(newLinks, { transaction });
            await transaction.commit();
            return true;
        } catch (e) {
            await transaction.rollback();
            throw e;
        }
    }

    async getRoles() {
        return Role.findAll({ order: [['id', 'ASC']] });
    }

    async getRolePermissions(roleId: number) {
        const links = await RolePermission.findAll({ where: { role_id: roleId } });
        const pids = links.map(l => l.permission_id);
        if (pids.length === 0) return [];

        return Permission.findAll({ where: { id: pids } });
    }

    async getAllPermissions(moduleFilter?: string) {
        const where: any = {};
        if (moduleFilter) where.module = moduleFilter;
        return Permission.findAll({ where, order: [['module', 'ASC'], ['name', 'ASC']] });
    }
}
