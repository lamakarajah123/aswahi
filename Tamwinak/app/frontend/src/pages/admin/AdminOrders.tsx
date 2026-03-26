import { useState, useEffect, useCallback } from 'react';
import { apiCall } from '@/lib/axios';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Eye, MapPin, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdminOrder } from './types';

export default function AdminOrders() {
    const { t } = useLanguage();
    const [orders, setOrders] = useState<AdminOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
    const [driverMap, setDriverMap] = useState<Record<string, string>>({});

    const loadOrders = useCallback(async (signal?: AbortSignal) => {
        try {
            setLoading(true);
            const res = await apiCall.invoke({ url: '/api/v1/grocery/admin/orders', method: 'GET', signal });
            setOrders(res.data?.items || []);
        } catch (err: any) {
            if (err?.code === 'ERR_CANCELED') return;
            console.error('[AdminOrders_Load_Error]', err);
            toast.error(t('error.load_orders', 'Failed to load orders') + (err.response?.data?.detail ? `: ${err.response.data.detail}` : ''));
        } finally {
            setLoading(false);
        }
    }, [t]);

    const loadDrivers = useCallback(async () => {
        try {
            const res = await apiCall.invoke({ url: '/api/v1/users/drivers', method: 'GET' });
            const all = res.data?.data || [];
            const m: Record<string, string> = {};
            all.forEach((d: any) => { m[d.id] = d.name || d.email; });
            setDriverMap(m);
        } catch (err) {
            console.error('Failed to load drivers for mapping', err);
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        loadOrders(controller.signal);
        loadDrivers();
        return () => controller.abort();
    }, [loadOrders, loadDrivers]);

    if (loading) return <div className="text-center py-16"><p className="text-gray-500">{t('admin.orders.loading', 'Loading orders...')}</p></div>;

    return (
        <div className="space-y-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 min-h-[50vh]">
            <div className="flex items-center mb-6">
                <h3 className="font-semibold text-lg flex items-center gap-2 text-gray-800">
                    <ShoppingBag className="w-5 h-5 text-indigo-500" /> {t('admin.orders.title', 'Platform Orders')}
                </h3>
            </div>

            {orders.length === 0 ? (
                <div className="text-center py-16 border border-gray-100 rounded-lg bg-gray-50/50">
                    <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">{t('admin.orders.no_orders', 'No orders have been placed yet.')}</p>
                </div>
            ) : (
                <div className="overflow-hidden border border-gray-200 rounded-lg shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-start text-gray-600 font-semibold tracking-wide uppercase text-[10px]">
                                    <th className="py-3 px-4 w-24 border-e border-gray-200 text-start">{t('admin.orders.id', 'Order ID')}</th>
                                    <th className="py-3 px-4 border-e border-gray-200 text-start">{t('admin.orders.store', 'Store')}</th>
                                    <th className="py-3 px-4 w-32 border-e border-gray-200 text-start">{t('admin.orders.status', 'Status')}</th>
                                    <th className="py-3 px-4 border-e border-gray-200 text-start">{t('admin.orders.driver', 'Driver')}</th>
                                    <th className="py-3 px-4 w-32 border-e border-gray-200 text-center">{t('admin.orders.total', 'Total')}</th>
                                    <th className="py-3 px-4 w-40 border-e border-gray-200 text-center">{t('admin.orders.date', 'Date')}</th>
                                    <th className="py-3 px-4 w-20 text-center">{t('admin.orders.actions', 'Actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {orders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50/80 transition-colors">
                                        <td className="py-3 px-4 font-bold text-gray-900 border-e border-gray-200 text-center" dir="ltr">#{order.id}</td>
                                        <td className="py-3 px-4 text-gray-800 font-medium border-e border-gray-200">{order.store_name}</td>
                                        <td className="py-3 px-4 border-e border-gray-200">
                                            <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider bg-slate-100 text-slate-600 shadow-none">
                                                {order.status.replace('_', ' ')}
                                            </Badge>
                                        </td>
                                        <td className="py-3 px-4 border-e border-gray-200 text-xs text-gray-600">
                                            {order.driver_id ? (driverMap[order.driver_id] || order.driver_id) : '-'}
                                        </td>
                                        <td className="py-3 px-4 font-bold text-green-600 text-center border-e border-gray-200" dir="ltr">₪{order.total.toFixed(2)}</td>
                                        <td className="py-3 px-4 text-gray-500 text-xs font-medium text-center border-e border-gray-200">
                                            {order.created_at ? new Date(order.created_at).toLocaleDateString(undefined, {
                                                year: 'numeric', month: 'short', day: 'numeric'
                                            }) : '-'}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(order)} className="h-8 w-8 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50" title={t('admin.orders.view_details', 'View Details')}>
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Order Details Dialog */}
            <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
                <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex justify-between items-center text-lg">
                            <span>{t('admin.orders.details_title', 'Order Details')} <span dir="ltr">#{selectedOrder?.id}</span></span>
                            <Badge variant="secondary" className="ltr:mr-6 rtl:ml-6 bg-slate-100 text-slate-700">
                                {selectedOrder?.status?.replace('_', ' ')}
                            </Badge>
                        </DialogTitle>
                    </DialogHeader>

                    {selectedOrder && (
                        <div className="space-y-6 py-2">
                            {/* Meta Info */}
                            <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <div>
                                    <p className="text-gray-500 text-xs mb-1">{t('admin.orders.store', 'Store')}</p>
                                    <p className="font-semibold text-gray-800">{selectedOrder.store_name}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 text-xs mb-1">{t('admin.orders.date', 'Date')}</p>
                                    <p className="font-medium text-gray-800">
                                        {selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleString() : '-'}
                                    </p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-gray-500 text-xs mb-1 flex items-center gap-1">
                                        <MapPin className="w-3 h-3" /> {t('admin.orders.delivery_address', 'Delivery Address')}
                                    </p>
                                    <p className="font-medium text-gray-800">{selectedOrder.delivery_address || t('admin.pending_users.na', 'N/A')}</p>
                                </div>
                            </div>

                            {/* Items List */}
                            <div>
                                <h4 className="font-semibold text-sm mb-3 text-gray-800 border-b pb-2">{t('admin.orders.items_title', 'Order Items')}</h4>
                                {selectedOrder.items && selectedOrder.items.length > 0 ? (
                                    <div className="space-y-3">
                                        {selectedOrder.items.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-sm border-b border-gray-100 pb-2 last:border-0 hover:bg-gray-50/50 p-1 rounded transition-colors text-start">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded text-xs font-bold text-gray-700 shadow-sm" dir="ltr">
                                                        {item.quantity}×
                                                    </span>
                                                    <div>
                                                        <p className="font-medium text-gray-800">{item.product_name}</p>
                                                        {item.customizations && item.customizations.map((stage: any, sIdx: number) => (
                                                            <div key={sIdx} className="flex flex-wrap gap-1 mt-0.5">
                                                                {stage.options.map((opt: any, oIdx: number) => (
                                                                    <span key={oIdx} className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100 font-bold">
                                                                        {opt.name}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ))}
                                                        <p className="text-xs text-gray-500 mt-1" dir="ltr">
                                                            ₪{Number(item.unit_price).toFixed(2)} / {item.unit_name || t('admin.orders.unit', 'unit')}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="font-semibold text-gray-700" dir="ltr">
                                                    ₪{Number(item.subtotal).toFixed(2)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500 italic py-3 text-center bg-gray-50 rounded-lg border border-gray-100">{t('admin.orders.no_items_details', 'No item details available.')}</p>
                                )}
                            </div>

                            {/* Totals */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-2">
                                <div className="flex justify-between text-sm text-gray-600 items-center">
                                    <span>{t('admin.orders.subtotal', 'Subtotal')}</span>
                                    <span dir="ltr">₪{(selectedOrder.subtotal || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-gray-600 items-center">
                                    <span>{t('admin.orders.delivery_fee', 'Delivery Fee')}</span>
                                    <span dir="ltr">₪{(selectedOrder.delivery_fee || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-base font-bold text-gray-900 pt-3 border-t border-gray-200 mt-2 items-center">
                                    <span>{t('admin.orders.total', 'Total')}</span>
                                    <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded" dir="ltr">₪{selectedOrder.total.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200" onClick={() => setSelectedOrder(null)}>
                            {t('admin.orders.close_details', 'Close Details')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
