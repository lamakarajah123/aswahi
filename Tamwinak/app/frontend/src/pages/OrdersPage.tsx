import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { apiCall } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Package, LogIn, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { AppHeader } from '@/components/AppHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { OrderGroupCard } from '@/components/orders/OrderGroupCard';
import { OrderTrackingDialog } from '@/components/orders/OrderTrackingDialog';
import { MobileBottomNav } from '@/components/index/MobileBottomNav';
import { OrderRatingDialog } from '@/components/orders/OrderRatingDialog';
import { OrderResolveMissingDialog } from '@/components/orders/OrderResolveMissingDialog';
import { Footer } from '@/components/Footer';
import type { Order } from '@/types';

export default function OrdersPage() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [ratingOrder, setRatingOrder] = useState<Order | null>(null);
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  const [resolvingOrder, setResolvingOrder] = useState<Order | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<{ id?: number; groupId?: string } | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (!user && !authLoading) return;
    if (!user) return;
    const controller = new AbortController();
    fetchOrders(page, controller.signal);
    return () => controller.abort();
  }, [user, authLoading, page]);

  const fetchOrders = async (p?: number, signal?: AbortSignal) => {
    const targetPage = p !== undefined ? p : page;
    try {
      setLoading(true);
      const res = await apiCall.invoke({
        url: `/api/v1/grocery/my-orders?page=${targetPage}&limit=20`,
        method: 'GET',
        signal,
      });
      const payload = res.data;
      setOrders(Array.isArray(payload?.data) ? payload.data : []);
      setTotalPages(payload?.totalPages ?? 1);
    } catch (err) {
      const e = err as { code?: string };
      if (e?.code === 'ERR_CANCELED') return;
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAction = async () => {
    if (!confirmCancel) return;
    try {
      setIsCancelling(true);
      const idToCancel = confirmCancel.groupId || confirmCancel.id;
      if (!idToCancel) return;
      await apiCall.invoke({ url: `/api/v1/grocery/orders/cancel/${idToCancel}`, method: 'POST' });
      toast.success('Order(s) cancelled successfully');
      setConfirmCancel(null);
      fetchOrders();
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string; error?: string } } };
      toast.error(e?.response?.data?.detail ?? e?.response?.data?.error ?? 'Failed to cancel order');
    } finally {
      setIsCancelling(false);
    }
  };

  const groupedOrders = useMemo(
    () =>
      orders.reduce((acc, order) => {
        const timeStr = order.created_at
          ? new Date(order.created_at).toISOString().slice(0, 16)
          : 'no-time';
        const key = order.group_id || `group-${timeStr}-${order.delivery_address}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(order);
        return acc;
      }, {} as Record<string, Order[]>),
    [orders],
  );

  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-sm w-full text-center p-8">
          <LogIn className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">{t('superadmin.sign_in_required', 'Sign In Required')}</h2>
          <p className="text-gray-500 mb-4">{t('auth.signin_desc', 'Please sign in to access your dashboard')}</p>
          <Button onClick={() => navigate('/login')} className="bg-green-600 hover:bg-green-700 text-white">
            {t('superadmin.sign_in_btn', 'Sign In')}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />

      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 w-full rounded-xl" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600">
              {t('orders.page.no_orders_yet', 'No orders yet')}
            </h3>
            <p className="text-gray-400 mb-4">
              {t('orders.page.start_shopping', 'Start shopping to see your orders here')}
            </p>
            <Button onClick={() => navigate('/')} className="bg-green-600 hover:bg-green-700 text-white">
              {t('orders.page.browse_stores', 'Browse Stores')}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedOrders).map(([key, groupOrders]) => (
              <OrderGroupCard
                key={key}
                groupKey={key}
                groupOrders={groupOrders}
                onRate={setRatingOrder}
                onTrack={setTrackingOrder}
                onCancel={setConfirmCancel}
                onResolve={setResolvingOrder}
              />
            ))}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-4 pb-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4" /> {t('common.previous', 'Previous')}
                </Button>
                <span className="text-sm text-gray-500">
                  {t('common.page', 'Page')} {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {t('common.next', 'Next')} <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <OrderRatingDialog order={ratingOrder} onClose={() => setRatingOrder(null)} />
      <OrderTrackingDialog order={trackingOrder} onClose={() => setTrackingOrder(null)} />
      <OrderResolveMissingDialog
        order={resolvingOrder}
        onClose={() => setResolvingOrder(null)}
        onResolved={() => fetchOrders()}
      />

      {/* Cancel confirmation — kept here since it calls fetchOrders on confirm */}
      <Dialog open={!!confirmCancel} onOpenChange={() => setConfirmCancel(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">{t('orders.cancel_order', 'Cancel Order')}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {t(
              'orders.cancel.message',
              'Are you sure you want to cancel this order? This action cannot be undone.',
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmCancel(null)}
              disabled={isCancelling}
            >
              {t('orders.cancel.keep_it', 'No, Keep it')}
            </Button>
            <Button
              variant="destructive"
              className="bg-red-600"
              onClick={handleCancelAction}
              disabled={isCancelling}
            >
              {isCancelling
                ? t('orders.cancel.cancelling', 'Cancelling...')
                : t('orders.cancel.yes_cancel', 'Yes, Cancel Order')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
