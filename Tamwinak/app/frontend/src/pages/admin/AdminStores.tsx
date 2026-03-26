import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiCall } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Store, Check, X, Plus, MapPin, Package, Edit, ChevronLeft, ChevronRight, DollarSign, Settings } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { AdminStore } from './types';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AdminStores() {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [stores, setStores] = useState<AdminStore[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [archiveConfirm, setArchiveConfirm] = useState<{ id: number; action: 'archive' | 'unarchive' } | null>(null);

    const loadStores = useCallback(async (p?: number, signal?: AbortSignal) => {
        const targetPage = p !== undefined ? p : page;
        try {
            setLoading(true);
            const res = await apiCall.invoke({ url: `/api/v1/grocery/admin/stores?page=${targetPage}&limit=20`, method: 'GET', signal });
            setStores(res.data?.data || []);
            setTotal(res.data?.total ?? 0);
            setTotalPages(res.data?.totalPages ?? 1);
        } catch (err: any) {
            if (err?.code === 'ERR_CANCELED') return;
            console.error('[AdminStores_Load_Error]', err);
            toast.error(t('error.load_stores', 'Failed to load stores') + (err.response?.data?.detail ? `: ${err.response.data.detail}` : ''));
        } finally {
            setLoading(false);
        }
    }, [page, t]);

    useEffect(() => {
        const controller = new AbortController();
        loadStores(page, controller.signal);
        return () => controller.abort();
    }, [loadStores]);

    const togglePriceManagement = async (storeId: number) => {
        try {
            await apiCall.invoke({ url: `/api/v1/grocery/admin/stores/${storeId}/toggle-price-management`, method: 'PUT' });
            toast.success(t('success.update', 'Settings updated successfully'));
            loadStores();
        } catch {
            toast.error(t('error.save', 'Failed to update settings'));
        }
    };

    const approveStore = async (storeId: number) => {
        try {
            await apiCall.invoke({ url: `/api/v1/grocery/admin/stores/${storeId}/approve`, method: 'PUT' });
            toast.success(t('success.store_approved', 'Store approved'));
            loadStores();
        } catch {
            toast.error(t('error.approve_store', 'Failed to approve store'));
        }
    };

    const rejectStore = async (storeId: number) => {
        try {
            await apiCall.invoke({ url: `/api/v1/grocery/admin/stores/${storeId}/reject`, method: 'PUT' });
            toast.success(t('success.store_rejected', 'Store rejected'));
            loadStores();
        } catch {
            toast.error(t('error.reject_store', 'Failed to reject store'));
        }
    };

    const archiveStore = async (storeId: number) => {
        setArchiveConfirm({ id: storeId, action: 'archive' });
    };

    const unarchiveStore = async (storeId: number) => {
        setArchiveConfirm({ id: storeId, action: 'unarchive' });
    };

    const handleConfirmAction = async () => {
        if (!archiveConfirm) return;
        const { id, action } = archiveConfirm;
        setArchiveConfirm(null);
        try {
            await apiCall.invoke({ url: `/api/v1/grocery/admin/stores/${id}/${action}`, method: 'PUT' });
            toast.success(action === 'archive' ? t('success.store_archived', 'Store archived') : t('success.store_unarchived', 'Store unarchived'));
            loadStores();
        } catch {
            toast.error(action === 'archive' ? t('error.archive_store', 'Failed to archive store') : t('error.unarchive_store', 'Failed to unarchive store'));
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
        </div>
    );

    return (
        <>
        <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                            <Store className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-gray-900 text-lg">{t('admin.stores.title', 'Stores')}</h2>
                            <p className="text-sm text-gray-500">{total} {t('admin.stores.registered_count', 'registered stores')}</p>
                        </div>
                    </div>
                    <Button
                        className="bg-green-600 hover:bg-green-700 text-white gap-2"
                        onClick={() => navigate('/admin/stores/new')}
                    >
                        <Plus className="w-4 h-4" /> {t('admin.stores.add', 'Add Store')}
                    </Button>
                </div>
            </div>

            {/* Store list */}
            {stores.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <Store className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">{t('admin.stores.no_stores', 'No stores registered yet')}</p>
                    <Button className="mt-4 bg-green-600 hover:bg-green-700 text-white gap-2"
                        onClick={() => navigate('/admin/stores/new')}>
                        <Plus className="w-4 h-4" /> {t('admin.stores.add_first', 'Add First Store')}
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {stores.map((store) => (
                        <Card key={store.id} className="border border-gray-100 shadow-sm hover:shadow transition-shadow">
                            <CardContent className="p-4">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        {store.image_url ? (
                                            <img src={store.image_url} alt={store.name}
                                                className="w-12 h-12 rounded-lg object-cover shrink-0 border border-gray-100" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                                                <Store className="w-6 h-6 text-purple-400" />
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="font-semibold text-gray-900">{store.name}</h3>
                                                {!store.is_active && (
                                                    <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-xs">{t('admin.stores.archived', 'Archived')}</Badge>
                                                )}
                                                {store.is_active && store.is_approved && (
                                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">{t('admin.stores.approved', 'Approved')}</Badge>
                                                )}
                                                {store.is_active && !store.is_approved && (
                                                    <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 text-xs">{t('admin.stores.pending', 'Pending')}</Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                                                <MapPin className="w-3 h-3 shrink-0" />
                                                <span className="truncate">{store.address}</span>
                                            </p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {t('admin.stores.owner', 'Owner')}: {store.owner_email || `${store.user_id?.substring(0, 12)}...`}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 shrink-0">
                                        {/* Edit */}
                                        <Button size="sm" variant="outline"
                                            className="gap-1"
                                            onClick={() => navigate(`/admin/stores/${store.id}/edit`)}>
                                            <Edit className="w-3 h-3" /> {t('common.edit', 'Edit')}
                                        </Button>

                                        {/* Map products to this store */}
                                        <Button size="sm" variant="outline"
                                            className="text-blue-600 border-blue-200 hover:bg-blue-50 gap-1"
                                            onClick={() => navigate('/admin/store-products', { state: { storeId: store.id } })}>
                                            <Package className="w-3 h-3" /> {t('nav.products', 'Products')}
                                         </Button>
                                         
                                         {/* Toggle Price Management */}
                                         <Button 
                                             size="sm" 
                                             variant={store.can_manage_prices ? "default" : "outline"}
                                             className={store.can_manage_prices ? "bg-amber-600 hover:bg-amber-700 text-white gap-1" : "text-amber-600 border-amber-200 hover:bg-amber-50 gap-1"}
                                             onClick={(e) => { e.stopPropagation(); togglePriceManagement(store.id); }}
                                         >
                                             <DollarSign className="w-3 h-3" /> 
                                             {store.can_manage_prices ? t('admin.stores.can_manage', 'Managed') : t('admin.stores.manage_prices', 'Manage Prices')}
                                         </Button>

                                         {!store.is_approved && (
                                            <>
                                                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1"
                                                    onClick={() => approveStore(store.id)}>
                                                    <Check className="w-3 h-3" /> {t('admin.stores.approve', 'Approve')}
                                                </Button>
                                                <Button size="sm" variant="destructive" className="gap-1"
                                                    onClick={() => rejectStore(store.id)}>
                                                    <X className="w-3 h-3" /> {t('admin.stores.reject', 'Reject')}
                                                </Button>
                                            </>
                                        )}
                                        {store.is_active ? (
                                            <Button size="sm" variant="outline"
                                                className="text-red-500 hover:text-red-600 border-red-200 hover:bg-red-50"
                                                onClick={() => archiveStore(store.id)}>
                                                {t('admin.stores.archive', 'Archive')}
                                            </Button>
                                        ) : (
                                            <Button size="sm" variant="outline"
                                                className="text-green-600 hover:text-green-700 border-green-200 hover:bg-green-50"
                                                onClick={() => unarchiveStore(store.id)}>
                                                {t('admin.stores.unarchive', 'Unarchive')}
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {store.orders && store.orders.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-gray-100 italic">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                                                {t('admin.stores.recent_orders_summary', 'Recent Orders Activity')}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {(() => {
                                                const counts = store.orders.reduce((acc, order) => {
                                                    const status = order.status;
                                                    acc[status] = (acc[status] || 0) + 1;
                                                    return acc;
                                                }, {} as Record<string, number>);
                                                
                                                const deliveredCount = (counts['delivered'] || 0) + (counts['تم التوصيل'] || 0) + (counts['completed'] || 0);
                                                const cancelledCount = (counts['cancelled'] || 0) + (counts['unavailable'] || 0) + (counts['returned'] || 0);
                                                const pendingCount = store.orders.length - deliveredCount - cancelledCount;

                                                return (
                                                    <>
                                                        {pendingCount > 0 && (
                                                            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 py-0.5 px-2">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 rtl:mr-0 rtl:ml-1.5"></span>
                                                                {t('admin.orders.status.pending', 'Pending')}: {pendingCount}
                                                            </Badge>
                                                        )}
                                                        {deliveredCount > 0 && (
                                                            <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200 py-0.5 px-2">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 rtl:mr-0 rtl:ml-1.5"></span>
                                                                {t('admin.orders.status.delivered', 'Delivered')}: {deliveredCount}
                                                            </Badge>
                                                        )}
                                                        {cancelledCount > 0 && (
                                                            <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200 py-0.5 px-2">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5 rtl:mr-0 rtl:ml-1.5"></span>
                                                                {t('admin.orders.status.cancelled', 'Cancelled')}: {cancelledCount}
                                                            </Badge>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-2">
                    <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                        <ChevronLeft className="w-4 h-4" /> {t('common.previous', 'Previous')}
                    </Button>
                    <span className="text-sm text-gray-500">
                        {t('common.page', 'Page')} {page} / {totalPages}
                    </span>
                    <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                        {t('common.next', 'Next')} <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            )}
        </div>

        <Dialog open={!!archiveConfirm} onOpenChange={() => setArchiveConfirm(null)}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>{archiveConfirm?.action === 'archive' ? t('confirm.archive_store', 'Are you sure you want to archive this store?') : t('confirm.unarchive_store', 'Are you sure you want to unarchive this store?')}</DialogTitle>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setArchiveConfirm(null)}>{t('common.cancel', 'Cancel')}</Button>
                    <Button variant={archiveConfirm?.action === 'archive' ? 'destructive' : 'default'} onClick={handleConfirmAction}>{t('common.confirm', 'Confirm')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    );
}
