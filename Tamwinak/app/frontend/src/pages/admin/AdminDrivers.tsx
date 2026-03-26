import { useState, useEffect, useCallback } from 'react';
import { apiCall } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Truck } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdminUser } from './types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function AdminDrivers() {
    const { t } = useLanguage();
    const [activeDrivers, setActiveDrivers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; message: string; onConfirm: () => void }>({ open: false, message: '', onConfirm: () => { } });
    const openConfirm = (message: string, onConfirm: () => void) => setConfirmDialog({ open: true, message, onConfirm });

    const loadDrivers = useCallback(async (signal?: AbortSignal) => {
        try {
            setLoading(true);
            const res = await apiCall.invoke({ url: `/api/v1/users/drivers?_t=${Date.now()}`, method: 'GET', signal });
            setActiveDrivers(res.data?.data || []);
        } catch (err: any) {
            if (err?.code === 'ERR_CANCELED') return;
            toast.error(t('error.load_drivers', 'Failed to load drivers'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        const controller = new AbortController();
        loadDrivers(controller.signal);
        return () => controller.abort();
    }, [loadDrivers]);

    const archiveUser = (userId: string) => {
        openConfirm(
            t('admin.drivers.archive_confirm', "Are you sure you want to archive this user? They will no longer be able to log in."),
            async () => {
                try {
                    await apiCall.invoke({ url: `/api/v1/users/${userId}/archive`, method: 'PUT' });
                    toast.success(t('success.user_archived', 'User archived'));
                    loadDrivers();
                } catch { toast.error(t('error.archive_user', 'Failed to archive user')); }
            }
        );
    };

    const unarchiveUser = (userId: string) => {
        openConfirm(
            t('admin.drivers.unarchive_confirm', "Are you sure you want to unarchive this user?"),
            async () => {
                try {
                    await apiCall.invoke({ url: `/api/v1/users/${userId}/unarchive`, method: 'PUT' });
                    toast.success(t('success.user_unarchived', 'User unarchived'));
                    loadDrivers();
                } catch { toast.error(t('error.unarchive_user', 'Failed to unarchive user')); }
            }
        );
    };

    if (loading) return <div className="text-center py-16"><p className="text-gray-500">{t('admin.drivers.loading', 'Loading drivers...')}</p></div>;

    return (
        <>
            <div className="space-y-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100 min-h-[50vh]">
            <div className="flex items-center mb-6">
                <h3 className="font-semibold text-lg flex items-center gap-2 text-gray-800">
                    <Truck className="w-5 h-5 text-cyan-600" /> {t('admin.drivers.title', 'Active Platform Drivers')}
                </h3>
            </div>

                {activeDrivers.length === 0 ? (
                    <div className="text-center py-16 border border-gray-100 rounded-lg bg-gray-50/50">
                        <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">{t('admin.drivers.no_drivers', 'No active drivers found.')}</p>
                        <p className="text-sm text-gray-400 mt-1">{t('admin.drivers.approve_applications', 'Approve pending applications to add drivers.')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {activeDrivers.map((driver) => (
                            <Card key={driver.id} className={`border border-gray-100 shadow-sm border-t-4 transition-all hover:shadow-md ${driver.status === 'archived' ? 'border-t-gray-400 bg-gray-50/50' : 'border-t-green-500'} relative`}>
                                {driver.status === 'archived' ? (
                                    <Button
                                        variant="ghost" size="sm"
                                        className="absolute top-2 rtl:left-2 rtl:right-auto ltr:right-2 ltr:left-auto text-green-600 hover:text-green-700 hover:bg-green-50 h-8 text-xs font-semibold px-2"
                                        onClick={() => unarchiveUser(driver.id)}
                                    >
                                        {t('admin.drivers.unarchive', 'Unarchive')}
                                    </Button>
                                ) : (
                                    <Button
                                        variant="ghost" size="sm"
                                        className="absolute top-2 rtl:left-2 rtl:right-auto ltr:right-2 ltr:left-auto text-red-500 hover:text-red-600 hover:bg-red-50 h-8 text-xs font-semibold px-2"
                                        onClick={() => archiveUser(driver.id)}
                                    >
                                        {t('admin.drivers.archive', 'Archive')}
                                    </Button>
                                )}
                                <CardHeader className="pb-2 pt-4 ltr:pl-4 ltr:pr-16 rtl:pr-4 rtl:pl-16 bg-white/50">
                                    <CardTitle className="text-base flex items-center gap-2 font-bold text-gray-800">
                                        {driver.name || t('admin.drivers.unnamed_driver', 'Unnamed Driver')}
                                        {driver.status === 'archived' ? (
                                            <Badge className="bg-gray-100 text-gray-600 shadow-none border-gray-200 uppercase text-[10px] ltr:ml-2 rtl:mr-2">{t('admin.drivers.archived', 'Archived')}</Badge>
                                        ) : (
                                            <Badge className="bg-green-50 text-green-700 shadow-none border-green-200 uppercase text-[10px] ltr:ml-2 rtl:mr-2">{t('admin.drivers.active', 'Active')}</Badge>
                                        )}
                                    </CardTitle>
                                    <div className="text-sm mt-1">
                                        <p className="text-gray-500 flex items-center gap-1.5"><span className="text-[10px]">📧</span> {driver.email}</p>
                                        {driver.phone && <p className="text-gray-600 font-medium flex items-center gap-1.5"><span className="text-[10px]">📱</span> {driver.phone}</p>}
                                    </div>
                                </CardHeader>
                                <CardContent className="text-sm p-4 bg-white/50">
                                    <div className="grid grid-cols-2 gap-y-3 gap-x-2 bg-slate-50 p-3 rounded-md border border-slate-100">
                                        <div className="flex flex-col">
                                            <span className="text-gray-400 font-medium text-[10px] uppercase tracking-wide">{t('admin.pending_users.work_area', 'Work Area')}</span>
                                            <span className="font-medium text-gray-800">{driver.work_area || '-'}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-gray-400 font-medium text-[10px] uppercase tracking-wide">{t('admin.pending_users.vehicle_type', 'Vehicle Type')}</span>
                                            <span className="font-medium text-gray-800 capitalize">{driver.vehicle_type || '-'}</span>
                                        </div>
                                        <div className="col-span-2 flex flex-col pt-1 border-t border-slate-200 gap-1.5 mt-1">
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-400 font-medium text-[10px] uppercase tracking-wide">{t('admin.pending_users.working_hours', 'Working Hours')}</span>
                                                <span className="font-medium text-gray-800 text-end">{driver.working_hours || '-'}</span>
                                            </div>
                                            {driver.address && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-400 font-medium text-[10px] uppercase tracking-wide">{t('admin.drivers.address', 'Address')}</span>
                                                    <span className="font-medium text-gray-800 text-end">{driver.address}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center mt-1 pt-1 border-t border-slate-100">
                                                <span className="text-gray-400 font-medium text-[10px] uppercase tracking-wide">{t('admin.drivers.delivered_count', 'Delivered')}</span>
                                                <Badge variant="outline" className="font-bold text-green-700 bg-green-50 border-green-100">{driver.delivered_count || 0}</Badge>
                                            </div>
                                            <div className="flex justify-between items-center mt-1 pt-1">
                                                <span className="text-gray-400 font-medium text-[10px] uppercase tracking-wide">{t('admin.drivers.total_count', 'Total Dispatched')}</span>
                                                <Badge variant="outline" className="font-bold text-slate-500 bg-slate-50 border-slate-100">{driver.order_count || 0}</Badge>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(s => ({ ...s, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirm.action', 'Confirm Action')}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(s => ({ ...s, open: false })); }} className="bg-red-600 hover:bg-red-700">
              {t('common.confirm', 'Confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
