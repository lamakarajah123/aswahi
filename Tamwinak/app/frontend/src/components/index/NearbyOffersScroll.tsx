import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tag, MapPin, ShoppingCart, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Link } from 'react-router-dom';

interface Offer {
    id: number;
    name: string;
    name_ar: string;
    image_url: string | null;
    price: number;
    original_price: number;
    unit: string;
    unit_ar?: string;
    distance_km: number;
    store_id: number;
    store_name: string;
}

interface NearbyOffersScrollProps {
    offers: Offer[];
    onAddToCart: (product: any, options: { storeId: number }) => void;
}

export function NearbyOffersScroll({ offers, onAddToCart }: NearbyOffersScrollProps) {
    const { t, currentLanguage } = useLanguage();

    if (offers.length === 0) return null;

    return (
        <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="bg-red-100 p-1.5 rounded-lg">
                        <Tag className="w-5 h-5 text-red-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">{t('home.nearby_offers', 'Special Offers')}</h2>
                </div>
                <Link to="/offers" className="text-sm font-semibold text-green-600 hover:text-green-700 flex items-center gap-1">
                    {t('common.view_all', 'View All')}
                    <ChevronRight className="w-4 h-4" />
                </Link>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-1 px-1">
                {offers.map((offer) => {
                    const discount = Math.round(((offer.original_price - offer.price) / offer.original_price) * 100);
                    return (
                        <Card key={`${offer.store_id}-${offer.id}`} className="min-w-[260px] md:min-w-[300px] group border-none shadow-sm hover:shadow-md transition-all overflow-hidden bg-white rounded-2xl">
                            <div className="flex gap-3 p-3">
                                <div className="relative w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
                                    <img 
                                        src={offer.image_url || 'https://mgx-backend-cdn.metadl.com/generate/images/773620/2026-02-25/4fce97cc-f8f8-45d1-bdac-e81381d14b3a.png'} 
                                        alt={offer.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                </div>
                                <div className="flex-1 flex flex-col min-w-0">
                                    <div className="text-start mb-1">
                                        <h3 className="text-sm font-bold text-gray-900 truncate">
                                            {currentLanguage?.code === 'ar' ? (offer.name_ar || offer.name) : offer.name}
                                        </h3>
                                        <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                            <span className="shrink-0">{offer.distance_km}km {t('home.away', 'away')}</span>
                                        </div>
                                    </div>


                                    <div className="mt-auto flex items-end justify-between">
                                        <div className="text-start leading-tight">
                                             <div className="flex flex-col items-baseline min-h-[1.5rem]">
                                                 <span className="text-base font-black text-green-700">₪{Number(offer.price).toFixed(2)}</span>
                                                 {offer.original_price && offer.original_price > offer.price && (
                                                   <span className="text-[10px] text-gray-400 line-through">₪{Number(offer.original_price).toFixed(2)}</span>
                                                 )}
                                             </div>
                                            <div className="text-[10px] text-gray-400">
                                                {t('common.per', 'per')} {currentLanguage?.code === 'ar' ? (offer.unit_ar || offer.unit) : offer.unit}
                                            </div>
                                        </div>

                                        <Button 
                                            size="sm" 
                                            variant="ghost"
                                            onClick={() => onAddToCart(offer, { storeId: offer.store_id })}
                                            className="h-8 w-8 p-0 rounded-full bg-green-50 text-green-600 hover:bg-green-100 shadow-none border-none"
                                        >
                                            <ShoppingCart className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </section>
    );
}
