import { useEffect, useRef } from 'react';
import { Package, Loader2, Plus, ShoppingCart } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Product } from '@/types';

const PRODUCE_IMG = 'https://mgx-backend-cdn.metadl.com/generate/images/773620/2026-02-25/4fce97cc-f8f8-45d1-bdac-e81381d14b3a.png';

interface SingleCategoryGridProps {
  loading: boolean;
  products: Product[];
  cartMap: Record<number, number>;
  onAddToCart: (p: Product, overrides?: { storeId?: number | string }) => void;
  page: number;
  totalPages: number;
  loadingMore: boolean;
  onLoadMore: () => void;
}

export function SingleCategoryGrid({
  loading,
  products,
  cartMap,
  onAddToCart,
  page,
  totalPages,
  loadingMore,
  onLoadMore,
}: SingleCategoryGridProps) {
  const { t, currentLanguage } = useLanguage();
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sentinelRef.current || page >= totalPages || loadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) onLoadMore(); },
      { threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [page, totalPages, loadingMore, onLoadMore]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {[...Array(10)].map((_, i) => (
          <Card key={i} className="overflow-hidden border-0 shadow-sm rounded-2xl">
            <Skeleton className="h-36 w-full" />
            <CardContent className="p-3 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="flex justify-between items-center mt-3">
                <Skeleton className="h-5 w-1/4" />
                <Skeleton className="h-8 w-16 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <Package className="w-16 h-16 text-gray-200 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900">
          {t('home.no_nearby_products', 'No products found in this category')}
        </h3>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {products.map((product) => {
          const inCartQty = cartMap[product.id] ?? 0;
          return (
            <Card key={product.id} className="overflow-hidden border border-gray-100 shadow-sm md:hover:shadow-md transition-all duration-300 rounded-2xl group">
              <div className="relative h-40 overflow-hidden bg-gray-50">
                <img
                  src={product.image_url || PRODUCE_IMG}
                  alt={product.name}
                  loading="lazy"
                  width={200}
                  height={160}
                  className="w-full h-full object-cover md:group-hover:scale-105 transition-transform duration-500"
                />
                {product.category && (
                  <Badge className="absolute top-2 start-2 bg-white/90 text-gray-800 text-[10px] font-medium border-0 shadow-sm backdrop-blur-sm">
                    {product.category}
                  </Badge>
                )}
                {product.is_offer_active && (
                  <Badge className="absolute top-2 end-2 bg-red-500 text-white text-[10px] font-bold border-0 shadow-sm">
                    {t('common.offer', 'Offer')}
                  </Badge>
                )}
              </div>
              <CardContent className="p-3.5">
                <h3 className="font-semibold text-sm text-gray-900 truncate" title={product.name}>{product.name}</h3>
                <p className="text-[11px] text-gray-500 mt-1 line-clamp-1 h-4">{product.description}</p>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex flex-col">
                    {product.is_offer_active ? (
                      <>
                        <span className="text-base font-bold text-green-600">₪{Number(product.sale_price).toFixed(2)}</span>
                        <span className="text-[10px] text-gray-400 line-through">₪{(Number(product.original_price || product.price) || 0).toFixed(2)}</span>
                      </>
                    ) : (
                      <span className="text-base font-bold text-green-600">₪{(Number(product.price) || 0).toFixed(2)}</span>
                    )}
                    {product.unit && (
                      <span className="text-[10px] text-gray-400 capitalize">
                        {t('common.per', 'per')} {currentLanguage?.code === 'ar' ? (product.unit_ar || product.unit) : product.unit}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {inCartQty > 0 && (
                      <div className="flex items-center gap-1 text-[10px] text-green-600 font-medium h-4">
                        <ShoppingCart className="w-3 h-3" />
                        <span>{inCartQty} {t('common.in_cart', 'In Cart')}</span>
                      </div>
                    )}
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white h-8 rounded-full px-4 shadow-sm"
                      onClick={() => onAddToCart(product, { storeId: (product as any).store_id })}
                    >
                      <Plus className="w-3.5 h-3.5 me-1" /> {t('common.add', 'Add')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {page < totalPages && (
        <div ref={sentinelRef} className="flex items-center justify-center py-8 gap-2 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">{t('home.loading_more', 'Loading more...')}</span>
        </div>
      )}
      {page >= totalPages && products.length > 0 && (
        <div className="text-center py-6 text-sm text-gray-400">
          {t('category.all_loaded', 'All products loaded')}
        </div>
      )}
    </>
  );
}
