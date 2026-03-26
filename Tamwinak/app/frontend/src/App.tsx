import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { FavoritesProvider } from './contexts/FavoritesContext';
import React, { lazy, Suspense, useEffect } from 'react';

const Index = lazy(() => import('./pages/Index'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const StorePage = lazy(() => import('./pages/StorePage'));
const CategoryPage = lazy(() => import('./pages/CategoryPage'));
const IndustryPage = lazy(() => import('./pages/IndustryPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const OffersPage = lazy(() => import('./pages/OffersPage'));
const StoreDashboard = lazy(() => import('./pages/StoreDashboard'));
const DriverDashboard = lazy(() => import('./pages/DriverDashboard'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminStores = lazy(() => import('./pages/admin/AdminStores'));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'));
const AdminProductForm = lazy(() => import('./pages/admin/AdminProductForm'));
const AdminPendingUsers = lazy(() => import('./pages/admin/AdminPendingUsers'));
const AdminDrivers = lazy(() => import('./pages/admin/AdminDrivers'));
const AdminAreas = lazy(() => import('./pages/admin/AdminAreas'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminLanguages = lazy(() => import('./pages/admin/AdminLanguages'));
const AdminIndustries = lazy(() => import('./pages/admin/AdminIndustries'));
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories'));
const AdminUnits = lazy(() => import('./pages/admin/AdminUnits'));
const AdminStoreProducts = lazy(() => import('./pages/admin/AdminStoreProducts'));
const AdminAddStore = lazy(() => import('./pages/admin/AdminAddStore'));
const AdminEditStore = lazy(() => import('./pages/admin/AdminEditStore'));
const AdminDeliveryGroups = lazy(() => import('./pages/admin/AdminDeliveryGroups'));
const SuperAdminDashboard = lazy(() => import('./pages/SuperAdminDashboard'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const AuthError = lazy(() => import('./pages/AuthError'));
const NotFound = lazy(() => import('./pages/NotFound'));
import { requestNotificationPermission } from './lib/notifications';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
});

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

const App = () => {
  useEffect(() => {
    // Request notification permissions as soon as the app loads
    requestNotificationPermission();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          <FavoritesProvider>
            <TooltipProvider>
            <Toaster />
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/category/:categoryName" element={<CategoryPage />} />
                  <Route path="/industry/:industryId" element={<IndustryPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  <Route path="/store/:storeId" element={<StorePage />} />
                  <Route path="/orders" element={<OrdersPage />} />
                  <Route path="/offers" element={<OffersPage />} />
                  <Route path="/dashboard" element={<Index />} />
                  <Route path="/store-dashboard" element={<StoreDashboard />} />
                  <Route path="/store/staff" element={<StoreDashboard />} />
                  <Route path="/driver" element={<DriverDashboard />} />
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<Navigate to="stores" replace />} />
                    <Route path="stores" element={<AdminStores />} />
                    <Route path="stores/new" element={<AdminAddStore />} />
                    <Route path="stores/:storeId/edit" element={<AdminEditStore />} />
                    <Route path="products" element={<AdminProducts />} />
                    <Route path="products/new" element={<AdminProductForm />} />
                    <Route path="products/:productId/edit" element={<AdminProductForm />} />
                    <Route path="industries" element={<AdminIndustries />} />
                    <Route path="categories" element={<AdminCategories />} />
                    <Route path="units" element={<AdminUnits />} />
                    <Route path="store-products" element={<AdminStoreProducts />} />
                    <Route path="users" element={<AdminPendingUsers />} />
                    <Route path="drivers" element={<AdminDrivers />} />
                    <Route path="areas" element={<AdminAreas />} />
                    <Route path="orders" element={<AdminOrders />} />
                    <Route path="analytics" element={<AdminAnalytics />} />
                    <Route path="languages" element={<AdminLanguages />} />
                    <Route path="settings" element={<AdminSettings />} />
                    <Route path="delivery-groups" element={<AdminDeliveryGroups />} />
                  </Route>
                  <Route path="/super-admin" element={<SuperAdminDashboard />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/auth/error" element={<AuthError />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </FavoritesProvider>
      </LanguageProvider>
    </AuthProvider>
</QueryClientProvider>
  );
};

export default App;
