import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Package, Search, Trash2, Store, RefreshCw, Edit } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Product } from '@/pages/admin/types';

interface StoreProductsPanelProps {
  products: Product[];
  storeName: string | undefined;
  selected: Set<number>;
  loading: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  onToggleSelect: (id: number) => void;
  onSelectAll: () => void;
  onRemoveSelected: () => void;
  onRemoveOne: (id: number) => void;
  onRefresh: () => void;
  onEdit?: (product: Product) => void;
}

export function StoreProductsPanel({
  products,
  storeName,
  selected,
  loading,
  search,
  onSearchChange,
  onToggleSelect,
  onSelectAll,
  onRemoveSelected,
  onRemoveOne,
  onRefresh,
  onEdit,
}: StoreProductsPanelProps) {
  const { t, isRTL } = useLanguage();

  const filteredProducts = search
    ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : products;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col" style={{ maxHeight: '75vh' }}>
      <div className="p-4 border-b border-gray-100 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Store className="w-4 h-4 text-green-600" />
              {storeName || t('admin.store_products.products', 'Store')}{' '}
              {t('admin.store_products.store_products', 'Products')}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5" dir="auto">
              <span dir="ltr">{products.length}</span> {t('admin.store_products.products', 'products')} ·{' '}
              <span dir="ltr">{selected.size}</span> {t('admin.store_products.selected', 'selected')}
            </p>
          </div>
          <div className="flex gap-2">
            {selected.size > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs text-red-600 border-red-200 hover:bg-red-50"
                onClick={onRemoveSelected}
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t('admin.store_products.remove', 'Remove')} ({selected.size})
              </Button>
            )}
            <Button
              size="sm" variant="ghost" className="gap-1.5 text-xs"
              onClick={onRefresh}
              disabled={loading}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <div className="relative">
          <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400`} />
          <Input
            className={`${isRTL ? 'pr-8 pl-3' : 'pl-8 pr-3'} h-8 text-sm`}
            placeholder={t('admin.store_products.search_store_products', 'Search store products...')}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-y-auto flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Store className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">{t('admin.store_products.no_products_store', 'No products in this store yet')}</p>
            <p className="text-xs mt-1">{t('admin.store_products.add_from_left', 'Add products from the left panel')}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            <div
              className={`flex items-center gap-3 px-4 py-2 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
              onClick={onSelectAll}
            >
              <input
                type="checkbox"
                readOnly
                checked={selected.size === filteredProducts.length && filteredProducts.length > 0}
                className="w-4 h-4 rounded accent-red-500"
              />
              <span className="text-xs text-gray-500 font-medium">
                {t('admin.store_products.select_all', 'Select all')} ({filteredProducts.length})
              </span>
            </div>
            {filteredProducts.map((p) => (
              <div
                key={p.id}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${selected.has(p.id) ? 'bg-red-50' : ''} ${isRTL ? 'flex-row-reverse' : ''}`}
                onClick={() => onToggleSelect(p.id)}
              >
                <input
                  type="checkbox"
                  readOnly
                  checked={selected.has(p.id)}
                  className="w-4 h-4 rounded accent-red-500 shrink-0"
                />
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} loading="lazy" width={40} height={40} className="w-10 h-10 rounded-lg object-cover shrink-0 border border-gray-100" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 border border-gray-100">
                    <Package className="w-5 h-5 text-gray-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0 mx-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                  
                  {/* Units Display */}
                  <div className={`flex flex-wrap gap-1 mt-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    {p.product_units && p.product_units.length > 0 ? (
                      p.product_units.map((pu: any, idx: number) => (
                        <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-medium">
                          {isRTL && pu.unit?.name_ar ? pu.unit.name_ar : pu.unit?.name || 'unit'}: ₪{Number(pu.price || 0).toFixed(2)}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-gray-400 italic">No units defined</span>
                    )}
                  </div>

                  <div className={`flex items-center gap-1.5 mt-1 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
                    {p.industry && (
                      <span className="text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded font-medium">
                        {p.industry.icon} {isRTL && p.industry.name_ar ? p.industry.name_ar : p.industry.name}
                      </span>
                    )}
                    {p.category && (
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 font-normal text-gray-500">{p.category}</Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-1.5 shrink-0 px-1 min-w-[90px]">
                  {p.sale_price !== null && p.sale_price !== undefined ? (
                    <span className="text-sm font-bold text-green-600" dir="ltr">₪{Number(p.sale_price).toFixed(2)}</span>
                  ) : (
                    <span className="text-sm font-bold text-gray-900" dir="ltr">
                      ₪{(Number(p.price) || 0).toFixed(2)}
                    </span>
                  )}
                  
                  <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-tight ${p.stock_quantity && p.stock_quantity > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {t('admin.store_products.stock', 'Stock')}: {p.stock_quantity ?? 0}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-6 h-6 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        onEdit?.(p);
                      }}
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-6 h-6 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        onRemoveOne(p.id); 
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
