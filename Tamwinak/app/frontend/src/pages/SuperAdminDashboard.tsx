import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiCall } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ShieldCheck, Users, Key, ScrollText, Plus, Trash2,
  Check, Loader2, Search, Shield, LogIn,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppHeader } from '@/components/AppHeader';
import { Footer } from '@/components/Footer';
import type { Role, Permission, UserRoleAssignment, AuditLog } from '@/types';

export default function SuperAdminDashboard() {
  const { user, loading: authLoading, isSuperAdmin } = useAuth();
  const { t } = useLanguage();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [userRoles, setUserRoles] = useState<UserRoleAssignment[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [assignDialog, setAssignDialog] = useState(false);
  const [permDialog, setPermDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [rolePermIds, setRolePermIds] = useState<number[]>([]);
  const [assignForm, setAssignForm] = useState({ user_id: '', role_id: '' });
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [rolesRes, permsRes, urRes, logsRes] = await Promise.all([
        apiCall.invoke({ url: '/api/v1/rbac/roles', method: 'GET' }),
        apiCall.invoke({ url: '/api/v1/rbac/permissions', method: 'GET' }),
        apiCall.invoke({ url: '/api/v1/rbac/user-roles', method: 'GET' }),
        apiCall.invoke({ url: '/api/v1/rbac/audit-logs', method: 'GET', params: { limit: 50 } }),
      ]);
      setRoles(rolesRes.data || []);
      setPermissions(permsRes.data || []);
      setUserRoles(urRes.data || []);
      setAuditLogs(logsRes.data?.items || []);
      setAuditTotal(logsRes.data?.total || 0);
    } catch {
      toast.error(t('error.load_rbac', 'Failed to load RBAC data'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (user && isSuperAdmin) {
      loadData();
    } else if (user && !authLoading) {
      setLoading(false);
    }
  }, [user, authLoading, isSuperAdmin, loadData]);

  const handleAssignRole = async () => {
    if (!assignForm.user_id || !assignForm.role_id) {
      toast.error(t('error.fill_all_fields', 'Please fill in all fields'));
      return;
    }
    try {
      await apiCall.invoke({
        url: '/api/v1/rbac/assign-role',
        method: 'POST',
        data: { user_id: assignForm.user_id, role_id: parseInt(assignForm.role_id) },
      });
      toast.success(t('success.role_assigned', 'Role assigned successfully'));
      setAssignDialog(false);
      setAssignForm({ user_id: '', role_id: '' });
      loadData();
    } catch (err: any) {
      toast.error(err?.data?.detail || t('error.assign_role', 'Failed to assign role'));
    }
  };

  const handleRevokeRole = async (userId: string, roleId: number) => {
    try {
      await apiCall.invoke({
        url: '/api/v1/rbac/revoke-role',
        method: 'DELETE',
        data: { user_id: userId, role_id: roleId },
      });
      toast.success(t('success.role_revoked', 'Role revoked'));
      loadData();
    } catch (err: any) {
      toast.error(err?.data?.detail || t('error.revoke_role', 'Failed to revoke role'));
    }
  };

  const openPermDialog = async (role: Role) => {
    setSelectedRole(role);
    try {
      const res = await apiCall.invoke({
        url: `/api/v1/rbac/roles/${role.id}/permissions`,
        method: 'GET',
      });
      const currentPerms: Permission[] = res.data || [];
      setRolePermIds(currentPerms.map((p) => p.id));
    } catch {
      setRolePermIds([]);
    }
    setPermDialog(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    try {
      await apiCall.invoke({
        url: `/api/v1/rbac/roles/${selectedRole.id}/permissions`,
        method: 'PUT',
        data: { permission_ids: rolePermIds },
      });
      toast.success(`${t('success.permissions_updated', 'Permissions updated for')} ${selectedRole.name}`);
      setPermDialog(false);
      loadData();
    } catch (err: any) {
      toast.error(err?.data?.detail || t('error.update_permissions', 'Failed to update permissions'));
    }
  };

  const togglePermission = (permId: number) => {
    setRolePermIds((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId]
    );
  };

  // Group permissions by module
  const permsByModule = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {});

  const filteredLogs = searchQuery
    ? auditLogs.filter(
      (l) =>
        l.action.includes(searchQuery) ||
        l.user_id.includes(searchQuery) ||
        (l.target_id && l.target_id.includes(searchQuery))
    )
    : auditLogs;

  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-sm w-full text-center p-8">
          <LogIn className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">{t('superadmin.sign_in_required', 'Sign In Required')}</h2>
          <p className="text-gray-500 mb-4">{t('superadmin.sign_in_access', 'Please sign in to access the super admin panel')}</p>
          <Button onClick={() => window.location.href = '/login'} className="bg-green-600 hover:bg-green-700 text-white">{t('superadmin.sign_in_btn', 'Sign In')}</Button>
        </Card>
      </div>
    );
  }

  if (!authLoading && user && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader />
        <div className="flex items-center justify-center p-4 mt-20">
          <Card className="max-w-sm w-full text-center p-8">
            <ShieldCheck className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">{t('superadmin.super_admin_only', 'Super Admin Only')}</h2>
            <p className="text-gray-500 mb-4">{t('superadmin.requires_super_admin', 'This page requires super admin privileges.')}</p>
            <p className="text-xs text-gray-400">{t('superadmin.contact_super_admin', 'Contact a super admin to get access.')}</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AppHeader />

      <div className="flex-1 max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck className="w-6 h-6 text-purple-600" />
          <h1 className="text-2xl font-bold">{t('superadmin.title', 'System Administration')}</h1>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 text-green-600 animate-spin mx-auto" />
            <p className="text-gray-500 mt-2">{t('superadmin.loading_rbac', 'Loading RBAC data...')}</p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 text-center">
                  <Shield className="w-6 h-6 text-purple-500 mx-auto mb-1" />
                  <p className="text-xl font-bold">{roles.length}</p>
                  <p className="text-xs text-gray-500">{t('superadmin.roles', 'Roles')}</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 text-center">
                  <Key className="w-6 h-6 text-blue-500 mx-auto mb-1" />
                  <p className="text-xl font-bold">{permissions.length}</p>
                  <p className="text-xs text-gray-500">{t('superadmin.permissions', 'Permissions')}</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 text-center">
                  <Users className="w-6 h-6 text-green-500 mx-auto mb-1" />
                  <p className="text-xl font-bold">{userRoles.length}</p>
                  <p className="text-xs text-gray-500">{t('superadmin.role_assignments', 'Role Assignments')}</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 text-center">
                  <ScrollText className="w-6 h-6 text-orange-500 mx-auto mb-1" />
                  <p className="text-xl font-bold">{auditTotal}</p>
                  <p className="text-xs text-gray-500">{t('superadmin.audit_logs', 'Audit Logs')}</p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="roles" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="roles">{t('superadmin.tab_roles', 'Roles')}</TabsTrigger>
                <TabsTrigger value="assignments">{t('superadmin.tab_assignments', 'Assignments')}</TabsTrigger>
                <TabsTrigger value="permissions">{t('superadmin.tab_permissions', 'Permissions')}</TabsTrigger>
                <TabsTrigger value="audit">{t('superadmin.tab_audit', 'Audit Logs')}</TabsTrigger>
              </TabsList>

              {/* Roles Tab */}
              <TabsContent value="roles" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {roles.map((role) => (
                    <Card key={role.id} className="border-0 shadow-sm">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base capitalize">{role.name.replace('_', ' ')}</CardTitle>
                          <Badge variant={role.is_active ? 'default' : 'secondary'}>
                            {role.is_active ? t('superadmin.active', 'Active') : t('superadmin.inactive', 'Inactive')}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-500 mb-3">{role.description || t('superadmin.no_description', 'No description')}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">
                            {role.permission_count} {t('superadmin.permissions', 'permissions')}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openPermDialog(role)}
                          >
                            <Key className="w-3 h-3 mr-1" /> {t('superadmin.manage', 'Manage')}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Assignments Tab */}
              <TabsContent value="assignments" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">{t('superadmin.user_role_assignments', 'User Role Assignments')} ({userRoles.length})</h3>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => setAssignDialog(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" /> {t('superadmin.assign_role', 'Assign Role')}
                  </Button>
                </div>
                {userRoles.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">{t('superadmin.no_role_assignments', 'No role assignments yet')}</p>
                    <p className="text-xs text-gray-400 mt-1">{t('superadmin.use_assign_role', 'Use "Assign Role" to get started')}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {userRoles.map((ur) => (
                      <Card key={ur.id} className="border-0 shadow-sm">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{ur.user_id}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className="capitalize">{ur.role_name.replace('_', ' ')}</Badge>
                              {ur.assigned_at && (
                                <span className="text-xs text-gray-400">
                                  {new Date(ur.assigned_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-700 shrink-0"
                            onClick={() => handleRevokeRole(ur.user_id, ur.role_id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Permissions Tab */}
              <TabsContent value="permissions" className="space-y-4">
                {Object.entries(permsByModule).map(([module, perms]) => (
                  <Card key={module} className="border-0 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base capitalize">{module}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {perms.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center gap-2 p-2 rounded bg-gray-50"
                          >
                            <Key className="w-3 h-3 text-gray-400 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{p.name}</p>
                              <p className="text-xs text-gray-400 truncate">{p.description}</p>
                            </div>
                            <Badge variant="secondary" className="text-xs ml-auto shrink-0">
                              {p.action}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              {/* Audit Logs Tab */}
              <TabsContent value="audit" className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder={t('superadmin.search_logs', 'Search logs...')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <span className="text-sm text-gray-500">{filteredLogs.length} {t('superadmin.logs_count', 'logs')}</span>
                </div>
                {filteredLogs.length === 0 ? (
                  <div className="text-center py-12">
                    <ScrollText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">{t('superadmin.no_audit_logs', 'No audit logs found')}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredLogs.map((log) => (
                      <Card key={log.id} className="border-0 shadow-sm">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                  {log.action}
                                </Badge>
                                {log.target_type && (
                                  <span className="text-xs text-gray-400">
                                    {log.target_type}: {log.target_id}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-1 truncate">
                                {t('superadmin.by', 'By')}: {log.user_id}
                              </p>
                              {log.details && (
                                <p className="text-xs text-gray-400 mt-1 truncate">
                                  {log.details}
                                </p>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              {log.created_at && (
                                <p className="text-xs text-gray-400">
                                  {new Date(log.created_at).toLocaleString()}
                                </p>
                              )}
                              {log.ip_address && (
                                <p className="text-xs text-gray-300">{log.ip_address}</p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      {/* Assign Role Dialog */}
      <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('superadmin.assign_role_to_user', 'Assign Role to User')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">{t('superadmin.user_id', 'User ID')}</label>
              <Input
                placeholder={t('superadmin.enter_user_id', 'Enter user ID')}
                value={assignForm.user_id}
                onChange={(e) => setAssignForm({ ...assignForm, user_id: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t('superadmin.role', 'Role')}</label>
              <Select
                value={assignForm.role_id}
                onValueChange={(v) => setAssignForm({ ...assignForm, role_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('superadmin.select_role', 'Select role')} />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(false)}>{t('common.cancel', 'Cancel')}</Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleAssignRole}>
              <Check className="w-4 h-4 mr-1" /> {t('superadmin.assign', 'Assign')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permission Management Dialog */}
      <Dialog open={permDialog} onOpenChange={setPermDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t('superadmin.manage_permissions', 'Manage Permissions')}: {selectedRole?.name.replace('_', ' ')}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-4">
              {Object.entries(permsByModule).map(([module, perms]) => (
                <div key={module}>
                  <h4 className="text-sm font-semibold capitalize mb-2 text-gray-700">
                    {module}
                  </h4>
                  <div className="space-y-2">
                    {perms.map((p) => (
                      <div key={p.id} className="flex items-center gap-3">
                        <Checkbox
                          id={`perm-${p.id}`}
                          checked={rolePermIds.includes(p.id)}
                          onCheckedChange={() => togglePermission(p.id)}
                        />
                        <label htmlFor={`perm-${p.id}`} className="text-sm cursor-pointer flex-1">
                          <span className="font-medium">{p.name}</span>
                          {p.description && (
                            <span className="text-gray-400 ml-2 text-xs">{p.description}</span>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermDialog(false)}>{t('common.cancel', 'Cancel')}</Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleSavePermissions}>
              <Check className="w-4 h-4 mr-1" /> {t('superadmin.save_permissions', 'Save Permissions')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  );
}
