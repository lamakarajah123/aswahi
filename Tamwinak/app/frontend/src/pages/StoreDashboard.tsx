import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { apiCall } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { LogIn, Plus, Store, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AppHeader } from '@/components/AppHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { StoreOrdersTab } from '@/components/store/StoreOrdersTab';
import { StoreProductsTab } from '@/components/store/StoreProductsTab';
import { MobileBottomNav } from '@/components/index/MobileBottomNav';
import { Footer } from '@/components/Footer';
import { StoreReportsTab } from '@/components/store/StoreReportsTab';
import { StoreSettingsSection } from '@/components/store/StoreSettingsSection';
import type { StoreProduct, StoreOrder, SalesReport, MyStore } from '@/types';

export default function StoreDashboard() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [myStore, setMyStore] = useState<MyStore | null>(null);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersTotalPages, setOrdersTotalPages] = useState(1);
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [storeDialog, setStoreDialog] = useState(false);

  const loadOrders = useCallback(async (p: number) => {
    try {
      const res = await apiCall.invoke({ url: `/api/v1/grocery/store/orders?page=${p}&limit=30`, method: 'GET' });
      if (res.data) {
        setOrders(Array.isArray(res.data.data) ? res.data.data : []);
        setOrdersTotalPages(res.data.totalPages ?? 1);
        setOrdersPage(p);
      }
    } catch {
      // Silently ignore
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const storeRes = await apiCall.invoke({ url: '/api/v1/grocery/store/my-store', method: 'GET' });
      const storeData = storeRes.data;
      setMyStore(storeData);

      if (storeData && storeData.id) {
        const [prodRes, ordersRes, reportRes] = await Promise.all([
          apiCall.invoke({ url: `/api/v1/store-products/${storeData.id}`, method: 'GET' }),
          apiCall.invoke({ url: '/api/v1/grocery/store/orders?page=1&limit=30', method: 'GET' }),
          apiCall.invoke({ url: '/api/v1/grocery/store/sales-report', method: 'GET' }),
        ]);
        
        setProducts(Array.isArray(prodRes?.data) ? prodRes.data : []);
        setOrders(Array.isArray(ordersRes?.data?.data) ? ordersRes.data.data : []);
        setOrdersTotalPages(ordersRes?.data?.totalPages ?? 1);
        setOrdersPage(1);
        setSalesReport(reportRes?.data || null);
      }
    } catch (err) {
      console.error('Failed to load store dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    loadData();
  }, [user, authLoading, loadData]);

  useEffect(() => {
    if (!user || !myStore) return;

    // Auto-refresh orders every 30 seconds
    const interval = setInterval(() => {
      loadOrders(ordersPage);
    }, 30000);

    return () => clearInterval(interval);
  }, [user, myStore, loadOrders, ordersPage]);

  const toggleAcceptingOrders = async () => {
    try {
      const res = await apiCall.invoke({ url: '/api/v1/grocery/store/my-store/toggle-orders', method: 'PUT' });
      setMyStore((prev) => (prev ? { ...prev, is_accepting_orders: res.data.is_accepting_orders } : prev));
      toast.success(res.data.is_accepting_orders ? 'Now accepting orders!' : 'Stopped accepting orders.');
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string | { message: string }[] } }; message?: string };
      const detail = e?.response?.data?.detail;
      const msg = Array.isArray(detail) ? detail[0]?.message : detail;
      toast.error(msg ?? e?.message ?? 'Failed to update status');
    }
  };

  const activeOrders = Array.isArray(orders)
    ? orders.filter(
        (o) =>
          o?.status &&
          !['delivered', 'cancelled', 'rejected', 'unavailable'].includes(o.status) &&
          (Number(o.subtotal) || 0) > 0,
      )
    : [];

  const historyOrders = Array.isArray(orders)
    ? orders.filter(
        (o) =>
          o?.status &&
          (['delivered', 'cancelled', 'rejected', 'unavailable'].includes(o.status) ||
            (Number(o.subtotal) || 0) <= 0),
      )
    : [];

  const reportOrders = Array.isArray(orders)
    ? orders.filter(
        (o) =>
          o?.status &&
          ['accepted', 'rejected', 'delivered', 'cancelled', 'unavailable'].includes(o.status),
      )
    : [];

  if (authLoading || (loading && !myStore)) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50/50">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 animate-spin text-green-600 mb-4 opacity-80" />
          <p className="text-gray-400 font-medium animate-pulse tracking-wide uppercase text-xs">{t('admin.settings.loading', 'Syncing Dashboard...')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center p-6 bg-[url('/grid.svg')] bg-center bg-gray-50">
        <Card className="max-w-sm w-full text-center p-10 border-0 shadow-[0_20px_50px_rgba(0,0,0,0.05)] rounded-3xl bg-white/80 backdrop-blur-xl">
          <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <LogIn className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-3 text-gray-800 tracking-tight">{t('superadmin.sign_in_required', 'Sign In Required')}</h2>
          <p className="text-gray-500 mb-8 leading-relaxed text-sm">
            {t('auth.signin_desc', 'Please sign in with your store manager account to access your products and orders.')}
          </p>
          <Button onClick={() => navigate('/login')} className="w-full bg-green-600 hover:bg-green-700 text-white rounded-2xl py-7 h-auto shadow-lg shadow-green-600/10 transition-all active:scale-[0.98] font-bold">
            {t('superadmin.sign_in_btn', 'Secure Sign In')}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AppHeader />

      <div className="flex-1 max-w-6xl mx-auto px-4 py-6">
        {!loading && !myStore ? (
          <div className="text-center py-16">
            <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              {t('store_dashboard.no_store_yet', 'No Store Yet')}
            </h3>
            <p className="text-gray-400 mb-4">
              {t('store_dashboard.create_desc', 'Create your store to start selling groceries')}
            </p>
            <Button onClick={() => setStoreDialog(true)} className="bg-green-600 hover:bg-green-700 text-white">
              <Plus className="w-4 h-4 mr-2" /> {t('store_dashboard.create_store', 'Create Store')}
            </Button>
          </div>
        ) : (
          <>
            {myStore && !myStore.is_approved && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-yellow-700 font-medium">
                  {t('store_dashboard.pending_approval', 'Your store is pending admin approval')}
                </p>
              </div>
            )}

            {myStore?.is_approved && (
              <div className="flex justify-between items-center bg-white border border-gray-200 shadow-sm rounded-lg p-4 mb-6">
                <div>
                  <h3 className="font-semibold text-gray-800">
                    {t('store_dashboard.accepting_orders', 'Accepting Orders')}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {t(
                      'store_dashboard.accepting_desc',
                      'Toggle whether your store is currently open for new orders from customers.',
                    )}
                  </p>
                </div>
                <Button
                  onClick={toggleAcceptingOrders}
                  variant={myStore?.is_accepting_orders ? 'default' : 'outline'}
                  className={
                    myStore?.is_accepting_orders
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'text-gray-600 border-gray-300'
                  }
                >
                  {myStore?.is_accepting_orders
                    ? t('store_dashboard.on_accepting', 'ON: Accepting')
                    : t('store_dashboard.off_paused', 'OFF: Paused')}
                </Button>
              </div>
            )}

            <Tabs defaultValue="orders" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="orders">{t('store_dashboard.tabs.orders', 'Orders')}</TabsTrigger>
                <TabsTrigger value="products">{t('store_dashboard.tabs.products', 'Products')}</TabsTrigger>
                <TabsTrigger value="reports">{t('store_dashboard.tabs.reports', 'Reports')}</TabsTrigger>
                <TabsTrigger value="settings">{t('store_dashboard.tabs.settings', 'Settings')}</TabsTrigger>
              </TabsList>

              {loading ? (
                <div className="space-y-4 pt-8">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-4" />
                    <p className="text-gray-500">{t('admin.settings.loading', 'Loading...')}</p>
                  </div>
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-32 w-full rounded-xl" />
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <TabsContent value="orders" className="space-y-6">
                    <StoreOrdersTab
                      activeOrders={activeOrders}
                      historyOrders={historyOrders}
                      ordersPage={ordersPage}
                      ordersTotalPages={ordersTotalPages}
                      onLoadOrders={loadOrders}
                      onRefresh={loadData}
                    />
                  </TabsContent>

                  <TabsContent value="products" className="space-y-4">
                    <StoreProductsTab products={products} onUpdated={loadData} canManagePrices={myStore?.can_manage_prices ?? false} />
                  </TabsContent>

                  <TabsContent value="reports" className="space-y-6">
                    <StoreReportsTab salesReport={salesReport} reportOrders={reportOrders} />
                  </TabsContent>

                  <TabsContent value="settings" className="space-y-4">
                    <StoreSettingsSection
                      myStore={myStore}
                      user={user}
                      createDialogOpen={storeDialog}
                      onCreateDialogClose={() => setStoreDialog(false)}
                      onSaved={loadData}
                    />
                  </TabsContent>
                </>
              )}
            </Tabs>
          </>
        )}
      </div>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
