import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Package, Edit, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { apiCall } from '@/lib/axios';
import { useLanguage } from '@/contexts/LanguageContext';
import type { StoreProduct } from '@/types';

interface Props {
  products: StoreProduct[];
  onUpdated: () => void;
  canManagePrices?: boolean;
}

export function StoreProductsTab({ products, onUpdated, canManagePrices }: Props) {
  const { t, currentLanguage } = useLanguage();
  const [editingProduct, setEditingProduct] = useState<StoreProduct | null>(null);
  const [productForm, setProductForm] = useState<{ 
    is_available: boolean; 
    override_price: number | null; 
    sale_price: number | null; 
    sale_start: string | null;
    sale_end: string | null;
    stock_quantity: number 
  }>({ 
    is_available: true, 
    override_price: null,
    sale_price: null,
    sale_start: null,
    sale_end: null,
    stock_quantity: 0
  });

  const handleEditProductClick = (product: StoreProduct) => {
    setEditingProduct(product);
    
    // Convert UTC Date to local string for datetime-local input correctly
    const toInputDate = (d: any) => {
        if (!d) return '';
        const date = new Date(d);
        if (isNaN(date.getTime())) return '';
        
        // sv-SE locale is the easiest way to get YYYY-MM-DD HH:mm
        const dateStr = date.toLocaleString('sv-SE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
        return dateStr.replace(' ', 'T');
    };

    setProductForm({ 
      is_available: product.is_available !== false,
      override_price: product.override_price || null,
      sale_price: product.sale_price || null,
      sale_start: toInputDate(product.sale_start),
      sale_end: toInputDate(product.sale_end),
      stock_quantity: product.stock_quantity ?? 0
    });
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;

    try {
      const saleVal = productForm.sale_price !== null ? parseFloat(productForm.sale_price.toString()) : null;
      const overrideVal = productForm.override_price !== null ? parseFloat(productForm.override_price.toString()) : null;
      const baseVal = Number(editingProduct.price) || 0;

      // Effective regular price for validation
      const effectiveRegular = overrideVal !== null ? overrideVal : baseVal;

      if (saleVal !== null && saleVal >= effectiveRegular) {
        toast.error(t('store_products.sale_price_error', 'Sale price must be lower than your regular daily price.'));
        return;
      }

      await apiCall.invoke({
        url: `/api/v1/grocery/store/products/${editingProduct.id}`,
        method: 'PUT',
        data: { 
          is_available: productForm.is_available,
          override_price: overrideVal,
          sale_price: saleVal,
          sale_start: (productForm.sale_start && productForm.sale_start !== '') ? productForm.sale_start : null,
          sale_end: (productForm.sale_end && productForm.sale_end !== '') ? productForm.sale_end : null,
          stock_quantity: productForm.stock_quantity
        },
      });
      toast.success('Product updated successfully!');
      setEditingProduct(null);
      onUpdated();
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string | { message: string }[] } }; message?: string };
      const detail = e?.response?.data?.detail;
      const msg = Array.isArray(detail) ? detail[0]?.message : detail;
      toast.error(msg ?? e?.message ?? 'Failed to update product details');
    }
  };

  return (
    <>
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">
          {t('store_dashboard.products_count', 'Products')} ({products.length})
        </h3>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{t('store_products.no_store_selected_desc', 'No products yet.')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {products.map((p) => (
            <Card key={p.id} className="border-0 shadow-sm">
              <CardContent className="p-4 flex gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium truncate">{p.name}</h4>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {typeof p.category === 'string' ? p.category : String(p.category || '')}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {(() => {
                      const now = new Date();
                      const isFuture = p.sale_start && new Date(p.sale_start) > now;
                      const isPast = p.sale_end && new Date(p.sale_end) < now;
                      const hasSale = p.sale_price && Number(p.sale_price) > 0 && !isFuture && !isPast && canManagePrices;
                      
                      return (
                        <>
                          {hasSale ? (
                            <span className="text-green-700 font-bold">₪{Number(p.sale_price).toFixed(2)}</span>
                          ) : (
                            <span>₪{(Number(p.override_price || p.price) || 0).toFixed(2)}</span>
                          )}
                          {isFuture && <span className="ml-2 text-[10px] text-blue-500 bg-blue-50 px-1 rounded border border-blue-100 font-medium">Upcoming Offer</span>}
                          {isPast && <span className="ml-2 text-[10px] text-gray-400 line-through">Expired Offer</span>}
                          {!isFuture && !isPast && p.sale_price && <span className="ml-2 text-[10px] text-green-600 font-bold">Offer Active</span>}
                        </>
                      );
                    })()} / {currentLanguage?.code === 'ar' ? (p.unit_ar || p.unit) : (p.unit || 'unit')}
                  </p>
                  <p className={`text-xs mt-1 ${!p.is_available ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                    {p.is_available ? t('store_products.available', 'Available') : t('store_products.unavailable', 'Unavailable')} 
                    {p.stock_quantity !== undefined && (
                      <span className="ml-2 font-medium">({t('admin.store_products.stock', 'Stock')}: {p.stock_quantity})</span>
                    )}
                  </p>
                </div>
                <div>
                  <Button variant="outline" size="sm" onClick={() => handleEditProductClick(p)}>
                    <Edit className="w-4 h-4 mr-1" /> Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update product details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_available"
                className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                checked={productForm.is_available}
                onChange={(e) => setProductForm({ ...productForm, is_available: e.target.checked })}
              />
              <label htmlFor="is_available" className="text-sm font-medium text-gray-900 cursor-pointer">
                {t('store_products.available', 'Available for purchase')}
              </label>
            </div>


            {/* Managed Store Price (Delegated) */}
            {canManagePrices && (
              <div className="space-y-1.5 pt-2 border-t border-gray-100">
                <div className="flex justify-between items-end mb-1">
                  <label className="text-sm font-medium text-gray-700">
                    {t('store_products.override_price', 'Daily Store Price (Regular) (₪)')}
                  </label>
                  <div className="flex gap-2">
                    <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-500">
                        {t('store_products.base_price_label', 'Base')}: ₪{(Number(editingProduct?.price) || 0).toFixed(2)}
                    </span>
                    {editingProduct?.override_price && (
                      <span className="text-[10px] bg-green-50 px-2 py-0.5 rounded text-green-600 font-bold border border-green-100">
                          {t('store_products.current_price_label', 'Current')}: ₪{Number(editingProduct.override_price).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₪</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={t('store_products.price_placeholder', 'Leave empty to use base price')}
                    className="w-full pl-7 pr-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-sm transition-all"
                    value={productForm.override_price || ''}
                    onChange={(e) => setProductForm({ ...productForm, override_price: e.target.value ? parseFloat(e.target.value) : null })}
                  />
                </div>
              </div>
            )}

            {/* Special Offer Price */}
            <div className="space-y-1.5 pt-2 border-t border-gray-100">
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium text-blue-700">
                  {t('store_products.sale_price', 'Special Offer Price (₪)')}
                </label>
                {(productForm.sale_price !== null || productForm.sale_start || productForm.sale_end) && (
                  <button 
                    onClick={() => setProductForm({ ...productForm, sale_price: null, sale_start: null, sale_end: null })}
                    className="text-[10px] text-red-500 hover:text-red-700 font-medium flex items-center gap-1 transition-colors"
                  >
                    {t('store_products.cancel_offer', 'Cancel Offer')}
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 text-sm">₪</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder={t('store_products.offer_placeholder', 'Enter lower price for offer')}
                  className="w-full pl-7 pr-3 py-2 rounded-lg border-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all text-blue-900 font-bold"
                  value={productForm.sale_price || ''}
                  onChange={(e) => setProductForm({ ...productForm, sale_price: e.target.value ? parseFloat(e.target.value) : null })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500">
                    {t('store_products.sale_start', 'Offer Start')}
                  </label>
                  <input
                    type="datetime-local"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs transition-all"
                    value={productForm.sale_start || ''}
                    onChange={(e) => setProductForm({ ...productForm, sale_start: e.target.value || null })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500">
                    {t('store_products.sale_end', 'Offer End')}
                  </label>
                  <input
                    type="datetime-local"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs transition-all"
                    value={productForm.sale_end || ''}
                    onChange={(e) => setProductForm({ ...productForm, sale_end: e.target.value || null })}
                  />
                </div>
              </div>

              <p className="text-[10px] text-blue-500/80 bg-blue-50/50 p-2 rounded-lg border border-blue-50">
                {t('store_products.sale_hint', 'Enter a lower price to activate it as a special offer.')}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                {t('admin.store_products.quantity', 'Quantity in Stock')}
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-sm transition-all"
                value={productForm.stock_quantity}
                onChange={(e) => setProductForm({ ...productForm, stock_quantity: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProduct(null)}>
              Cancel
            </Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleUpdateProduct}>
              Save Updates
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
