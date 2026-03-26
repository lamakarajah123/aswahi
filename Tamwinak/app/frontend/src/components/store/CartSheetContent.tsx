import { Button } from '@/components/ui/button';
import { ShoppingCart, Plus, Minus, Trash2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { CartItem } from '@/types';

const PRODUCE_IMG = 'https://mgx-backend-cdn.metadl.com/generate/images/773620/2026-02-25/4fce97cc-f8f8-45d1-bdac-e81381d14b3a.png';

interface CartSheetContentProps {
  cart: CartItem[];
  cartTotal: number;
  onUpdateQuantity: (cartId: string, delta: number) => void;
  onRemoveItem: (cartId: string) => void;
  onClearCart: () => void;
  onCheckout: () => void;
  submitting?: boolean;
}

export function CartSheetContent({
  cart,
  cartTotal,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
  submitting = false,
}: CartSheetContentProps) {
  const { t, currentLanguage } = useLanguage();

  return (
    <div className="mt-4 flex flex-col h-[calc(100vh-10rem)]">
      {cart.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{t('cart.empty', 'Your cart is empty')}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="font-bold text-gray-900">{t('cart.items_title', 'Items')} ({cart.length})</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClearCart}
              className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs font-semibold px-2 h-8"
            >
              <Trash2 className="w-3.5 h-3.5 me-1" />
              {t('cart.clear_all', 'Clear All')}
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {cart.map((item) => (
              <div key={item.id} className="relative flex items-center gap-3 p-3 bg-gray-50 rounded-xl group transition-all hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100">
                <img
                  src={item.product.image_url || PRODUCE_IMG}
                  alt={item.product.name}
                  loading="lazy"
                  width={56}
                  height={56}
                  className="w-14 h-14 object-cover rounded-lg"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate pe-6 text-gray-800">{item.product.name}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-gray-400 capitalize font-bold bg-white px-1.5 py-0.5 rounded border border-gray-100">
                          {currentLanguage?.code === 'ar' && item.unitAr ? item.unitAr : item.unit}
                        </span>
                        {item.customizations && item.customizations.map((stage: any) => 
                            stage.options.map((opt: any) => (
                                <span key={opt.option_id} className="text-[10px] text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded border border-green-100">
                                    {currentLanguage?.code === 'ar' ? opt.name_ar : opt.name}
                                </span>
                            ))
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => onRemoveItem(item.id)}
                      className="absolute top-2 end-2 p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-full hover:bg-red-50"
                      title={t('common.remove', 'Remove')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm text-green-600 font-bold">
                      {(Number(item.price) * item.quantity) > 0 ? `₪${(Number(item.price) * item.quantity).toFixed(2)}` : t('common.price_on_request', 'السعر عند الطلب')}
                    </p>
                    <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-100 p-0.5 shadow-xs">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 hover:bg-gray-50 text-gray-500"
                        onClick={() => onUpdateQuantity(item.id, -1)}
                      >
                         <Minus className="w-3 h-3" />
                      </Button>
                      <div className="w-9">
                        <input
                          type="number"
                          step={item.step || 1.0}
                          min="0"
                          readOnly
                          value={item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(1)}
                          className="w-full text-center text-xs font-bold bg-transparent border-none focus:outline-none focus:ring-0 p-0 text-gray-700"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 hover:bg-gray-50 text-gray-500"
                        onClick={() => onUpdateQuantity(item.id, 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t pt-4 mt-4 space-y-4">
            <div className="flex justify-between text-base px-1">
              <span className="text-gray-500 font-medium">{t('cart.total', 'Total')}</span>
              <span className="font-black text-gray-900">{cartTotal > 0 ? `₪${cartTotal.toFixed(2)}` : t('common.price_tbd', 'سيتم التحديد')}</span>
            </div>
            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white h-14 rounded-2xl font-black text-lg shadow-lg shadow-green-600/10 transition-all active:scale-[0.98]"
              onClick={onCheckout}
              disabled={submitting}
            >
              {submitting
                ? t('common.processing', 'Processing...')
                : `${t('cart.checkout_button', 'Checkout')}`}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
