import { useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationBell } from '@/components/NotificationBell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Leaf, LogIn, LogOut, Package, Store, Truck, Shield, ShieldCheck, Globe, Tag, Home, Download, Heart
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useCart } from '@/hooks/useCart';
import { FavoritesDrawer } from '@/components/FavoritesDrawer';
import { AddToCartDialog } from '@/components/store/AddToCartDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppHeader({ rightElement }: { rightElement?: React.ReactNode } = {}) {
  const {
    user, logout, loading: authLoading,
    isAdmin, isSuperAdmin, isStoreOwner, isDriver,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { notifications, unreadCount, markAllRead, markOneRead } = useNotifications(!!user);
  const { t, languages, currentLanguage, setLanguage, isRTL } = useLanguage();
  const { isInstallable, installRequest } = usePWAInstall();
  const { favorites, removeFavorite, isFavorite } = useFavorites();
  const { 
    openAddToCart, confirmAddToCart, addDialogOpen, setAddDialogOpen,
    addingProduct, availableUnits, addQuantities, setAddQuantities, loadingUnits
  } = useCart({ 
    storageKey: user?.id ? `index_cart_${user.id}` : 'index_cart_guest',
    userId: user?.id
  });

  const isActive = (path: string) => location.pathname === path;

  const roleBadge = useMemo(() => {
    if (isSuperAdmin) return { label: t('nav.super_admin', 'Super Admin'), color: 'bg-purple-100 text-purple-700' };
    if (isAdmin) return { label: t('nav.admin', 'Admin'), color: 'bg-red-100 text-red-700' };
    if (isStoreOwner) return { label: t('nav.store_owner', 'Store Owner'), color: 'bg-blue-100 text-blue-700' };
    if (isDriver) return { label: t('nav.driver', 'Driver'), color: 'bg-cyan-100 text-cyan-700' };
    return null;
  }, [isSuperAdmin, isAdmin, isStoreOwner, isDriver, t]);

  return (
    <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">

        {/* ── Section 1: Logo (start side) ── */}
        <div className="flex-1 flex justify-start items-center gap-2">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-green-600 rounded-lg flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">{t('app.title', 'Aswahi')}</span>
          </Link>
          
          {isInstallable && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={installRequest}
              className="flex ml-2 border-green-200 text-green-700 hover:bg-green-50 animate-pulse px-2 h-8 rounded-full text-[10px] sm:text-xs"
            >
              <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
              <span className="hidden xs:inline">{t('nav.install_app', 'Install App')}</span>
              <span className="xs:hidden">{t('common.install', 'Install')}</span>
            </Button>
          )}
        </div>

        {/* ── Section 2: Centered Navigation ── */}
        <nav className="hidden md:flex flex-auto items-center justify-center gap-1">
          {authLoading ? (
            <div className="flex gap-2">
              <Skeleton className="w-20 h-8 rounded-md" />
              <Skeleton className="w-20 h-8 rounded-md" />
              <Skeleton className="w-20 h-8 rounded-md" />
            </div>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className={isActive('/') ? 'text-green-600 bg-green-50' : ''}
              >
                <Home className="w-4 h-4 mr-1" /> {t('nav.home', 'Home')}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/offers')}
                className={isActive('/offers') ? 'text-green-600 bg-green-50' : ''}
              >
                <Tag className="w-4 h-4 mr-1" /> {t('nav.offers', 'Offers')}
              </Button>

              {user && (
                <>
                  {(!isDriver && !isStoreOwner || isAdmin || isSuperAdmin) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => (isAdmin || isSuperAdmin) ? navigate('/admin/orders') : navigate('/orders')}
                      className={isActive('/orders') || (isActive('/admin/orders') && (isAdmin || isSuperAdmin)) ? 'text-green-600 bg-green-50' : ''}
                    >
                      <Package className="w-4 h-4 mr-1" /> {t('nav.orders', 'Orders')}
                    </Button>
                  )}

                  {isStoreOwner && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/store-dashboard')}
                      className={isActive('/store-dashboard') ? 'text-green-600 bg-green-50' : ''}
                    >
                      <Store className="w-4 h-4 mr-1" /> {t('nav.my_store', 'Store')}
                    </Button>
                  )}

                  {isDriver && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/driver')}
                      className={isActive('/driver') ? 'text-green-600 bg-green-50' : ''}
                    >
                      <Truck className="w-4 h-4 mr-1" /> {t('nav.drivers', 'Driver')}
                    </Button>
                  )}

                  {(isAdmin || isSuperAdmin) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/admin')}
                      className={isActive('/admin') ? 'text-green-600 bg-green-50' : ''}
                    >
                      <Shield className="w-4 h-4 mr-1" /> {t('nav.admin', 'Admin')}
                    </Button>
                  )}

                  {isSuperAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/super-admin')}
                      className={isActive('/super-admin') ? 'text-green-600 bg-green-50' : ''}
                    >
                      <Shield className="w-4 h-4 mr-1" /> {t('nav.system_admin', 'System')}
                    </Button>
                  )}
                </>
              )}
            </>
          )}
        </nav>

        {/* ── Section 3: User Actions (end side) ── */}
        <div className="flex-1 flex items-center justify-end gap-2">
          {/* Language Selector */}
          {languages.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="hidden sm:flex px-2 text-gray-600">
                  <Globe className="w-4 h-4 mr-1" />
                  {currentLanguage?.code?.toUpperCase() || 'AR'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {languages.map((lang) => (
                  <DropdownMenuItem
                    key={lang.id}
                    onClick={() => setLanguage(lang.code)}
                    className={currentLanguage?.code === lang.code ? 'font-bold' : ''}
                  >
                    {lang.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {!location.pathname.startsWith('/admin') && !location.pathname.startsWith('/super-admin') && (
            <div className="flex items-center gap-1">
              <FavoritesDrawer 
                favorites={favorites} 
                onRemove={removeFavorite}
                onAddToCart={(p) => openAddToCart(p)}
                isFavorite={isFavorite}
              />
              <div id="cart-portal" className="flex items-center"></div>
            </div>
          )}

          {authLoading ? (
            <Skeleton className="w-20 h-9" />
          ) : user ? (
            <>
              {/* User name + role badge */}
              <div className="hidden md:flex flex-col leading-tight items-end">
                <span className="text-sm font-semibold text-gray-800">{user.name || user.email}</span>
                {roleBadge && (
                  <Badge className={`text-[10px] px-1.5 py-0 mt-0.5 ${roleBadge.color}`}>
                    {roleBadge.label}
                  </Badge>
                )}
              </div>

              {rightElement}

              <NotificationBell
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkAllRead={markAllRead}
                onMarkOneRead={markOneRead}
              />
              <Button variant="ghost" size="icon" onClick={logout} title={t('nav.logout', 'Logout')}>
                <LogOut className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => navigate('/login')} className="bg-green-600 hover:bg-green-700 text-white">
              <LogIn className="w-4 h-4 mr-1" /> {t('nav.login', 'Sign In')}
            </Button>
          )}
        </div>

      </div>
      <AddToCartDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        product={addingProduct}
        units={availableUnits}
        quantities={addQuantities}
        onQuantityChange={(unitId, qty) => setAddQuantities(prev => ({ ...prev, [unitId]: qty }))}
        loading={loadingUnits}
        onConfirm={confirmAddToCart}
      />
    </header>
  );
}