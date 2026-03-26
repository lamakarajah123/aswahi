import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { apiCall } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ArrowLeft, ShoppingCart, Plus, Star, MapPin, Package, CheckCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { AppHeader } from '@/components/AppHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { MobileBottomNav } from '@/components/index/MobileBottomNav';
import { useCart } from '@/hooks/useCart';
import { CartSheetContent } from '@/components/store/CartSheetContent';
import { CheckoutDialog } from '@/components/store/CheckoutDialog';
import { AddToCartDialog } from '@/components/store/AddToCartDialog';
import { Footer } from '@/components/Footer';
import type { Product, StoreInfo } from '@/types';
import type { Category } from '@/pages/admin/types';

const PRODUCE_IMG = 'https://mgx-backend-cdn.metadl.com/generate/images/773620/2026-02-25/4fce97cc-f8f8-45d1-bdac-e81381d14b3a.png';

export default function StorePage() {
  const { storeId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { t, currentLanguage } = useLanguage();

  const {
    cart,
    cartTotal,
    cartCount,
    cartMap: cartQtyMap,
    openAddToCart,
    confirmAddToCart,
    updateQuantity,
    removeItem,
    clearCart,
    addingProduct,
    availableUnits,
    addQuantities,
    setAddQuantities,
    addDialogOpen,
    setAddDialogOpen,
    loadingUnits,
  } = useCart({ 
    storageKey: user?.id ? `store_cart_${storeId}_${user.id}` : `store_cart_${storeId}_guest`, 
    storeId,
    userId: user?.id
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [cartPortalTarget, setCartPortalTarget] = useState<HTMLElement | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});
  const [availableCategories, setAvailableCategories] = useState<string[]>(['All']);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 20;
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('checkout') === 'true' && user) {
      setCheckoutOpen(true);
      window.history.replaceState({}, '', `/store/${storeId}`);
    }
  }, [location.search, user, storeId]);

  // Load store info and available categories
  useEffect(() => {
    async function init() {
      try {
        setInitialLoading(true);
        const [storeRes, catsRes, allCatsRes] = await Promise.all([
          apiCall.invoke({ url: `/api/v1/grocery/stores/${storeId}`, method: 'GET' }),
          apiCall.invoke({ url: `/api/v1/grocery/stores/${storeId}/categories`, method: 'GET' }),
          apiCall.invoke({ url: '/api/v1/categories', method: 'GET' })
        ]);

        setStore(storeRes.data || null);
        setAvailableCategories(['All', ...(Array.isArray(catsRes.data) ? catsRes.data : [])]);

        // Fetch categories for translation
        const all: Category[] = Array.isArray(allCatsRes.data) ? allCatsRes.data : [];
        const m: Record<string, string> = {};
        all.forEach(c => { if (c.name_ar) m[c.name] = c.name_ar; });
        setCategoryMap(m);
      } catch {
        toast.error('Failed to load store');
      } finally {
        setInitialLoading(false);
      }
    }
    init();

    const timerId = setTimeout(() => setCartPortalTarget(document.getElementById('cart-portal')), 100);
    return () => clearTimeout(timerId);
  }, [storeId]);

  const fetchProducts = useCallback(async (pageNum: number, cat: string) => {
    try {
      const res = await apiCall.invoke({
        url: `/api/v1/grocery/stores/${storeId}/products`,
        method: 'GET',
        params: { page: pageNum, limit: PAGE_SIZE, category: cat !== 'All' ? cat : undefined }
      });
      return res.data as { items: Product[]; total: number; pages: number };
    } catch {
      toast.error('Failed to load products');
      return null;
    }
  }, [storeId]);

  // Handle category change or initial load
  useEffect(() => {
    setInitialLoading(true);
    setPage(1);
    fetchProducts(1, selectedCategory).then(data => {
      if (data) {
        setProducts(data.items);
        setTotalPages(data.pages);
      }
      setInitialLoading(false);
    });
  }, [selectedCategory, fetchProducts]);

  // Infinite Scroll Observer
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || page >= totalPages || initialLoading || loadingMore) return;

    const observer = new IntersectionObserver(async (entries) => {
      if (entries[0].isIntersecting && !loadingMore) {
        const nextPage = page + 1;
        setLoadingMore(true);
        const data = await fetchProducts(nextPage, selectedCategory);
        if (data) {
          setProducts(prev => [...prev, ...data.items]);
          setPage(nextPage);
          setTotalPages(data.pages);
        }
        setLoadingMore(false);
      }
    }, { threshold: 0.1 });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [page, totalPages, initialLoading, loadingMore, selectedCategory, fetchProducts]);

  const handleCheckout = () => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/store/${storeId}?checkout=true`)}`);
      return;
    }
    setCheckoutOpen(true);
  };

  if (initialLoading && page === 1 && products.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Skeleton className="h-64 w-full rounded-xl mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('checkout.success_title', 'Order Placed!')}</h2>
          <p className="text-gray-500 mb-6">{t('checkout.success_desc', 'Your order has been placed successfully. You can track it in your orders page.')}</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate('/orders')} className="bg-green-600 hover:bg-green-700 text-white">
              <Package className="w-4 h-4 mr-2" /> {t('checkout.view_orders', 'View Orders')}
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
    <div className="min-h-screen bg-gray-50 pb-24">
      <AppHeader />

      {/* Cart Sheet — portaled into AppHeader */}
      {cartPortalTarget && createPortal(
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="relative text-gray-600 hover:text-green-600">
              <ShoppingCart className="w-5 h-5 mr-1" />
              <span className="hidden sm:inline">{t('cart.title', 'Cart')}</span>
              {cartCount > 0 && (
                <Badge className="absolute -top-1 -right-1 bg-green-600 text-white text-[10px] w-4 h-4 flex items-center justify-center p-0 rounded-full border-2 border-white">
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

      {/* Store Banner */}
      {store && (
        <div className="relative h-48 md:h-64 overflow-hidden">
          <img src={store.image_url || PRODUCE_IMG} alt={store.name} className="w-full h-full object-cover" loading="lazy" width={800} height={400} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
              <h1 className="text-2xl md:text-3xl font-bold text-white">{store.name}</h1>
              <p className="text-white/80 text-sm mt-1">{store.description}</p>
              <div className="flex items-center gap-4 mt-2">
                {store.rating && store.rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-white text-sm font-medium">{store.rating}</span>
                    <span className="text-white/60 text-xs">({store.total_ratings})</span>
                  </div>
                )}
                <div className="flex items-center gap-1 text-white/80">
                  <MapPin className="w-4 h-4" />
                  <span className="text-xs">{store.address}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Store Closed Banner */}
      {store && store.is_open === false && (
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3">
            <X className="w-5 h-5" />
            <div>
              <p className="font-bold">{t('store.closed_now', 'Store is currently closed')}</p>
              <p className="text-sm">{t('store.working_hours', 'Working hours:')} {store.working_hours || '--:--'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {availableCategories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              size="sm"
              className={selectedCategory === cat ? 'bg-green-600 hover:bg-green-700 text-white shrink-0' : 'shrink-0'}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat === 'All' ? t('home.all_categories', 'الكل') : (currentLanguage?.code === 'ar' && categoryMap[cat] ? categoryMap[cat] : cat)}
            </Button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        {products.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{t('store.no_products_cat', 'No products in this category')}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product) => {
                const inCartQty = cartQtyMap[product.id] ?? 0;
                return (
                  <Card key={product.id} className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
                    <div className="relative h-36 overflow-hidden">
                      <img
                        src={product.image_url || PRODUCE_IMG}
                        alt={product.name}
                        loading="lazy"
                        width={200}
                        height={144}
                        className="w-full h-full object-cover"
                      />
                      {product.category && (
                        <Badge className="absolute top-2 left-2 bg-white/90 text-gray-700 text-[10px]">
                          {currentLanguage?.code === 'ar' && product.category && categoryMap[String(product.category)] ? categoryMap[String(product.category)] : String(product.category || '')}
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <h3 className="font-medium text-sm text-gray-900 truncate">{product.name}</h3>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{product.description}</p>
                      <div className="flex items-center justify-between mt-3">
                        <div>
                          {product.is_offer_active ? (
                            <div className="flex flex-col">
                              <span className="text-base font-bold text-green-600">₪{Number(product.sale_price).toFixed(2)}</span>
                              <span className="text-[10px] text-gray-400 line-through">₪{(Number(product.original_price || product.price) || 0).toFixed(2)}</span>
                            </div>
                          ) : (Number(product.price) > 0) ? (
                            <span className="text-base font-bold text-green-600">₪{(Number(product.price) || 0).toFixed(2)}</span>
                          ) : (
                            <span className="text-xs font-bold text-amber-600">{t('common.price_on_request', 'السعر عند الطلب')}</span>
                          )}
                          {product.unit && (
                            <span className="text-xs text-gray-400">
                              {t('common.per', 'per')} {currentLanguage?.code === 'ar' ? (product.unit_ar || product.unit) : product.unit}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {inCartQty > 0 && (
                            <div className="flex items-center gap-1 text-[10px] text-green-600 font-medium">
                              <ShoppingCart className="w-3 h-3" />
                              <span>{inCartQty} {t('common.in_cart', 'In Cart')}</span>
                            </div>
                          )}
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white h-8"
                            onClick={() => openAddToCart(product)}
                          >
                            <Plus className="w-3 h-3 mr-1" /> {t('common.add', 'Add')}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            
            {/* Sentinel for Infinite Scroll */}
            <div ref={sentinelRef} className="h-10 mt-4 flex items-center justify-center">
              {loadingMore && (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600" />
              )}
            </div>
          </>
        )}
      </div>

      {/* Floating Cart Bar (mobile only) */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg sm:hidden z-40">
          <Sheet>
            <SheetTrigger asChild>
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white h-12">
                <ShoppingCart className="w-4 h-4 mr-2" />
                {t('cart.view_cart', 'View Cart')} ({cartCount} {t('common.items', 'items')}) • ₪{(Number(cartTotal) || 0).toFixed(2)}
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
          </Sheet>
        </div>
      )}

      <CheckoutDialog
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        cart={cart}
        storeId={storeId}
        cartTotal={cartTotal}
        onSuccess={() => { clearCart(); setCheckoutOpen(false); setOrderSuccess(true); }}
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
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
