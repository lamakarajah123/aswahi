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
import { ShoppingCart, Search, Package, CheckCircle, Star, MapPin, Store, ChevronRight, Loader2, X, ShoppingBag, ArrowLeft, Heart, Plus, Minus } from 'lucide-react';
import { useFavorites } from '@/contexts/FavoritesContext';
import { toast } from 'sonner';
import { AppHeader } from '@/components/AppHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Category, Industry } from '@/pages/admin/types';
import type { Product } from '@/types';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useCart } from '@/hooks/useCart';
import { CartSheetContent } from '@/components/store/CartSheetContent';
import { CheckoutDialog } from '@/components/store/CheckoutDialog';
import { AddToCartDialog } from '@/components/store/AddToCartDialog';
import { HeroSection } from '@/components/index/HeroSection';
import { SingleCategoryGrid } from '@/components/index/SingleCategoryGrid';
import { AllCategoriesView } from '@/components/index/AllCategoriesView';
import { MobileBottomNav } from '@/components/index/MobileBottomNav';
import { NearbyOffersScroll } from '@/components/index/NearbyOffersScroll';
import { NearbyStoresScroll } from '@/components/index/NearbyStoresScroll';
import { Footer } from '@/components/Footer';


export default function Index() {
  const { user } = useAuth();
  const { t, currentLanguage } = useLanguage();
  const { toggleFavorite, isFavorite } = useFavorites();
  const navigate = useNavigate();
  const location = useLocation();
  const { categoryName } = useParams<{ categoryName?: string }>();
  const activeCategory = categoryName ? decodeURIComponent(categoryName) : 'all';
  const isSingleCat = activeCategory !== 'all';

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

  const [industries, setIndustries] = useState<Industry[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryProducts, setCategoryProducts] = useState<Record<string, Product[]>>({});
  const [categoryTotals, setCategoryTotals] = useState<Record<string, number>>({});
  const [nearByStores, setNearByStores] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [indPage, setIndPage] = useState(1);
  const indLimit = 8;
  const totalIndPages = Math.ceil(industries.length / indLimit);
  const paginatedIndustries = industries.slice((indPage - 1) * indLimit, indPage * indLimit);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [cartPortalTarget, setCartPortalTarget] = useState<HTMLElement | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  const fetchHomeData = useCallback(async (lat?: number, lng?: number) => {
    try {
      setCategoriesLoading(true);
      const res = await apiCall.invoke({
        url: '/api/v1/grocery/home-data',
        method: 'GET',
        params: { lat, lng, radius: 15 },
      });
      const { 
        industries: inds,
        categories: cats, 
        productsByCategory, 
        totalsByCategory,
        nearByStores: stores,
        offers: deals
      } = res.data;
      
      if (inds) setIndustries(inds);
      setCategories(cats.filter((c: Category) => c.is_active));
      setCategoryProducts(productsByCategory);
      setCategoryTotals(totalsByCategory);
      setNearByStores(stores || []);
      setOffers(deals || []);
    } catch {
      toast.error(t('home.failed_load_products', 'Failed to load products'));
    } finally {
      setCategoriesLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchHomeData(coords?.lat, coords?.lng);
    const timerId = setTimeout(() => setCartPortalTarget(document.getElementById('cart-portal')), 100);
    return () => clearTimeout(timerId);
  }, [fetchHomeData, coords, user]);

  useEffect(() => { setSearchQuery(''); }, [location.pathname]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
        setDebouncedSearch(searchQuery.trim());
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch search results
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
  }, [debouncedSearch, coords]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('checkout') === 'true' && user) {
      setCheckoutOpen(true);
      window.history.replaceState({}, '', '/');
    }
  }, [location.search, user]);

  const handleCheckout = () => {
    if (!user) { navigate(`/login?redirect=${encodeURIComponent('/?checkout=true')}`); return; }
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
              <Package className="w-4 h-4 me-2" /> {t('checkout.view_orders', 'View Orders')}
            </Button>
            <Button variant="outline" onClick={() => { setOrderSuccess(false); clearCart(); }}>
              {t('checkout.continue_shopping', 'Continue Shopping')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AppHeader />

      {/* Cart Sheet — portaled into header */}
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

      <HeroSection locationName={locationName} onRefreshLocation={refresh} />

      <section className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
        {/* Premium Search Bar */}
        <div className="relative mb-12 max-w-2xl mx-auto">
          <div className="absolute inset-0 bg-green-100/30 blur-2xl rounded-full scale-95 opacity-0 group-focus-within:opacity-100 transition-opacity" />
          <div className="relative flex items-center bg-white rounded-[2rem] shadow-xl shadow-green-900/5 border border-gray-100 transition-all duration-300 focus-within:ring-2 focus-within:ring-green-500/20 focus-within:scale-[1.02]">
            <div className="ps-6">
              <Search className="w-5 h-5 text-green-600/60" />
            </div>
            <Input
              placeholder={t('home.search_placeholder', 'سأبحث عن...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 bg-transparent h-16 ps-3 pe-12 text-lg font-bold placeholder:text-gray-300 focus-visible:ring-0 shadow-none"
            />
            {searchQuery && (
              <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute end-6 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                  <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {debouncedSearch.length >= 2 ? (
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
                                    <h3 className="font-bold text-xs sm:text-base text-gray-800 leading-tight line-clamp-2 h-[2.5rem]" title={product.name}>
                                        {currentLanguage?.code === 'ar' && product.name_ar ? product.name_ar : product.name}
                                    </h3>
                                    <div className="mt-auto">
                                        <div className="flex items-center justify-between">
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
            <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 px-2">
                    {paginatedIndustries.map((ind) => {
                        const iconIsImage = ind.icon && (ind.icon.startsWith('http') || ind.icon.startsWith('data:'));
                        return (
                            <div
                                key={ind.id}
                                className="flex flex-col items-center gap-4 cursor-pointer group bg-white p-5 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-xl hover:border-green-300 transition-all duration-300 hover:-translate-y-1"
                                onClick={() => navigate(`/industry/${ind.id}`)}
                            >
                                <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border-4 border-gray-50 shadow-inner bg-gray-50 flex items-center justify-center transition-transform group-hover:scale-105 duration-300">
                                    {ind.image_url ? (
                                        <img src={ind.image_url} alt={ind.name} className="w-full h-full object-cover" />
                                    ) : iconIsImage ? (
                                        <img src={ind.icon!} alt={ind.name} className="w-full h-full object-cover p-6" />
                                    ) : (
                                        <span className="text-6xl">{ind.icon || '🏪'}</span>
                                    )}
                                </div>
                                
                                <div className="w-full flex items-center justify-between bg-gray-50 rounded-2xl p-3 border border-gray-100/50 group-hover:bg-green-50 transition-colors gap-2">
                                    <h3 className="font-extrabold text-gray-900 text-sm sm:text-lg leading-tight truncate px-1">
                                        {currentLanguage?.code === 'ar' && ind.name_ar ? ind.name_ar : ind.name}
                                    </h3>
                                    <div className="w-10 h-8 sm:w-12 sm:h-9 bg-green-800 rounded-full flex items-center justify-center text-white shadow-md group-hover:bg-green-700 transition-colors shrink-0">
                                        <ChevronRight className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Pagination Controls */}
                {totalIndPages > 1 && (
                  <div className="mt-12 flex items-center justify-center gap-3">
                    <Button 
                      variant="outline"
                      size="sm"
                      disabled={indPage === 1}
                      onClick={() => setIndPage(prev => prev - 1)}
                      className="h-10 px-4 rounded-xl border-gray-100 font-bold text-gray-400 hover:text-green-700 hover:border-green-100 transition-all"
                    >
                      <ArrowLeft className="w-4 h-4 me-2 rtl:rotate-180" />
                      {t('common.previous', 'السابق')}
                    </Button>
                    <div className="flex items-center gap-1">
                      {[...Array(totalIndPages)].map((_, i) => (
                        <Button
                          key={i}
                          variant={indPage === i + 1 ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setIndPage(i + 1)}
                          className={`h-10 w-10 rounded-xl font-black ${indPage === i + 1 ? 'bg-green-700 text-white' : 'text-gray-400'}`}
                        >
                          {i + 1}
                        </Button>
                      ))}
                    </div>
                    <Button 
                      variant="outline"
                      size="sm"
                      disabled={indPage === totalIndPages}
                      onClick={() => setIndPage(prev => prev + 1)}
                      className="h-10 px-4 rounded-xl border-gray-100 font-bold text-gray-400 hover:text-green-700 hover:border-green-100 transition-all"
                    >
                      {t('common.next', 'التالي')}
                      <ChevronRight className="w-4 h-4 ms-2 rtl:rotate-180" />
                    </Button>
                  </div>
                )}

                {/* Nearby Offers */}
                {!isSearching && offers.length > 0 && (
                  <div className="mt-12">
                    <NearbyOffersScroll offers={offers} onAddToCart={openAddToCart} />
                  </div>
                )}
            </>
        )}

        {/* Padding for Mobile Nav */}
        <div className="h-24 md:hidden" />
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
