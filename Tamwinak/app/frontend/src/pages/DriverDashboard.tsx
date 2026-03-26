import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { apiCall } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, Package, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { AppHeader } from '@/components/AppHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import type { AvailableOrder, Delivery } from '@/types';
import { haversineDistance } from '@/helpers/geo';
import { AvailableOrdersList } from '@/components/driver/AvailableOrdersList';
import { ActiveDeliveryPanel } from '@/components/driver/ActiveDeliveryPanel';
import { ReturnOrderDialog } from '@/components/driver/ReturnOrderDialog';
import { MapDialog } from '@/components/driver/MapDialog';
import { MobileBottomNav } from '@/components/index/MobileBottomNav';
import { Footer } from '@/components/Footer';

export default function DriverDashboard() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [availableOrders, setAvailableOrders] = useState<AvailableOrder[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [totalDeliveries, setTotalDeliveries] = useState(0);
  const [isAvailable, setIsAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [driverLat, setDriverLat] = useState(32.2211);
  const [driverLng, setDriverLng] = useState(35.2544);
  const [mapOrderInfo, setMapOrderInfo] = useState<AvailableOrder | Delivery | null>(null);
  const [returnOrderGroup, setReturnOrderGroup] = useState<number | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setDriverLat(pos.coords.latitude);
          setDriverLng(pos.coords.longitude);
        },
        () => { /* silent fallback */ },
        { enableHighAccuracy: true }
      );
    }
  }, []);

  const loadData = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);

      const statusRes = await apiCall.invoke({ url: '/api/v1/grocery/driver/status', method: 'GET', signal });
      setIsAvailable(statusRes.data?.is_available ?? true);

      const availRes = await apiCall.invoke({
        url: '/api/v1/grocery/driver/available-orders',
        method: 'GET',
        params: { lat: driverLat, lng: driverLng },
        signal,
      });
      setAvailableOrders(availRes.data || []);

      const delRes = await apiCall.invoke({ url: '/api/v1/grocery/driver/my-deliveries', method: 'GET', signal });
      setDeliveries(delRes.data?.deliveries || []);
      setTotalEarnings(delRes.data?.total_earnings || 0);
      setTotalDeliveries(delRes.data?.total_deliveries || 0);
    } catch (err: any) {
      if (err?.code === 'ERR_CANCELED') return;
    } finally {
      setLoading(false);
    }
  }, [driverLat, driverLng]);

  useEffect(() => {
    if (!user && !authLoading) return;
    if (!user) return;
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [user, authLoading, loadData]);

  const toggleAvailability = async () => {
    try {
      const newStatus = !isAvailable;
      await apiCall.invoke({ url: '/api/v1/grocery/driver/status', method: 'PUT', data: { is_available: newStatus } });
      setIsAvailable(newStatus);
      toast.success(newStatus
        ? t('driver.status.online_desc', 'You are now Online and receiving orders')
        : t('driver.status.offline_desc', 'You are now Offline'));
      if (newStatus) loadData();
      else setAvailableOrders([]);
    } catch {
      toast.error(t('common.error_occurred', 'Failed to update availability status'));
    }
  };

  const acceptOrder = async (orderId: number) => {
    try {
      await apiCall.invoke({ url: `/api/v1/grocery/driver/accept-order/${orderId}`, method: 'POST' });
      toast.success(t('driver.order_accepted', 'Order accepted!'));
      loadData();
    } catch (err: any) {
      const detail = err?.data?.detail || err?.response?.data?.detail;
      const status = err?.status || err?.response?.status;
      if (status === 409) {
        toast.error(detail || t('driver.order_already_taken', 'This order has already been taken by another driver.'));
        loadData();
      } else {
        toast.error(detail || t('common.error_occurred', 'Failed to accept order'));
      }
    }
  };

  const updateDeliveryStatus = async (orderId: number, status: string, reason?: string) => {
    try {
      await apiCall.invoke({
        url: `/api/v1/grocery/driver/orders/${orderId}/status`,
        method: 'PUT',
        data: { status, reason },
      });
      toast.success(status === 'returned'
        ? t('driver.order_returned', 'Order returned successfully')
        : t('driver.status_updated', 'Status updated to {status}').replace('{status}', status));
      if (status === 'returned') setReturnOrderGroup(null);
      loadData();
    } catch (err: any) {
      toast.error(err?.data?.detail || t('common.error_occurred', 'Failed to update status'));
    }
  };

  const calculateOptimalRoute = useCallback((orderContext: any) => {
    const isGroup = orderContext.is_group;
    const subOrders = isGroup ? orderContext.orders || [] : [orderContext];
    if (subOrders.length === 0) return [];

    let currentLat = driverLat;
    let currentLng = driverLng;

    let remainingStores = subOrders.map((o: any) => ({
      id: o.store_id || o.id,
      name: o.store_name,
      address: o.store_address || 'Store',
      lat: o.store_lat,
      lng: o.store_lng,
    })).filter((s: any) => s.lat != null && s.lng != null);

    const uniqueStoresMap = new Map();
    remainingStores.forEach((s: any) => {
      const key = `${s.lat}-${s.lng}`;
      if (!uniqueStoresMap.has(key)) uniqueStoresMap.set(key, s);
    });
    remainingStores = Array.from(uniqueStoresMap.values());

    const route = [];
    while (remainingStores.length > 0) {
      let nearestIdx = 0;
      let minDistance = Infinity;
      for (let i = 0; i < remainingStores.length; i++) {
        const store = remainingStores[i];
        const dist = haversineDistance(currentLat, currentLng, store.lat, store.lng);
        if (dist < minDistance) { minDistance = dist; nearestIdx = i; }
      }
      const nextStore = remainingStores[nearestIdx];
      route.push(nextStore);
      remainingStores.splice(nearestIdx, 1);
      currentLat = nextStore.lat;
      currentLng = nextStore.lng;
    }

    const firstOrder = subOrders[0];
    return route.concat([{
      isCustomer: true,
      name: firstOrder.customer_name || 'Customer',
      address: orderContext.delivery_address,
      lat: firstOrder.delivery_lat || orderContext.delivery_lat,
      lng: firstOrder.delivery_lng || orderContext.delivery_lng,
    }]);
  }, [driverLat, driverLng]);

  const activeTasks = useMemo(() => deliveries.filter(d => d.status !== 'delivered' && d.status !== 'returned'), [deliveries]);
  const historyTasks = useMemo(() => deliveries.filter(d => d.status === 'delivered' || d.status === 'returned'), [deliveries]);

  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-sm w-full text-center p-8">
          <LogIn className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">{t('superadmin.sign_in_required', 'Sign In Required')}</h2>
          <p className="text-gray-500 mb-4">{t('auth.signin_desc', 'Please sign in to access the driver dashboard')}</p>
          <Button onClick={() => navigate('/login')} className="bg-green-600 hover:bg-green-700 text-white">
            {t('superadmin.sign_in_btn', 'Sign In')}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AppHeader />

      <div className="flex-1 max-w-4xl mx-auto px-4 py-6">
        {/* Availability Toggle */}
        <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm mb-6 border">
          <div>
            <h3 className="font-bold text-gray-900">
              {isAvailable ? t('driver.online', 'Online') : t('driver.offline', 'Offline')}
            </h3>
            <p className="text-xs text-gray-500">
              {isAvailable
                ? t('driver.receiving_requests', 'You are receiving delivery requests')
                : t('driver.not_receiving_requests', 'You are not receiving delivery requests')}
            </p>
          </div>
          <Button
            onClick={toggleAvailability}
            variant={isAvailable ? 'destructive' : 'default'}
            className={!isAvailable ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            {isAvailable ? t('driver.go_offline', 'Go Offline') : t('driver.go_online', 'Go Online')}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <DollarSign className="w-8 h-8 text-green-500 mx-auto mb-1" />
              <p className="text-2xl font-bold" dir="ltr">₪{totalEarnings.toFixed(2)}</p>
              <p className="text-xs text-gray-500">{t('driver.total_earnings', 'Total Earnings')}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <Package className="w-8 h-8 text-blue-500 mx-auto mb-1" />
              <p className="text-2xl font-bold">{totalDeliveries}</p>
              <p className="text-xs text-gray-500">{t('driver.deliveries', 'Deliveries')}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue={activeTasks.length > 0 ? "active" : "available"} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active" className="relative">
              {t('driver.tabs.active', 'Active')}
              {activeTasks.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                  {activeTasks.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="available">
              {t('driver.tabs.available', 'Available')} ({availableOrders.length})
            </TabsTrigger>
            <TabsTrigger value="history">{t('driver.tabs.history', 'History')}</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            <ActiveDeliveryPanel
              deliveries={activeTasks}
              onUpdateStatus={updateDeliveryStatus}
              onViewMap={setMapOrderInfo}
              onReturn={setReturnOrderGroup}
            />
          </TabsContent>

          <TabsContent value="available" className="space-y-4">
            <AvailableOrdersList
              orders={availableOrders}
              loading={loading}
              isAvailable={isAvailable}
              onAccept={acceptOrder}
              onViewMap={setMapOrderInfo}
              onGoOnline={toggleAvailability}
            />
          </TabsContent>

          <TabsContent value="history" className="space-y-3">
            <ActiveDeliveryPanel
              deliveries={historyTasks}
              onUpdateStatus={updateDeliveryStatus}
              onViewMap={setMapOrderInfo}
              onReturn={setReturnOrderGroup}
            />
          </TabsContent>
        </Tabs>
      </div>

      <ReturnOrderDialog
        open={!!returnOrderGroup}
        onClose={() => setReturnOrderGroup(null)}
        onConfirm={(reason) => returnOrderGroup && updateDeliveryStatus(returnOrderGroup, 'returned', reason)}
      />

      <MapDialog
        open={!!mapOrderInfo}
        onClose={() => setMapOrderInfo(null)}
        order={mapOrderInfo}
        driverLat={driverLat}
        driverLng={driverLng}
        calculateOptimalRoute={calculateOptimalRoute}
      />
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
