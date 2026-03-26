import { Heart, X, ShoppingCart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Product } from '@/types';

interface FavoritesDrawerProps {
  favorites: Product[];
  onRemove: (productId: number) => void;
  onAddToCart: (product: Product) => void;
  isFavorite: (productId: number) => boolean;
}

export function FavoritesDrawer({ favorites, onRemove, onAddToCart }: FavoritesDrawerProps) {
  const { t, currentLanguage } = useLanguage();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-gray-600 hover:text-red-500 transition-colors">
          <Heart className={`w-5 h-5 ${favorites.length > 0 ? 'fill-red-500 text-red-500' : ''}`} />
          {favorites.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
              {favorites.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-6 border-b">
          <SheetTitle className="flex items-center gap-2 text-2xl font-black">
            <Heart className="w-6 h-6 text-red-500 fill-red-500" />
            {t('favorites.title', 'المفضلة')}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {favorites.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-40 gap-4">
              <Heart className="w-20 h-20" />
              <p className="text-lg font-bold">{t('favorites.empty', 'لا يوجد منتجات في المفضلة')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {favorites.map((product) => (
                <div key={product.id} className="flex gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 group">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-white border border-gray-100">
                    <img 
                      src={product.image_url || '/placeholder.png'} 
                      alt={product.name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 flex flex-col justify-between overflow-hidden">
                    <div>
                      <h4 className="font-bold text-gray-900 truncate">
                        {currentLanguage?.code === 'ar' && product.name_ar ? product.name_ar : product.name}
                      </h4>
                      <p className="text-xs text-gray-500">{product.category}</p>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                       <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => onRemove(product.id)}
                        className="h-8 w-8 p-0 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50"
                       >
                         <Trash2 className="w-4 h-4" />
                       </Button>
                       <Button 
                        size="sm" 
                        onClick={() => onAddToCart(product)}
                        className="h-8 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold"
                       >
                         <ShoppingCart className="w-3.5 h-3.5 me-1.5" />
                         {t('common.add', 'أضف')}
                       </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
