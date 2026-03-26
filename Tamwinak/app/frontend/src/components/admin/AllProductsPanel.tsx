import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Search, Plus, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Product, Industry } from '@/pages/admin/types';

interface AllProductsPanelProps {
  products: Product[];
  industries: Industry[];
  allProducts: Product[];
  selected: Set<number>;
  page: number;
  totalPages: number;
  search: string;
  category: string;
  industry: string;
  onSearchChange: (v: string) => void;
  onCategoryChange: (v: string) => void;
  onIndustryChange: (v: string) => void;
  onToggleSelect: (id: number) => void;
  onSelectAll: () => void;
  onAddSelected: () => void;
  onAddOne: (id: number) => void;
  onAddAll: () => void;
  onPageChange: (p: number) => void;
}

export function AllProductsPanel({
  products,
  industries,
  allProducts,
  selected,
  page,
  totalPages,
  search,
  category,
  industry,
  onSearchChange,
  onCategoryChange,
  onIndustryChange,
  onToggleSelect,
  onSelectAll,
  onAddSelected,
  onAddOne,
  onAddAll,
  onPageChange,
}: AllProductsPanelProps) {
  const { t } = useLanguage();

  const categories = Array.from(
    new Set(allProducts.map((p) => p.category).filter(Boolean) as string[])
  ).sort();

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col" style={{ maxHeight: '75vh' }}>
      <div className="p-4 border-b border-gray-100 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Package className="w-4 h-4 text-gray-500" />
              {t('admin.store_products.all_products', 'All Products')}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5" dir="auto">
              <span dir="ltr">{products.length}</span> {t('admin.store_products.available', 'available')} ·{' '}
              <span dir="ltr">{selected.size}</span> {t('admin.store_products.selected', 'selected')}
            </p>
          </div>
          <div className="flex gap-2">
            {selected.size > 0 && (
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white gap-1.5 text-xs"
                onClick={onAddSelected}
              >
                <Plus className="w-3.5 h-3.5" />
                {t('admin.store_products.add', 'Add')} ({selected.size})
              </Button>
            )}
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={onAddAll}>
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
              {t('admin.store_products.add_all', 'Add All')}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 lg:ltr:left-3 lg:rtl:right-3 lg:rtl:left-auto" />
            <Input
              className="ltr:pl-8 rtl:pr-8 h-8 text-sm"
              placeholder={t('admin.store_products.search_all', 'Search products...')}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select
              value={industry || 'all_industries'}
              onValueChange={(v) => onIndustryChange(v === 'all_industries' ? '' : v)}
            >
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder={t('admin.store_products.industry', 'Industry')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_industries">{t('admin.store_products.all_industries', 'All Industries')}</SelectItem>
                {industries.map((i) => (
                  <SelectItem key={i.id} value={String(i.id)}>
                    {i.icon} {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={category || 'all_categories'}
              onValueChange={(v) => onCategoryChange(v === 'all_categories' ? '' : v)}
            >
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder={t('admin.store_products.category', 'Category')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_categories">{t('admin.store_products.all_categories', 'All Categories')}</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="overflow-y-auto flex-1">
        {products.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">{t('admin.store_products.no_products_avail', 'No products available')}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            <div
              className="flex items-center gap-3 px-4 py-2 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={onSelectAll}
            >
              <input
                type="checkbox"
                readOnly
                checked={selected.size === products.length && products.length > 0}
                className="w-4 h-4 rounded accent-green-600 ltr:mr-2 rtl:ml-2"
              />
              <span className="text-xs text-gray-500 font-medium">
                {t('admin.store_products.select_all', 'Select all')} ({products.length})
              </span>
            </div>
            {products.map((p) => (
              <div
                key={p.id}
                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors ${selected.has(p.id) ? 'bg-green-50' : ''}`}
                onClick={() => onToggleSelect(p.id)}
              >
                <input
                  type="checkbox"
                  readOnly
                  checked={selected.has(p.id)}
                  className="w-4 h-4 rounded accent-green-600 shrink-0"
                />
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} loading="lazy" width={32} height={32} className="w-8 h-8 rounded object-cover shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center shrink-0">
                    <Package className="w-4 h-4 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {p.industry && (
                      <span className="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                        {p.industry.icon} {p.industry.name}
                      </span>
                    )}
                    {p.category && (
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">{p.category}</Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-semibold text-gray-700" dir="ltr">
                    ₪{(Number(p.price) || 0).toFixed(2)}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-7 h-7 hover:bg-green-100 hover:text-green-700 rtl:mr-2 ltr:ml-2"
                    onClick={(e) => { e.stopPropagation(); onAddOne(p.id); }}
                    title={t('admin.store_products.add_to_store', 'Add to store')}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-2 border-t">
          <Button
            variant="outline" size="icon" className="w-7 h-7"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <span className="text-xs text-gray-500">{page}/{totalPages}</span>
          <Button
            variant="outline" size="icon" className="w-7 h-7"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
