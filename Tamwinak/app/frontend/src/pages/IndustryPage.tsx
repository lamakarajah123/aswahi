import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { apiCall } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ShoppingCart, Search, Package, CheckCircle, MapPin, ChevronRight, ArrowLeft, Loader2, X, ShoppingBag, Heart, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { AppHeader } from '@/components/AppHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import type { Category, Industry } from '@/pages/admin/types';
import type { Product } from '@/types';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useCart } from '@/hooks/useCart';
import { CartSheetContent } from '@/components/store/CartSheetContent';
import { CheckoutDialog } from '@/components/store/CheckoutDialog';
import { AddToCartDialog } from '@/components/store/AddToCartDialog';
import { HeroSection } from '@/components/index/HeroSection';
import { AllCategoriesView } from '@/components/index/AllCategoriesView';
import { MobileBottomNav } from '@/components/index/MobileBottomNav';
import { NearbyOffersScroll } from '@/components/index/NearbyOffersScroll';
import { Footer } from '@/components/Footer';

export default function IndustryPage() {
  const { user } = useAuth();
  const { t, currentLanguage } = useLanguage();
  const { toggleFavorite, isFavorite } = useFavorites();
  const navigate = useNavigate();
  const location = useLocation();
  const { industryId } = useParams<{ industryId: string }>();
  const id = parseInt(industryId || '0');

  const { coords, locationName, refresh } = useGeolocation();

  const {
    cart, cartTotal, cartCount, cartMap,
    openAddToCart, confirmAddToCart, updateQuantity, quickUpdate, removeItem, clearCart,
    addingProduct, availableUnits,
    addQuantities, setAddQuantities, addDialogOpen, setAddDialogOpen, loadingUnits,
  } = useCart({ 
    storageKey: user?.id ? `index_cart_${user.id}` : 'index_cart_guest',
    userId: user?.id
  });

  const [industryName, setIndustryName] = useState('');
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [catPage, setCatPage] = useState(1);
  const catLimit = 8;
  const totalCatPages = Math.ceil(categories.length / catLimit);
  const paginatedCategories = categories.slice((catPage - 1) * catLimit, catPage * catLimit);
  const [categoryProducts, setCategoryProducts] = useState<Record<string, Product[]>>({});
  const [categoryTotals, setCategoryTotals] = useState<Record<string, number>>({});
  const [offers, setOffers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [cartPortalTarget, setCartPortalTarget] = useState<HTMLElement | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  const fetchIndustryData = useCallback(async (lat?: number, lng?: number) => {
    try {
      setCategoriesLoading(true);
      const res = await apiCall.invoke({
        url: '/api/v1/grocery/home-data',
        method: 'GET',
        params: { lat, lng, radius: 15, industry_id: id },
      });
      const { 
        industries: inds,
        categories: cats, 
        productsByCategory, 
        totalsByCategory,
        offers: deals
      } = res.data;
      
      const currentInd = (inds as Industry[]).find(i => i.id === id);
      if (currentInd) {
          const name = (currentLanguage?.code === 'ar' && (currentInd.name_ar || currentInd.name_ar)) ? currentInd.name_ar : currentInd.name;
          setIndustryName(name);
      }
      
      setCategories(cats.filter((c: Category) => c.is_active));
      setCategoryProducts(productsByCategory);
      setCategoryTotals(totalsByCategory);
      setOffers(deals || []);
    } catch {
      toast.error(t('home.failed_load_products', 'Failed to load products'));
    } finally {
      setCategoriesLoading(false);
    }
  }, [id, t, currentLanguage]);

  useEffect(() => {
    fetchIndustryData(coords?.lat, coords?.lng);
    const timerId = setTimeout(() => setCartPortalTarget(document.getElementById('cart-portal')), 100);
    return () => clearTimeout(timerId);
  }, [fetchIndustryData, coords, user]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
        setDebouncedSearch(searchQuery.trim());
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch search results (within industry scope)
  useEffect(() => {
    const searchProducts = async () => {
        if (debouncedSearch.length < 1) {
            setSearchResults([]);
            return;
        }
        try {
            setSearchLoading(true);
            const res = await apiCall.invoke({
                url: '/api/v1/grocery/nearby-products',
                method: 'GET',
                params: {
                    lat: coords?.lat,
                    lng: coords?.lng,
                    radius: 15,
                    search: debouncedSearch,
                    industry_id: id,
                    limit: 30
                }
            });
            setSearchResults(res.data.items || res.data || []);
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setSearchLoading(false);
        }
    };
    searchProducts();
  }, [debouncedSearch, coords, id]);

  const handleCheckout = () => {
    if (!user) { navigate(`/login?redirect=${encodeURIComponent(`${location.pathname}?checkout=true`)}`); return; }
    setCheckoutOpen(true);
  };

  const isSearching = searchQuery.trim().length > 0;
  const groupedSearchResults = useMemo<Record<string, Product[]>>(() => {
    if (!isSearching) return {};
    const q = searchQuery.toLowerCase().trim();
    const result: Record<string, Product[]> = {};
    Object.entries(categoryProducts).forEach(([cat, items]) => {
      const matched = items.filter(p => p.name.toLowerCase().includes(q));
      if (matched.length > 0) result[cat] = matched;
    });
    return result;
  }, [isSearching, searchQuery, categoryProducts]);

  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('checkout.success_title', 'Order Placed!')}</h2>
          <p className="text-gray-500 mb-6">{t('checkout.success_desc', 'Your order has been placed successfully.')}</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate('/orders')} className="bg-green-600 hover:bg-green-700 text-white">
               {t('checkout.view_orders', 'View Orders')}
            </Button>
            <Button variant="outline" onClick={() => { setOrderSuccess(false); clearCart(); navigate('/'); }}>
              {t('checkout.continue_shopping', 'Go Home')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AppHeader />

      {cartPortalTarget && createPortal(
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="relative text-gray-600 hover:text-green-600">
              <ShoppingCart className="w-5 h-5 me-1" />
              <span className="hidden sm:inline">{t('cart.title', 'Cart')}</span>
              {cartCount > 0 && (
                <Badge className="absolute -top-1 -end-1 bg-green-600 text-white text-[10px] w-4 h-4 flex items-center justify-center p-0 rounded-full border-2 border-white">
                  {cartCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>{t('cart.title', 'Shopping Cart')}</SheetTitle>
            </SheetHeader>
            <CartSheetContent
              cart={cart}
              cartTotal={cartTotal}
              onUpdateQuantity={updateQuantity}
              onRemoveItem={removeItem}
              onClearCart={clearCart}
              onCheckout={handleCheckout}
            />
          </SheetContent>
        </Sheet>,
        cartPortalTarget
      )}


      {/* Modern Fixed Sub-Header for Industry Name & Search */}
      <div className="bg-white/80 backdrop-blur-md border-b sticky top-[64px] z-30 px-4 py-3 sm:py-4">
        <div className="max-w-7xl mx-auto flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => navigate('/')}
                  className="rounded-full hover:bg-gray-100 h-9 w-9 text-gray-500"
              >
                  <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
              </Button>
              <div className="flex flex-col">
                  <h1 className="text-lg sm:text-2xl font-black text-gray-900 leading-tight">
                    {industryName}
                  </h1>
                  <span className="text-[10px] sm:text-xs font-bold text-green-600 uppercase tracking-widest">
                      {currentLanguage?.code === 'ar' ? 'تصفح الأقسام' : 'Browse Categories'}
                  </span>
              </div>
            </div>
          </div>

          {/* Premium Search Input */}
          <div className="relative group mx-auto w-full">
            <div className="absolute inset-0 bg-green-100/20 blur-xl rounded-full scale-95 opacity-0 group-focus-within:opacity-100 transition-opacity" />
            <div className="relative flex items-center bg-gray-50/80 rounded-2xl shadow-sm border border-gray-100 transition-all duration-300 focus-within:ring-2 focus-within:ring-green-500/20 focus-within:bg-white focus-within:scale-[1.01]">
                <div className="ps-4">
                    <Search className="w-4 h-4 text-green-600/60" />
                </div>
                <Input
                    placeholder={t('home.search_placeholder', 'سأبحث عن...')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="border-0 bg-transparent h-12 ps-2 pe-10 text-sm font-bold placeholder:text-gray-400 focus-visible:ring-0 shadow-none w-full"
                />
                {searchQuery && (
                <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute end-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/50 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
                )}
            </div>
          </div>
        </div>
      </div>

      <section className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">

        {debouncedSearch.length >= 1 ? (
            <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                        {t('search.results_for', 'نتائج البحث عن')}: <span className="text-green-600">"{debouncedSearch}"</span>
                    </h2>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        {searchResults.length} {t('common.items', 'items')}
                    </span>
                </div>
                
                {searchLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 text-green-600">
                        <Loader2 className="w-10 h-10 animate-spin" />
                        <span className="font-bold animate-pulse">{t('common.searching', 'جاري البحث...')}</span>
                    </div>
                ) : searchResults.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-gray-200">
                        <Package className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-900">{t('search.no_results', 'لا توجد نتائج')}</h3>
                        <p className="text-gray-500 mt-2">{t('search.no_results_desc', 'جرب البحث بكلمات أخرى')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 px-1">
                        {searchResults.map((product) => (
                            <Card 
                                key={product.id} 
                                className="overflow-hidden border-0 shadow-sm md:hover:shadow-lg transition-all duration-300 rounded-[2rem] flex flex-col bg-white group ring-1 ring-gray-100/50"
                            >
                                <div className="relative aspect-square overflow-hidden bg-gray-50 flex items-center justify-center p-3">
                                    <img
                                        src={product.image_url || 'https://mgx-backend-cdn.metadl.com/generate/images/773620/2026-02-25/4fce97cc-f8f8-45d1-bdac-e81381d14b3a.png'}
                                        alt={product.name}
                                        className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700 cursor-pointer"
                                        onClick={() => openAddToCart(product)}
                                    />
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => { e.stopPropagation(); toggleFavorite(product); }}
                                      className="absolute top-3 left-3 h-8 w-8 rounded-full bg-white/80 backdrop-blur-sm border border-gray-100 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-white transition-all shadow-sm"
                                    >
                                      <Heart className={`w-4 h-4 ${isFavorite(product.id) ? 'fill-red-500 text-red-500' : ''}`} />
                                    </Button>
                                    {cartMap[product.id] > 0 && (
                                        <div className="absolute top-4 right-4 bg-green-600 text-white rounded-full h-6 min-w-[1.5rem] px-1.5 flex items-center justify-center text-[10px] font-bold shadow-md">
                                            {cartMap[product.id]}
                                        </div>
                                    )}
                                </div>
                                <CardContent className="px-4 py-4 flex flex-col flex-1 gap-2">
                                    <h3 className="font-bold text-sm sm:text-base text-gray-800 leading-tight line-clamp-2 h-[2.5rem]">
                                        {currentLanguage?.code === 'ar' && product.name_ar ? product.name_ar : product.name}
                                    </h3>
                                    <div className="mt-auto">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="text-lg font-black text-gray-900">
                                                ₪{Number(product.price).toFixed(2)}
                                            </div>
                                            {product.unit && (
                                                <span className="text-[10px] font-bold text-gray-400 uppercase">
                                                    {currentLanguage?.code === 'ar' ? (t('common.per', 'لكل')) + ' ' + product.unit : `/ ${product.unit}`}
                                                </span>
                                            )}
                                        </div>

                                        {(() => {
                                            const productItems = cart.filter(c => c.product.id === product.id);
                                            if (productItems.length === 1) {
                                                const item = productItems[0];
                                                return (
                                                    <div className="flex items-center justify-between mt-2 h-10 bg-gray-50 rounded-xl px-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-lg text-gray-400 hover:text-red-500 hover:bg-white"
                                                            onClick={() => quickUpdate(product.id, -1)}
                                                        >
                                                            <Minus className="w-4 h-4" />
                                                        </Button>
                                                        <span className="font-black text-gray-900">{item.quantity}</span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-lg text-gray-400 hover:text-green-600 hover:bg-white"
                                                            onClick={() => quickUpdate(product.id, 1)}
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                );
                                            }
                                            return (
                                                <Button
                                                    size="sm"
                                                    className="w-full mt-2 bg-green-700 hover:bg-green-800 text-white rounded-xl h-10"
                                                    onClick={() => openAddToCart(product)}
                                                >
                                                    <ShoppingCart className="w-4 h-4 me-2" />
                                                    {t('common.add', 'أضف')}
                                                </Button>
                                            );
                                        })()}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        ) : (
            <div className="mb-10 min-h-[400px]">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 px-1 pb-4">
                    {paginatedCategories.map((cat) => {
                        const iconIsImage = cat.icon && (cat.icon.startsWith('http') || cat.icon.startsWith('data:'));
                        return (
                            <div
                                key={cat.id}
                                className="flex flex-col items-center gap-4 cursor-pointer group bg-white p-5 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-xl hover:border-green-300 transition-all duration-300 hover:-translate-y-1"
                                onClick={() => navigate(`/category/${encodeURIComponent(cat.name)}`)}
                            >
                                <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-gray-50 shadow-inner bg-gray-50 flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105 duration-300">
                                    {iconIsImage ? (
                                        <img src={cat.icon!} alt={cat.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-6xl">{cat.icon || '🛒'}</span>
                                    )}
                                </div>
                                
                                <div className="w-full flex items-center justify-between bg-gray-50 rounded-2xl p-3 border border-gray-100/50 group-hover:bg-green-50 transition-colors gap-2">
                                    <h4 className="font-extrabold text-gray-900 text-sm sm:text-lg leading-tight truncate px-1">
                                        {currentLanguage?.code === 'ar' && cat.name_ar ? cat.name_ar : cat.name}
                                    </h4>
                                    <div className="w-10 h-8 sm:w-12 sm:h-9 bg-green-800 rounded-full flex items-center justify-center text-white shadow-md group-hover:bg-green-700 transition-colors shrink-0">
                                        <ChevronRight className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Pagination Controls */}
                {totalCatPages > 1 && (
                  <div className="mt-12 flex items-center justify-center gap-3">
                    <Button 
                      variant="outline"
                      size="sm"
                      disabled={catPage === 1}
                      onClick={() => { setCatPage(prev => prev - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className="h-10 px-4 rounded-xl border-gray-100 font-bold text-gray-400 hover:text-green-700 hover:border-green-100 transition-all"
                    >
                      <ArrowLeft className="w-4 h-4 me-2 rtl:rotate-180" />
                      {t('common.previous', 'السابق')}
                    </Button>
                    <div className="flex items-center gap-1">
                      {[...Array(totalCatPages)].map((_, i) => (
                        <Button
                          key={i}
                          variant={catPage === i + 1 ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setCatPage(i + 1)}
                          className={`h-10 w-10 rounded-xl font-black ${catPage === i + 1 ? 'bg-green-700 text-white' : 'text-gray-400'}`}
                        >
                          {i + 1}
                        </Button>
                      ))}
                    </div>
                    <Button 
                      variant="outline"
                      size="sm"
                      disabled={catPage === totalCatPages}
                      onClick={() => { setCatPage(prev => prev + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className="h-10 px-4 rounded-xl border-gray-100 font-bold text-gray-400 hover:text-green-700 hover:border-green-100 transition-all"
                    >
                      {t('common.next', 'التالي')}
                      <ChevronRight className="w-4 h-4 ms-2 rtl:rotate-180" />
                    </Button>
                  </div>
                )}
            </div>
        )}
      </section>

      <Footer />
      {user && <MobileBottomNav />}

      <CheckoutDialog
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        cart={cart}
        cartTotal={cartTotal}
        onSuccess={() => { clearCart(); setOrderSuccess(true); }}
      />

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
    </div>
  );
}
