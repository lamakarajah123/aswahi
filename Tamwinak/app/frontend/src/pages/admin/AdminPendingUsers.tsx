import { useState, useEffect, useCallback } from 'react';
import { apiCall } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdminUser } from './types';

export default function AdminPendingUsers() {
    const { t } = useLanguage();
    const [pendingUsers, setPendingUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);

    const loadUsers = useCallback(async (signal?: AbortSignal) => {
        try {
            setLoading(true);
            const res = await apiCall.invoke({ url: '/api/v1/users/pending', method: 'GET', signal });
            setPendingUsers(res.data?.data || []);
        } catch (err: any) {
            if (err?.code === 'ERR_CANCELED') return;
            toast.error(t('error.load_pending_users', 'Failed to load pending users'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        const controller = new AbortController();
        loadUsers(controller.signal);
        return () => controller.abort();
    }, [loadUsers]);

    const approveUser = async (userId: string) => {
        try {
            await apiCall.invoke({ url: `/api/v1/users/${userId}/approve`, method: 'PUT' });
            toast.success(t('success.user_approved', 'User approved'));
            loadUsers();
        } catch {
            toast.error(t('error.approve_user', 'Failed to approve user'));
        }
    };

    const rejectUser = async (userId: string) => {
        try {
            await apiCall.invoke({ url: `/api/v1/users/${userId}/reject`, method: 'PUT' });
            toast.success(t('success.user_rejected', 'User rejected'));
            loadUsers();
        } catch {
            toast.error(t('error.reject_user', 'Failed to reject user'));
        }
    };

    if (loading) return <div className="text-center py-16"><p className="text-gray-500">{t('admin.pending_users.loading', 'Loading users...')}</p></div>;

    return (
        <div className="space-y-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100 min-h-[50vh]">
            <div className="flex items-center mb-6">
                <h3 className="font-semibold text-lg flex items-center gap-2 text-gray-800">
                    <Users className="w-5 h-5 text-indigo-500" /> {t('admin.pending_users.title', 'Pending Users Applications')}
                </h3>
            </div>

            {pendingUsers.length === 0 ? (
                <div className="text-center py-16 border border-gray-100 rounded-lg bg-gray-50/50">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">{t('admin.pending_users.no_pending', 'No pending users awaiting approval.')}</p>
                    <p className="text-sm text-gray-400 mt-1">{t('admin.pending_users.all_processed', 'All applications have been processed.')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {pendingUsers.map((pUser) => (
                        <Card key={pUser.id} className="border border-gray-100 shadow-sm hover:border-gray-200 transition-colors">
                            <CardContent className="p-5">
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-lg text-gray-900">{pUser.name || t('admin.pending_users.no_name', 'No Name Provided')}</h3>
                                            <Badge className="bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200 shadow-none">{t('admin.pending_users.pending', 'Pending')}</Badge>
                                            <Badge variant="outline" className="uppercase tracking-wider text-[10px] text-gray-600 bg-gray-50">{pUser.role}</Badge>
                                        </div>
                                        <div className="text-sm text-gray-600 space-y-1">
                                            <p className="flex items-center gap-2">📧 {pUser.email}</p>
                                            {pUser.phone && <p className="flex items-center gap-2">📱 {pUser.phone}</p>}
                                        </div>

                                        {pUser.role === 'driver' && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs bg-slate-50 p-3 rounded-md border border-slate-100 mt-2">
                                                <div className="flex flex-col"><span className="text-gray-400 font-medium text-[10px] uppercase">{t('admin.pending_users.work_area', 'Work Area')}</span><span className="font-medium text-gray-800">{pUser.work_area || t('admin.pending_users.na', 'N/A')}</span></div>
                                                <div className="flex flex-col"><span className="text-gray-400 font-medium text-[10px] uppercase">{t('admin.pending_users.vehicle_type', 'Vehicle Type')}</span><span className="font-medium text-gray-800 capitalize">{pUser.vehicle_type || t('admin.pending_users.na', 'N/A')}</span></div>
                                                <div className="flex flex-col"><span className="text-gray-400 font-medium text-[10px] uppercase">{t('admin.pending_users.working_hours', 'Working Hours')}</span><span className="font-medium text-gray-800">{pUser.working_hours || t('admin.pending_users.na', 'N/A')}</span></div>
                                                <div className="flex flex-col"><span className="text-gray-400 font-medium text-[10px] uppercase">{t('admin.pending_users.home_address', 'Home Address')}</span><span className="font-medium text-gray-800">{pUser.address || t('admin.pending_users.na', 'N/A')}</span></div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-2 self-start md:self-stretch md:items-center">
                                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white shadow-sm" onClick={() => approveUser(pUser.id)}>
                                            <Check className="w-4 h-4 rtl:ml-1.5 ltr:mr-1.5" /> {t('admin.pending_users.approve', 'Approve')}
                                        </Button>
                                        <Button size="sm" variant="destructive" className="shadow-sm" onClick={() => rejectUser(pUser.id)}>
                                            <X className="w-4 h-4 rtl:ml-1.5 ltr:mr-1.5" /> {t('admin.pending_users.reject', 'Reject')}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
