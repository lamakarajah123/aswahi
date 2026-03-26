import { Store, Package, ShoppingCart, Truck, User, LayoutDashboard, Factory, Tag, Scale, Layers, Users, MapPin, ShoppingBag, BarChart3, Languages, Settings, Home } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import { useState } from 'react';

export function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, isRTL } = useLanguage();
  const { user, isAdmin, isSuperAdmin, isStoreOwner, isDriver } = useAuth();
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;
  const isSysAdmin = isAdmin || isSuperAdmin;

  const adminNavItems = [
    { label: t('nav.stores', 'Stores'), path: '/admin/stores', icon: <Store className="w-5 h-5" /> },
    { label: t('nav.products', 'Products'), path: '/admin/products', icon: <Package className="w-5 h-5" /> },
    { label: t('nav.industries', 'Industries'), path: '/admin/industries', icon: <Factory className="w-5 h-5" /> },
    { label: t('nav.categories', 'Categories'), path: '/admin/categories', icon: <Tag className="w-5 h-5" /> },
    { label: t('nav.units', 'Units'), path: '/admin/units', icon: <Scale className="w-5 h-5" /> },
    { label: t('nav.store_products', 'Store Products'), path: '/admin/store-products', icon: <Layers className="w-5 h-5" /> },
    { label: t('nav.users', 'Users'), path: '/admin/users', icon: <Users className="w-5 h-5" /> },
    { label: t('nav.drivers', 'Drivers'), path: '/admin/drivers', icon: <Truck className="w-5 h-5" /> },
    { label: t('nav.areas', 'Delivery Areas'), path: '/admin/areas', icon: <MapPin className="w-5 h-5" /> },
    { label: t('nav.orders', 'Orders'), path: '/admin/orders', icon: <ShoppingBag className="w-5 h-5" /> },
    { label: t('nav.analytics', 'Analytics'), path: '/admin/analytics', icon: <BarChart3 className="w-5 h-5" /> },
    { label: t('nav.languages', 'Languages'), path: '/admin/languages', icon: <Languages className="w-5 h-5" /> },
    { label: t('nav.settings', 'Settings'), path: '/admin/settings', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] sm:hidden z-40">
      <div className="flex items-center justify-around py-3">
        <NavLink 
          to="/"
          className={({ isActive }) => `flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-green-600 font-medium' : 'text-gray-400'}`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px]">{t('nav.home', 'Home')}</span>
        </NavLink>

        <NavLink 
          to="/offers"
          className={({ isActive }) => `flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-green-600 font-medium' : 'text-gray-400'}`}
        >
          <Tag className="w-5 h-5" />
          <span className="text-[10px]">{t('nav.offers', 'Offers')}</span>
        </NavLink>

        {(!isDriver && !isStoreOwner || isSysAdmin) && (
          <NavLink 
            to={isSysAdmin ? '/admin/orders' : '/orders'}
            className={({ isActive }) => `flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-green-600 font-medium' : 'text-gray-400'}`}
          >
            <Package className="w-5 h-5" />
            <span className="text-[10px]">{t('nav.orders', 'Orders')}</span>
          </NavLink>
        )}

        {isStoreOwner && (
          <NavLink 
            to="/store-dashboard"
            className={({ isActive }) => `flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-green-600 font-medium' : 'text-gray-400'}`}
          >
            <Store className="w-5 h-5" />
            <span className="text-[10px]">{t('nav.my_store_mobile', 'My Store')}</span>
          </NavLink>
        )}

        {isDriver && (
          <NavLink 
            to="/driver"
            className={({ isActive }) => `flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-green-600 font-medium' : 'text-gray-400'}`}
          >
            <Truck className="w-5 h-5" />
            <span className="text-[10px]">{t('nav.driver_mobile', 'Driver')}</span>
          </NavLink>
        )}

        {isSysAdmin && (
          <Sheet open={isAdminMenuOpen} onOpenChange={setIsAdminMenuOpen}>
            <SheetTrigger asChild>
              <button 
                className={`flex flex-col items-center gap-1 transition-colors ${location.pathname.startsWith('/admin') ? 'text-green-600 font-medium' : 'text-gray-400'}`}
              >
                <LayoutDashboard className="w-5 h-5" />
                <span className="text-[10px]">{t('nav.admin_panel', 'Admin')}</span>
              </button>
            </SheetTrigger>
            <SheetContent side={isRTL ? 'right' : 'left'} className="w-[300px] sm:w-[350px] p-0 flex flex-col pt-12 z-[110]">
              <SheetHeader className="px-6 pb-4 border-b">
                <SheetTitle className="text-start text-xl font-bold flex items-center gap-2">
                  <LayoutDashboard className="w-5 h-5 text-green-600" />
                  {t('nav.admin_panel_full', 'Admin Panel')}
                </SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto p-4 flex flex-col space-y-1">
                {adminNavItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsAdminMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-colors ${isActive
                        ? 'bg-green-50 text-green-700 shadow-sm border border-green-100'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
                      }`
                    }
                  >
                    <div className={`${location.pathname === item.path ? 'text-green-600' : 'text-gray-400'}`}>
                      {item.icon}
                    </div>
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        )}

      </div>
    </nav>
  );
}
