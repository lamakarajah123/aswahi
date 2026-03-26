import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Plus, Minus, ShoppingCart, ChevronRight, X, Package } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Product } from '@/types';
import { ProductCustomizationWizard } from './ProductCustomizationWizard';

interface CartUnit {
  name: string;
  nameAr?: string | null;
  price: number;
  unitId: number | string;
  step?: number;
}

interface AddToCartDialogProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  units: CartUnit[];
  quantities: Record<string | number, number>;
  onQuantityChange: (unitId: string | number, q: number) => void;
  loading: boolean;
  onConfirm: (customizations?: any) => void;
}

export function AddToCartDialog({
  open,
  onClose,
  product,
  units,
  quantities,
  onQuantityChange,
  loading,
  onConfirm,
}: AddToCartDialogProps) {
  const { t, currentLanguage } = useLanguage();
  const [showWizard, setShowWizard] = useState(false);
  const [selections, setSelections] = useState<any[] | null>(null);

  const isRtl = currentLanguage?.isRtl;

  useEffect(() => {
    if (open) {
      setShowWizard(!!product?.has_customizations);
      setSelections(null);
    }
  }, [open, product]);

  // Calculate total price based on all selected quantities + customization extras
  const extraPerItem = selections ? selections.reduce((sum, stage) => {
    return sum + stage.options.reduce((oSum: number, o: any) => oSum + (Number(o.price) || 0), 0);
  }, 0) : 0;

  const totalAmount = (units || []).reduce((sum, unit) => {
    const basePrice = (Number(unit.price) || 0) + extraPerItem;
    return sum + (basePrice * (quantities[unit.unitId] || 0));
  }, 0);

  const handleWizardComplete = (customs: any) => {
    setSelections(customs);
    setShowWizard(false);
  };

  // Shared Content UI
  const renderContent = () => {
    let content;
    if (showWizard && product?.customization_stages) {
      content = (
        <ProductCustomizationWizard 
            stages={product.customization_stages} 
            onComplete={handleWizardComplete} 
            onCancel={onClose} 
        />
      );
    } else {
      content = (
        <>
          {/* Header / Dismiss */}
          <div className="p-4 flex items-center justify-between border-b border-gray-50 shrink-0">
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
              </button>
              <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">aswahi</span>
                  <div className="w-6 h-6 bg-green-700 rounded-md flex items-center justify-center">
                      <ShoppingCart className="w-3.5 h-3.5 text-white" />
                  </div>
              </div>
          </div>

          {/* Content Scrollable */}
          <div className="flex-1 overflow-y-auto px-4 pb-40">
              {/* Product Image + Title */}
              <div className="py-6 text-center">
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900 mb-6 line-clamp-2">
                    {currentLanguage?.code === 'ar' && product?.name_ar ? product.name_ar : product?.name}
                  </h2>
                  <div className="relative aspect-square max-w-[200px] sm:max-w-[280px] mx-auto bg-gray-50 rounded-3xl overflow-hidden mb-6 flex items-center justify-center p-4 shadow-sm border border-gray-100">
                      <img 
                          src={product?.image_url || 'https://mgx-backend-cdn.metadl.com/generate/images/773620/2026-02-25/4fce97cc-f8f8-45d1-bdac-e81381d14b3a.png'} 
                          alt={product?.name} 
                          className="w-full h-full object-contain"
                      />
                  </div>
                  
                  <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto mb-8 line-clamp-3">
                      {product?.description || t('store.default_desc', 'وصف قصير: منتج عالي الجودة مختار بعناية فائقة لضمان أفضل مذاق وقيمة غذائية.')}
                  </p>

                  <h3 className="text-lg font-black text-gray-900 mb-6">{t('store.set_quantity', 'تحديد الكمية')}</h3>

                  {/* Quantity Rows */}
                  <div className="space-y-4 px-2">
                      {loading ? (
                          <div className="flex justify-center py-10">
                              <Loader2 className="w-10 h-10 animate-spin text-green-700" />
                          </div>
                      ) : units.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-10 text-center">
                              <Package className="w-12 h-12 text-gray-200 mb-4" />
                              <p className="text-sm font-bold text-gray-500 mb-4 px-4">
                                  {t('store.no_units_available', 'نعتذر، لا تتوفر وحدات شراء معروضة حالياً لهذا المنتج.')}
                              </p>
                              <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="rounded-xl font-bold border-green-100 text-green-700 hover:bg-green-50"
                                  onClick={onClose}
                              >
                                  {t('common.close', 'إغلاق')}
                              </Button>
                          </div>
                      ) : units.map((unit) => {
                          const qty = quantities[unit.unitId] || 0;
                          const step = unit.step || 1.0;
                          return (
                              <div key={unit.unitId} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 px-2 rounded-xl transition-colors">
                                  <div className="flex flex-col text-start">
                                      <span className="text-base font-black text-gray-800">
                                          {currentLanguage?.code === 'ar' && unit.nameAr ? unit.nameAr : unit.name}
                                      </span>
                                      <span className="text-xs text-green-600 font-bold">{unit.price} شيقل</span>
                                  </div>

                                  <div className="flex items-center gap-4">
                                      <button 
                                          onClick={() => onQuantityChange(unit.unitId, Math.max(0, parseFloat((qty - step).toFixed(2))))}
                                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:border-red-500 hover:text-red-500 transition-all shadow-sm bg-white"
                                      >
                                          <Minus className="w-4 h-4" />
                                      </button>
                                      <span className="text-lg font-black text-gray-900 min-w-[2rem] text-center">{qty}</span>
                                      <button 
                                          onClick={() => onQuantityChange(unit.unitId, parseFloat((qty + step).toFixed(2)))}
                                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:border-green-500 hover:text-green-500 transition-all shadow-sm bg-white"
                                      >
                                          <Plus className="w-4 h-4" />
                                      </button>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>
          </div>

          {/* Bottom Action Bar: Fixed at bottom for mobile, sticky for desktop */}
          <div className="max-sm:absolute max-sm:bottom-0 max-sm:left-0 max-sm:right-0 sm:sticky sm:bottom-0 p-6 bg-white/95 backdrop-blur-md border-t border-gray-100 shadow-[0_-8px_30px_-10px_rgba(0,0,0,0.1)] rounded-t-[2.5rem] z-10 shrink-0 mt-auto">
              <div className="flex items-center justify-between mb-4 px-1">
                  <span className="text-base font-bold text-gray-900">
                      {t('store.total_price', 'السعر الإجمالي')}:
                  </span>
                  <span className="text-2xl font-black text-green-700">
                      {(totalAmount || 0).toFixed(2)} شيقل
                  </span>
              </div>
              <Button
                  className="w-full bg-green-800 hover:bg-green-900 text-white h-14 rounded-2xl shadow-xl shadow-green-100 flex items-center justify-center gap-2 transition-all active:scale-[0.98] font-black text-lg"
                  onClick={() => {
                    onConfirm(selections);
                    onClose();
                  }}
                  disabled={loading || !Object.values(quantities).some(q => q > 0)}
              >
                  <ShoppingCart className="w-5 h-5" />
                  {t('common.add_to_cart_full', 'إضافة إلى السلة')}
              </Button>
          </div>
        </>
      );
    }

    return (
      <div className="bg-white flex flex-col h-full relative overflow-hidden rounded-[2.5rem]">
        {content}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent 
        className="max-sm:fixed max-sm:bottom-0 max-sm:top-auto max-sm:left-0 max-sm:right-0 max-sm:translate-x-0 max-sm:translate-y-0 max-sm:max-w-none max-sm:w-full max-sm:rounded-t-[2.5rem] max-sm:rounded-b-none sm:max-w-lg rounded-[2.5rem] p-0 border-none shadow-2xl transition-all duration-300 ease-in-out sm:max-h-[90vh] flex flex-col"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <div className="flex-1 flex flex-col min-h-0 max-sm:h-[85vh]">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}


