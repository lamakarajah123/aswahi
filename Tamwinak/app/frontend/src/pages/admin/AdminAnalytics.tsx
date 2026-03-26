import { useState, useEffect, useCallback } from 'react';
import { apiCall } from '@/lib/axios';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, Package, DollarSign, Store, Clock, Users, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { Analytics } from './types';

export default function AdminAnalytics() {
    const { t } = useLanguage();
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [loading, setLoading] = useState(true);

    const loadAnalytics = useCallback(async (signal?: AbortSignal) => {
        try {
            setLoading(true);
            const res = await apiCall.invoke({ url: '/api/v1/grocery/admin/analytics', method: 'GET', signal });
            setAnalytics(res.data);
        } catch (err: any) {
            if (err?.code === 'ERR_CANCELED') return;
            console.error('[AdminAnalytics_Load_Error]', err);
            toast.error(t('error.load_analytics', 'Failed to load analytics') + (err.response?.data?.detail ? `: ${err.response.data.detail}` : ''));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        const controller = new AbortController();
        loadAnalytics(controller.signal);
        return () => controller.abort();
    }, [loadAnalytics]);

    if (loading) return <div className="text-center py-16"><p className="text-gray-500">{t('admin.analytics.loading', 'Loading analytics...')}</p></div>;
    if (!analytics) return <div className="text-center py-16"><p className="text-gray-500">{t('admin.analytics.no_data', 'No analytics data available')}</p></div>;

    return (
        <div className="space-y-6">
            {/* High Level Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
                <Card className="border-0 shadow-sm bg-blue-50/50 hover:bg-blue-50 transition-colors">
                    <CardContent className="p-5 text-center flex flex-col items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                            <Package className="w-5 h-5 text-blue-600" />
                        </div>
                        <p className="text-2xl font-black text-gray-800">{analytics.total_orders || 0}</p>
                        <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mt-1 text-center">{t('admin.analytics.total_orders', 'Total Orders')}</p>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-green-50/50 hover:bg-green-50 transition-colors">
                    <CardContent className="p-5 text-center flex flex-col items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mb-3">
                            <DollarSign className="w-5 h-5 text-green-600" />
                        </div>
                        <p className="text-2xl font-black text-green-700" dir="ltr">₪{(Number(analytics.total_revenue) || 0).toFixed(0)}</p>
                        <p className="text-[11px] uppercase tracking-wider text-green-600/70 font-bold mt-1 text-center">{t('admin.analytics.net_revenue', 'Net Revenue')}</p>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-orange-50/50 hover:bg-orange-50 transition-colors">
                    <CardContent className="p-5 text-center flex flex-col items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center mb-3">
                            <TrendingUp className="w-5 h-5 text-orange-600" />
                        </div>
                        <p className="text-2xl font-black text-orange-700" dir="ltr">₪{(Number(analytics.gross_order_value) || 0).toFixed(0)}</p>
                        <p className="text-[11px] uppercase tracking-wider text-orange-600/70 font-bold mt-1 text-center">{t('admin.analytics.gross_value', 'Gross Value')}</p>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm hover:bg-gray-50 transition-colors">
                    <CardContent className="p-5 text-center flex flex-col items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mb-3">
                            <Store className="w-5 h-5 text-purple-600" />
                        </div>
                        <p className="text-2xl font-black text-gray-800">{analytics.total_stores || 0}</p>
                        <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mt-1 text-center">{t('admin.analytics.stores', 'Stores')}</p>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm hover:bg-gray-50 transition-colors">
                    <CardContent className="p-5 text-center flex flex-col items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center mb-3">
                            <Clock className="w-5 h-5 text-yellow-600" />
                        </div>
                        <p className="text-2xl font-black text-gray-800">{analytics.pending_approvals || 0}</p>
                        <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mt-1 text-center">{t('admin.analytics.pending_approval', 'Pending Approval')}</p>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-cyan-50/50 hover:bg-cyan-50 transition-colors">
                    <CardContent className="p-5 text-center flex flex-col items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center mb-3">
                            <Users className="w-5 h-5 text-cyan-600" />
                        </div>
                        <p className="text-2xl font-black text-cyan-700">{analytics.active_drivers || 0}</p>
                        <p className="text-[11px] uppercase tracking-wider text-cyan-600/70 font-bold mt-1 text-center">{t('admin.analytics.active_drivers', 'Active Drivers')}</p>
                    </CardContent>
                </Card>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-indigo-500" /> {t('admin.analytics.reports_title', 'Business Intelligence Reports')}
                    </h3>
                    <Button variant="outline" size="sm" onClick={() => window.print()} className="bg-white hover:bg-gray-50 shadow-sm">
                        <Package className="w-4 h-4 rtl:ml-2 ltr:mr-2" /> {t('admin.analytics.download_summary', 'Download Summary')}
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border border-gray-100 shadow-sm">
                        <CardHeader className="pb-3 border-b border-gray-50 bg-gray-50/50">
                            <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-800">
                                <TrendingUp className="w-4 h-4 text-blue-500" /> {t('admin.analytics.revenue_dist', 'Revenue Distribution')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center bg-green-50 p-4 rounded-lg border border-green-100/50 gap-4">
                                    <span className="text-sm font-bold text-green-800">{t('admin.analytics.completed_delivered', 'Completed (Delivered)')}</span>
                                    <span className="text-lg font-black text-green-700 flex-shrink-0" dir="ltr">₪{(Number(analytics.total_revenue) || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-100 gap-4">
                                    <span className="text-sm font-bold text-gray-700">{t('admin.analytics.total_volume', 'Total Order Volume (Gross)')}</span>
                                    <span className="text-lg font-black text-gray-800 flex-shrink-0" dir="ltr">₪{(Number(analytics.gross_order_value) || 0).toLocaleString()}</span>
                                </div>
                                <div className="pt-3 border-t text-xs text-gray-400 font-medium flex items-start gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1 flex-shrink-0" />
                                    <span>{t('admin.analytics.gross_note', 'Gross order value includes pending, cancelled, and rejected orders.')}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border border-gray-100 shadow-sm">
                        <CardHeader className="pb-3 border-b border-gray-50 bg-gray-50/50">
                            <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-800">
                                <Check className="w-4 h-4 text-purple-500" /> {t('admin.analytics.fulfillment_matrix', 'Order Fulfillment Matrix')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="grid grid-cols-2 gap-3">
                                {analytics.orders_by_status && Object.entries(analytics.orders_by_status).map(([status, count]) => (
                                    <div key={status} className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm flex flex-col justify-between">
                                        <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">
                                            {t(`status.${status}`, status.replace('_', ' '))}
                                        </p>
                                        <p className="text-2xl font-black text-gray-800">{count}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Card className="border border-gray-100 shadow-sm overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-3 bg-gray-50/50 border-b border-gray-100">
                    <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-orange-500" /> {t('admin.analytics.recent_activity', 'Recent System Activity')}
                    </CardTitle>
                    <Badge className="bg-white text-gray-600 border border-gray-200 shadow-none hover:bg-gray-50 text-[10px] uppercase font-bold tracking-wider">{t('admin.analytics.last_10', 'Last 10 Orders')}</Badge>
                </CardHeader>
                <CardContent className="p-0">
                    {(!analytics.recent_orders || analytics.recent_orders.length === 0) ? (
                        <div className="text-center py-12 text-gray-400 text-sm font-medium bg-white">{t('admin.analytics.no_recent', 'No recent system activity recorded')}</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200 text-start text-gray-600 font-semibold tracking-wide uppercase text-[10px]">
                                        <th className="py-3 px-4 w-24 border-e border-gray-200 text-start">{t('admin.orders.id', 'Order ID')}</th>
                                        <th className="py-3 px-4 border-e border-gray-200 text-start">{t('admin.orders.store', 'Store')}</th>
                                        <th className="py-3 px-4 w-32 border-e border-gray-200 text-start">{t('admin.orders.status', 'Status')}</th>
                                        <th className="py-3 px-4 w-40 border-e border-gray-200 text-center">{t('admin.orders.date', 'Date')}</th>
                                        <th className="py-3 px-4 w-32 border-e border-gray-200 text-center">{t('admin.orders.total', 'Total')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {analytics.recent_orders.map((order) => (
                                        <tr key={order.id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="py-3 px-4 font-bold text-gray-900 border-e border-gray-200 text-center" dir="ltr">#{order.id}</td>
                                            <td className="py-3 px-4 text-gray-800 font-medium border-e border-gray-200 flex items-center gap-2">
                                                <Store className="w-3.5 h-3.5 text-gray-400" /> {order.store_name}
                                            </td>
                                            <td className="py-3 px-4 border-e border-gray-200">
                                                <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider bg-slate-100 text-slate-600 shadow-none">
                                                    {t(`status.${order.status}`, order.status.replace('_', ' '))}
                                                </Badge>
                                            </td>
                                            <td className="py-3 px-4 text-gray-500 text-xs font-medium text-center border-e border-gray-200">
                                                {order.created_at ? new Date(order.created_at).toLocaleString(undefined, {
                                                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                }) : t('admin.pending_users.na', 'N/A')}
                                            </td>
                                            <td className="py-3 px-4 font-bold text-green-600 text-center border-e border-gray-200" dir="ltr">₪{(Number(order.total) || 0).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
