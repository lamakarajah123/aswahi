import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiCall } from '@/lib/axios';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tag, MapPin, Loader2, ShoppingCart } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { AddToCartDialog } from '@/components/store/AddToCartDialog';
import { useGeolocation } from '@/hooks/useGeolocation';
import { AppHeader } from '@/components/AppHeader';
import { MobileBottomNav } from '@/components/index/MobileBottomNav';
import { toast } from 'sonner';
import { Footer } from '@/components/Footer';
import type { Product } from '@/types';

interface OfferProduct extends Product {
    store_id: number;
    store_name: string;
    store_name_ar: string;
    distance_km: number;
    original_price: number;
}

export default function OffersPage() {
    const { t, currentLanguage } = useLanguage();
    const { coords } = useGeolocation();
    
    const {
        cartMap, openAddToCart, confirmAddToCart, 
        addingProduct, availableUnits, 
        addQuantities, setAddQuantities, addDialogOpen, setAddDialogOpen, loadingUnits
    } = useCart({ storageKey: 'index_cart' });

    const [offers, setOffers] = useState<OfferProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const { user, isStoreOwner } = useAuth();

    useEffect(() => {
        const fetchOffers = async () => {
            if (!coords) return;
            try {
                setLoading(true);
                
                let storeId = null;
                if (isStoreOwner && user) {
                    const storeRes = await apiCall.invoke({ url: '/api/v1/grocery/store/my-store', method: 'GET' });
                    storeId = storeRes.data?.id;
                }

                const res = await apiCall.invoke({
                    url: '/api/v1/grocery/nearby-offers',
                    method: 'GET',
                    params: { 
                        lat: coords.lat, 
                        lng: coords.lng, 
                        radius: 15,
                        store_id: storeId 
                    }

                });
                setOffers(Array.isArray(res.data) ? res.data : []);
            } catch (error: any) {
                console.error('Failed to fetch offers:', error);
                const detail = error.response?.data?.detail || error.message;
                toast.error(`${t('offers.fetch_error', 'Could not load offers')}: ${detail}`);
                setOffers([]);
            } finally {
                setLoading(false);
            }
        };

        fetchOffers();
    }, [coords, t, isStoreOwner, user]);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <AppHeader />
            
            <main className="flex-1 max-w-2xl mx-auto px-4 py-8">
                <header className="mb-8 text-center md:text-start">
                    <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                        <div className="bg-red-100 p-2 rounded-xl">
                            <Tag className="w-6 h-6 text-red-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">{t('nav.offers', 'Offers')}</h1>
                    </div>
                    <p className="text-gray-500">{t('offers.description', 'Best deals from stores near you')}</p>
                </header>

                {(!coords && !loading) ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm">
                        <MapPin className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">{t('offers.location_required', 'Location Access Required')}</h3>
                        <p className="text-gray-500 max-w-sm mx-auto mb-6">{t('offers.location_desc', 'Please enable location access to see the best deals and offers near you.')}</p>
                        <Button onClick={() => window.location.reload()} className="bg-green-600 hover:bg-green-700">
                            {t('common.retry', 'Try Again')}
                        </Button>
                    </div>
                ) : loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-green-600 animate-spin mb-4" />
                        <p className="text-gray-500">{t('common.loading', 'Loading...')}</p>
                    </div>
                ) : offers.length === 0 ? (
                    <Card className="p-12 text-center border-dashed border border-gray-200 bg-white">
                        <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Tag className="w-8 h-8 text-gray-300" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">{t('offers.no_offers', 'No active offers')}</h3>
                        <p className="text-gray-500">{t('offers.no_offers_desc', 'Check back later for exciting discounts!')}</p>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {offers.map((product) => {
                            const discount = product.original_price > 0 
                                ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
                                : 0;
                            
                            return (
                                <Card key={`${product.store_id}-${product.id}`} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow group bg-white">
                                    <div className="flex gap-4 p-3">
                                        <div className="relative w-28 h-28 shrink-0 rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
                                            <img 
                                                src={product.image_url || 'https://mgx-backend-cdn.metadl.com/generate/images/773620/2026-02-25/4fce97cc-f8f8-45d1-bdac-e81381d14b3a.png'} 
                                                alt={product.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                            {discount > 0 && (
                                                <div className="absolute top-1 left-1 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                                    -{discount}%
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 flex flex-col min-w-0 py-1">
                                            <div className="mb-1">
                                                <h3 className="font-bold text-gray-900 truncate text-start">
                                                    {currentLanguage?.code === 'ar' ? (product.name_ar || product.name) : product.name}
                                                </h3>
                                                <div className="flex items-center gap-1.5 text-xs text-gray-500 text-start">
                                                    <span className="shrink-0">{product.distance_km}km {t('home.away', 'away')}</span>
                                                </div>
                                            </div>


                                            <div className="mt-auto flex items-end justify-between gap-2">
                                                <div className="text-start">
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-xl font-black text-green-700">
                                                            {Number(product.price) > 0 ? `₪${Number(product.price).toFixed(2)}` : t('common.price_on_request', 'السعر عند الطلب')}
                                                        </span>
                                                        {product.original_price > product.price && Number(product.price) > 0 && (
                                                            <span className="text-sm text-gray-400 line-through">
                                                                ₪{Number(product.original_price).toFixed(2)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                                                        {t('common.per', 'per')} {product.unit}
                                                    </p>
                                                </div>

                                                <Button 
                                                    size="sm"
                                                    onClick={() => openAddToCart(product, { storeId: (product as any).store_id })}
                                                    className="rounded-xl bg-green-600 hover:bg-green-700 h-9 px-4 shadow-sm"
                                                >
                                                    <ShoppingCart className="w-4 h-4 mr-2" />
                                                    {t('common.add', 'Add')}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </main>

            <Footer />
            <MobileBottomNav />

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
        </div>
    );
}
