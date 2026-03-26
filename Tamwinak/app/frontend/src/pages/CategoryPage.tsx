import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { apiCall } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Package, Loader2, Plus, ShoppingCart, Info, Search, X, ChevronRight, Heart, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { AppHeader } from '@/components/AppHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { MobileBottomNav } from '@/components/index/MobileBottomNav';
import { AddToCartDialog } from '@/components/store/AddToCartDialog';
import { useCart } from '@/hooks/useCart';
import type { Product } from '@/types';
import type { Category } from '@/pages/admin/types';

const PRODUCE_IMG = 'https://mgx-backend-cdn.metadl.com/generate/images/773620/2026-02-25/4fce97cc-f8f8-45d1-bdac-e81381d14b3a.png';
const PAGE_SIZE = 20;
const DEFAULT_LAT = 32.2211;
const DEFAULT_LNG = 35.2544;

export default function CategoryPage() {
  const { t, currentLanguage } = useLanguage();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { categoryName } = useParams<{ categoryName: string }>();

  const decodedCategory = decodeURIComponent(categoryName ?? '');

  // Cart
  const {
    cart, cartCount, cartMap,
    openAddToCart, confirmAddToCart, updateQuantity, quickUpdate, 
    addingProduct, availableUnits, addQuantities, setAddQuantities,
    addDialogOpen, setAddDialogOpen, loadingUnits,
  } = useCart({ 
    storageKey: user?.id ? `index_cart_${user.id}` : 'index_cart_guest',
    userId: user?.id
  });

  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [categoryInfo, setCategoryInfo] = useState<Category | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Resolve location once
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setCoords({ lat: DEFAULT_LAT, lng: DEFAULT_LNG })
      );
    } else {
      setCoords({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
    }

    // Fetch categories to get the Arabic name
    apiCall.invoke({ url: '/api/v1/categories', method: 'GET' }).then(res => {
      const all: Category[] = Array.isArray(res.data) ? res.data : [];
      const found = all.find(c => c.name === decodedCategory);
      if (found) setCategoryInfo(found);
    }).catch(() => {});
  }, [decodedCategory]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
        setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchPage = useCallback(async (pageNum: number, currentCoords: { lat: number; lng: number }, query: string = '') => {
    try {
      const response = await apiCall.invoke({
        url: '/api/v1/grocery/nearby-products',
        method: 'GET',
        params: {
          lat: currentCoords.lat,
          lng: currentCoords.lng,
          radius: 15,
          category: decodedCategory,
          search: query || undefined,
          page: pageNum,
          limit: PAGE_SIZE,
        },
      });
      return response.data as { items: Product[]; pages: number };
    } catch {
      toast.error(t('home.failed_load_products', 'Failed to load products'));
      return null;
    }
  }, [decodedCategory, t]);

  // Load page 1
  useEffect(() => {
    if (!coords) return;
    setInitialLoading(true);
    if (debouncedQuery.length < 1 && searchQuery.length > 0) { // Only clear if user typed something and then deleted it
      setProducts([]);
      setTotalPages(1); // Reset total pages to 1 when no search results
      setPage(1);
      setInitialLoading(false);
      return;
    }
    fetchPage(1, coords, debouncedQuery).then((data) => {
      if (!data) {
        setProducts([]);
        setTotalPages(1);
        setPage(1);
        setInitialLoading(false);
        return;
      }
      setProducts(data.items);
      setTotalPages(data.pages);
      setPage(1);
      setInitialLoading(false);
    });
  }, [coords, fetchPage, debouncedQuery, searchQuery]); // Added searchQuery to dependencies to handle immediate clear

  // Handle Page Change
  const handlePageChange = (newPage: number) => {
    if (!coords || newPage < 1 || newPage > totalPages) return;
    setInitialLoading(true);
    setPage(newPage);
    fetchPage(newPage, coords, debouncedQuery).then((data) => {
      if (data) {
        setProducts(data.items);
        setTotalPages(data.pages);
      }
      setInitialLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AppHeader />

      {/* Modern Fixed Sub-Header for Category Name & Search */}
      <div className="bg-white/80 backdrop-blur-md border-b sticky top-[64px] z-30 px-4 py-3 sm:py-4">
        <div className="max-w-7xl mx-auto flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => navigate(-1)}
                  className="rounded-full hover:bg-gray-100 h-9 w-9 text-gray-500"
              >
                  <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
              </Button>
              <div className="flex flex-col">
                  <h1 className="text-lg sm:text-2xl font-black text-gray-900 leading-tight">
                    {currentLanguage?.code === 'ar' && categoryInfo?.name_ar ? categoryInfo.name_ar : decodedCategory}
                  </h1>
                  {!initialLoading && (
                  <span className="text-[10px] sm:text-xs font-medium text-green-600 uppercase tracking-wider">
                      {products.length} {t('category.items', 'products')}
                  </span>
                  )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
                {cartCount > 0 && (
                    <Button
                        variant="default"
                        size="sm"
                        onClick={() => navigate('/?checkout=true')}
                        className="bg-green-600 hover:bg-green-700 text-white rounded-full px-4 h-9 font-bold shadow-md animate-in slide-in-from-right-4 duration-300"
                    >
                        <ShoppingCart className="w-4 h-4 me-2" />
                        <span>{cartCount}</span>
                    </Button>
                )}
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

      <main className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full">
        {initialLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-3">
                <Skeleton className="h-32 sm:h-40 w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex justify-between items-center mt-auto pt-2">
                    <Skeleton className="h-5 w-1/4" />
                    <Skeleton className="h-8 w-16 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 px-6 bg-white rounded-3xl border border-dashed border-gray-200 shadow-sm flex flex-col items-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                <Package className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">{t('home.no_products', 'No products found')}</h3>
            <p className="text-gray-500 max-w-xs mx-auto mt-2 mb-8 leading-relaxed">
                {t('home.no_products_desc', 'There are no products matching your location and selected category.')}
            </p>
            <Button 
                className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-8" 
                onClick={() => navigate('/')}
            >
                {t('common.go_home', 'Explore More')}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
            {products.map((product) => {
              const inCartCount = cartMap[product.id] || 0;
              return (
                <Card 
                    key={product.id} 
                    className="overflow-hidden border-0 shadow-sm md:hover:shadow-lg transition-all duration-300 rounded-[2rem] flex flex-col bg-white group ring-1 ring-gray-100/50"
                >
                  <div className="relative aspect-square overflow-hidden bg-gray-50 flex items-center justify-center p-3">
                    <img
                      src={product.image_url || PRODUCE_IMG}
                      alt={product.name}
                      className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700"
                      loading="lazy"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(product); }}
                      className="absolute top-3 left-3 h-8 w-8 rounded-full bg-white/80 backdrop-blur-sm border border-gray-100 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-white transition-all shadow-sm"
                    >
                      <Heart className={`w-4 h-4 ${isFavorite(product.id) ? 'fill-red-500 text-red-500' : ''}`} />
                    </Button>
                    {inCartCount > 0 && (
                        <div className="absolute top-4 right-4 bg-green-600 text-white rounded-full h-6 min-w-[1.5rem] px-1.5 flex items-center justify-center text-[10px] font-bold shadow-md">
                            {inCartCount}
                        </div>
                    )}
                  </div>
                  <CardContent className="px-4 py-4 flex flex-col flex-1">
                    <div className="mb-1">
                        <h3 className="font-bold text-xs sm:text-base text-gray-800 leading-tight line-clamp-2 h-[2.5rem]" title={product.name}>
                        {currentLanguage?.code === 'ar' && product.name_ar ? product.name_ar : product.name}
                        </h3>
                        {product.description && (
                            <p className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">{product.description}</p>
                        )}
                    </div>
                    
                    <div className="mt-auto">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex flex-col">
                            <span className="text-sm sm:text-lg font-black text-gray-900 leading-none">
                                {Number(product.price) > 0 ? `₪${Number(product.price).toFixed(2)}` : t('common.price_on_request', 'السعر عند الطلب')}
                            </span>
                            {product.unit && (
                                <span className="text-[9px] font-bold text-gray-400 mt-1 uppercase">
                                    {currentLanguage?.code === 'ar' ? (t('common.per', 'لكل')) + ' ' + product.unit : `/ ${product.unit}`}
                                </span>
                            )}
                        </div>
                      </div>

                      {(() => {
                          const productItems = cart.filter(c => c.product.id === product.id);
                          if (productItems.length === 1) {
                              const item = productItems[0];
                              return (
                                  <div className="flex items-center justify-between h-10 bg-gray-50 rounded-2xl px-1">
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
                                className="w-full bg-green-700 hover:bg-green-800 text-white h-10 rounded-2xl shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2 group-hover:bg-green-800"
                                onClick={() => openAddToCart(product)}
                              >
                                <ShoppingCart className="w-4 h-4" />
                                <span className="text-[11px] font-black">{t('common.add_to_cart', 'أضف إلى السلة')}</span>
                              </Button>
                          );
                      })()}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Loading Spacing / Sentinel */}
        {/* Premium Pagination */}
        {totalPages > 1 && (
          <div className="mt-12 mb-8 flex items-center justify-center gap-2 sm:gap-4 select-none">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1 || initialLoading}
              onClick={() => handlePageChange(page - 1)}
              className="h-10 sm:h-12 px-4 rounded-2xl border-gray-100 shadow-sm font-bold text-gray-500 hover:text-green-700 hover:border-green-200 disabled:opacity-30 transition-all active:scale-95"
            >
              <ArrowLeft className="w-4 h-4 me-2 rtl:rotate-180" />
              {t('common.previous', 'السابق')}
            </Button>

            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, i) => {
                const pNum = i + 1;
                // Show current, first, last, and relative to current (simple logic for now)
                if (totalPages > 5 && pNum !== 1 && pNum !== totalPages && Math.abs(pNum - page) > 1) {
                  if (pNum === page - 2 || pNum === page + 2) return <span key={pNum} className="px-1 text-gray-300">...</span>;
                  return null;
                }
                return (
                  <Button
                    key={pNum}
                    variant={page === pNum ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handlePageChange(pNum)}
                    className={`h-10 w-10 sm:h-12 sm:w-12 rounded-2xl font-black transition-all ${
                      page === pNum 
                        ? 'bg-green-700 text-white shadow-lg shadow-green-200' 
                        : 'text-gray-400 hover:bg-green-50 hover:text-green-700'
                    }`}
                  >
                    {pNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages || initialLoading}
              onClick={() => handlePageChange(page + 1)}
              className="h-10 sm:h-12 px-4 rounded-2xl border-gray-100 shadow-sm font-bold text-gray-500 hover:text-green-700 hover:border-green-200 disabled:opacity-30 transition-all active:scale-95"
            >
              {t('common.next', 'التالي')}
              <ChevronRight className="w-4 h-4 ms-2 rtl:rotate-180" />
            </Button>
          </div>
        )}
      </main>

      {/* Dialog & Mobile Nav */}
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
      
      <div className="h-20 sm:hidden" />
      {user && <MobileBottomNav />}
    </div>
  );
}
