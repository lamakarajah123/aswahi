import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Search, Plus, ShoppingCart, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Category } from '@/pages/admin/types';
import type { Product } from '@/types';
import { useMemo } from 'react';

const PRODUCE_IMG = 'https://mgx-backend-cdn.metadl.com/generate/images/773620/2026-02-25/4fce97cc-f8f8-45d1-bdac-e81381d14b3a.png';

interface CategorySectionProps {
  cat: string;
  catDisplayName?: string;
  catCount: number;
  catIcon?: string | null;
  products: Product[];
  isLoading: boolean;
  showViewAll: boolean;
  cartMap: Record<number, number>;
  categoryMap?: Record<string, string>;
  onViewAll: () => void;
  onAddToCart: (p: Product, overrides?: { storeId?: number | string }) => void;
}

const CategorySection = memo(function CategorySection({
  cat, catDisplayName, catCount, catIcon, products, isLoading, showViewAll, cartMap, categoryMap, onViewAll, onAddToCart,
}: CategorySectionProps) {
  const { t, currentLanguage } = useLanguage();

  const iconIsImage = catIcon && (catIcon.startsWith('http') || catIcon.startsWith('data:'));

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {catIcon ? (
            iconIsImage ? (
              <div className="w-6 h-6 rounded-md overflow-hidden bg-gray-50">
                <img src={catIcon} alt="" className="w-full h-full object-cover" />
              </div>
            ) : (
              <span className="text-lg">{catIcon}</span>
            )
          ) : (
            <div className="w-1 h-6 bg-green-600 rounded-full" />
          )}
          <h2 className="text-lg font-bold text-gray-900">{catDisplayName || cat}</h2>
          <span className="text-sm text-gray-400">({catCount})</span>
        </div>
        {showViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm text-green-600 font-semibold flex items-center gap-1 bg-green-50 px-3 py-1 rounded-full border border-green-200 hover:bg-green-100 transition-colors"
          >
            {t('home.view_all', 'عرض المزيد')} ({catCount})
            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((j) => (
            <Card key={j} className="overflow-hidden border-0 shadow-sm rounded-2xl">
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
      ) : (
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
                      {currentLanguage?.code === 'ar' && categoryMap?.[product.category] ? categoryMap[product.category] : product.category}
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
                      ) : Number(product.price) > 0 ? (
                        <span className="text-base font-bold text-green-600">₪{(Number(product.price) || 0).toFixed(2)}</span>
                      ) : (
                        <span className="text-xs font-bold text-amber-600">{t('common.price_on_request', 'السعر عند الطلب')}</span>
                      )}
                      {product.unit && (
                        <span className="text-[10px] text-gray-400">
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
      )}
    </section>
  );
});

interface AllCategoriesViewProps {
  categoriesLoading: boolean;
  categories: Category[];
  categoryProducts: Record<string, Product[]>;
  categoryTotals: Record<string, number>;
  cartMap: Record<number, number>;
  isSearching: boolean;
  groupedSearchResults: Record<string, Product[]>;
  onAddToCart: (p: Product, overrides?: { storeId?: number | string }) => void;
}

export function AllCategoriesView({
  categoriesLoading,
  categories,
  categoryProducts,
  categoryTotals,
  cartMap,
  isSearching,
  groupedSearchResults,
  onAddToCart,
}: AllCategoriesViewProps) {
  const { t, currentLanguage } = useLanguage();
  const navigate = useNavigate();

  const catMapObj = useMemo(() => {
    const m: Record<string, Category> = {};
    categories.forEach(c => { m[c.name] = c; });
    return m;
  }, [categories]);

  const translationMap = useMemo(() => {
    const m: Record<string, string> = {};
    categories.forEach(c => { if (c.name_ar) m[c.name] = c.name_ar; });
    return m;
  }, [categories]);

  if (categoriesLoading) {
    return (
      <div className="space-y-10">
        {[1, 2, 3].map((i) => (
          <section key={i}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-gray-200 rounded-full animate-pulse" />
              <Skeleton className="h-5 w-32" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((j) => (
                <Card key={j} className="overflow-hidden border-0 shadow-sm rounded-2xl">
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
          </section>
        ))}
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <Package className="w-16 h-16 text-gray-200 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900">{t('home.no_nearby_products', 'No stores or products found nearby')}</h3>
        <p className="text-gray-500 max-w-sm mx-auto mt-1">{t('home.no_nearby_desc', 'Try changing your location or radius to find stores.')}</p>
      </div>
    );
  }

  if (isSearching && Object.keys(groupedSearchResults).length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <Search className="w-16 h-16 text-gray-200 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900">{t('home.no_products', 'No products found')}</h3>
        <p className="text-gray-500 max-w-sm mx-auto mt-1">{t('home.no_products_desc', 'Try adjusting your search or switching categories to find what you need.')}</p>
      </div>
    );
  }

  const sectionsToRender = isSearching
    ? Object.entries(groupedSearchResults).map(([cat, prods]) => {
        const catObj = catMapObj[cat];
        return {
            key: cat,
            cat,
            catDisplayName: cat, 
            catIcon: catObj?.icon,
            catCount: prods.length,
            products: prods,
            isLoading: false,
            showViewAll: false,
        };
      })
    : categories.map((cat) => {
        const displayName = currentLanguage?.code === 'ar' && cat.name_ar ? cat.name_ar : cat.name;
        return {
          key: cat.name,
          cat: cat.name,
          catDisplayName: displayName,
          catIcon: cat.icon,
          catCount: categoryTotals[cat.name] ?? cat.product_count ?? 0,
          products: categoryProducts[cat.name] ?? [],
          isLoading: categoryProducts[cat.name] === undefined,
          showViewAll:
            (categoryTotals[cat.name] ?? cat.product_count ?? 0) > 5 ||
            (categoryProducts[cat.name]?.length ?? 0) >= 5,
        };
      });

  // Handle search results display names
  const finalSections = isSearching 
    ? sectionsToRender.map(s => {
        const catObj = catMapObj[s.cat];
        const displayName = currentLanguage?.code === 'ar' && catObj?.name_ar ? catObj.name_ar : s.cat;
        return { ...s, catDisplayName: displayName };
      })
    : sectionsToRender;

  return (
    <div className="space-y-10">
      {finalSections.map(({ key, cat, catDisplayName, catCount, catIcon, products, isLoading, showViewAll }) => (
        <div key={key} id={`cat-section-${cat}`}>
          <CategorySection
            cat={cat}
            catDisplayName={catDisplayName}
            catCount={catCount}
            catIcon={catIcon}
            products={products}
            isLoading={isLoading}
            showViewAll={showViewAll}
            cartMap={cartMap}
            categoryMap={translationMap}
            onViewAll={() => navigate(`/category/${encodeURIComponent(cat)}`)}
            onAddToCart={onAddToCart}
          />
        </div>
      ))}
    </div>
  );
}
