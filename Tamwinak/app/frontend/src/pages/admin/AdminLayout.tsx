import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppHeader } from '@/components/AppHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { LogIn, Store, Package, Users, Truck, ShoppingBag, BarChart3, Settings, Languages, Factory, Layers, Scale, Tag, MapPin, Menu } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { MobileBottomNav } from '@/components/index/MobileBottomNav';
import { Footer } from '@/components/Footer';

export default function AdminLayout() {
    const { user, loading: authLoading } = useAuth();
    const { t, isRTL } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        if (searchParams.get('menu') === 'true') {
            setIsMobileMenuOpen(true);
            // Optionally, remove the query param so refreshing doesn't keep opening it
            navigate(location.pathname, { replace: true });
        }
    }, [location.search, location.pathname, navigate]);

    if (!authLoading && !user) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <Card className="max-w-sm w-full text-center p-8">
                    <LogIn className="w-12 h-12 text-green-600 mx-auto mb-4" />
                    <h2 className="text-xl font-bold mb-2">{t('auth.signin_required', 'Sign In Required')}</h2>
                    <p className="text-gray-500 mb-4">{t('auth.signin_desc', 'Please sign in to access the admin panel')}</p>
                    <Button onClick={() => navigate('/login')} className="bg-green-600 hover:bg-green-700 text-white">{t('auth.signin_button', 'Sign In')}</Button>
                </Card>
            </div>
        );
    }

    const navItems = [
        { label: t('nav.stores', 'Stores'), path: 'stores', icon: <Store className="w-5 h-5" /> },
        { label: t('nav.products', 'Products'), path: 'products', icon: <Package className="w-5 h-5" /> },
        { label: t('nav.industries', 'Industries'), path: 'industries', icon: <Factory className="w-5 h-5" /> },
        { label: t('nav.categories', 'Categories'), path: 'categories', icon: <Tag className="w-5 h-5" /> },
        { label: t('nav.units', 'Units'), path: 'units', icon: <Scale className="w-5 h-5" /> },
        { label: t('nav.store_products', 'Store Products'), path: 'store-products', icon: <Layers className="w-5 h-5" /> },
        { label: t('nav.users', 'Users'), path: 'users', icon: <Users className="w-5 h-5" /> },
        { label: t('nav.drivers', 'Drivers'), path: 'drivers', icon: <Truck className="w-5 h-5" /> },
        { label: t('nav.areas', 'Delivery Areas'), path: 'areas', icon: <MapPin className="w-5 h-5" /> },
        { label: t('nav.orders', 'Orders'), path: 'orders', icon: <ShoppingBag className="w-5 h-5" /> },
        { label: t('nav.analytics', 'Analytics'), path: 'analytics', icon: <BarChart3 className="w-5 h-5" /> },
        { label: t('nav.languages', 'Languages'), path: 'languages', icon: <Languages className="w-5 h-5" /> },
        { label: t('nav.settings', 'Settings'), path: 'settings', icon: <Settings className="w-5 h-5" /> },
        { label: 'مجموعات التوصيل', path: 'delivery-groups', icon: <Layers className="w-5 h-5" /> },
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col pb-24 md:pb-0">
            <AppHeader />

            <div className="max-w-[1400px] w-full mx-auto px-4 py-6 flex-1 flex flex-col md:flex-row gap-6">
                
                {/* Mobile Menu Trigger */}
                <div className="md:hidden mb-2">
                    <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                        <SheetTrigger asChild>
                            <Button variant="outline" className="w-full flex items-center justify-between text-gray-700 h-14 bg-white shadow-sm border-gray-200">
                                <span className="font-bold flex items-center gap-2">
                                    <Menu className="w-5 h-5 text-green-600" />
                                    {t('nav.admin', 'Admin Panel')}
                                </span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side={isRTL ? 'right' : 'left'} className="w-full sm:w-[350px] p-0 flex flex-col pt-12 z-[100]">
                            <SheetHeader className="px-6 pb-4 border-b">
                                <SheetTitle className="text-start text-xl font-bold">{t('nav.admin', 'Admin Panel')}</SheetTitle>
                            </SheetHeader>
                            <nav className="flex-1 overflow-y-auto flex flex-col p-4 space-y-1">
                                {navItems.map((item) => (
                                    <NavLink
                                        key={item.path}
                                        to={`/admin/${item.path}`}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={({ isActive }) =>
                                            `flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-colors ${isActive
                                                ? 'bg-green-50 text-green-700 shadow-sm border border-green-100'
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
                                            }`
                                        }
                                    >
                                        {item.icon}
                                        {item.label}
                                    </NavLink>
                                ))}
                            </nav>
                        </SheetContent>
                    </Sheet>
                </div>

                {/* Desktop Sidebar Menu */}
                <aside className="hidden md:block w-64 shrink-0">
                    <Card className="border-0 shadow-sm overflow-hidden sticky top-24">
                        <nav className="flex flex-col p-2 max-h-[calc(100vh-120px)] overflow-y-auto">
                            {navItems.map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={`/admin/${item.path}`}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive
                                            ? 'bg-green-50 text-green-700 shadow-sm'
                                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                        }`
                                    }
                                >
                                    {item.icon}
                                    {item.label}
                                </NavLink>
                            ))}
                        </nav>
                    </Card>
                </aside>

                {/* Left Content Area */}
                <main className="flex-1 min-w-0">
                    <Outlet />
                </main>
            </div>
            <Footer />
            <MobileBottomNav />
        </div>
    );
}
