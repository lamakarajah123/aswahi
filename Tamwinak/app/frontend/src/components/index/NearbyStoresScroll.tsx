import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Store, MapPin, Clock, Star } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Link } from 'react-router-dom';

interface StoreInfo {
    id: number;
    name: string;
    name_ar: string;
    image_url: string | null;
    latitude: number;
    longitude: number;
    working_hours: string | null;
    is_open: boolean;
    distance_km: number; // The distance is usually added manually or by haversine in the route
}

interface NearbyStoresScrollProps {
    stores: StoreInfo[];
}

export function NearbyStoresScroll({ stores }: NearbyStoresScrollProps) {
    const { t, currentLanguage } = useLanguage();

    if (stores.length === 0) return null;

    return (
        <section className="mb-10">
            <div className="flex items-center gap-2 mb-4">
                <div className="bg-green-100 p-1.5 rounded-lg">
                    <Store className="w-5 h-5 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">{t('home.nearby_stores', 'Nearby Stores')}</h2>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-1 px-1">
                {stores.map((store) => (
                    <Link key={store.id} to={`/store/${store.id}`} className="min-w-[200px] md:min-w-[240px] group block">
                        <Card className="rounded-2xl border-none shadow-sm hover:shadow-md transition-all overflow-hidden bg-white">
                            <div className="relative aspect-[16/9] bg-gray-100 overflow-hidden">
                                <img 
                                    src={store.image_url || 'https://mgx-backend-cdn.metadl.com/generate/images/773620/2026-03-02/103aaeac-f542-4917-8935-779cb4ea711d.png'} 
                                    alt={store.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute top-2 left-2 flex gap-1">
                                    <Badge className={`rounded-full px-2 py-0 border-none shadow-sm text-[10px] font-bold ${store.is_open ? 'bg-green-600 text-white' : 'bg-gray-500 text-white'}`}>
                                        {store.is_open ? t('common.open', 'Open') : t('common.closed', 'Closed')}
                                    </Badge>
                                </div>
                            </div>
                            <div className="p-3">
                                <h3 className="font-bold text-gray-900 truncate text-start mb-1 group-hover:text-green-600 transition-colors">
                                    {currentLanguage?.code === 'ar' ? (store.name_ar || store.name) : store.name}
                                </h3>
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                        <span className="truncate">{t('home.nearby_store', 'Nearby Shop')}</span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 pt-1 border-t border-gray-50">
                                        <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-600">
                                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                            <span>4.8</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-[11px] text-gray-400">
                                            <Clock className="w-3 h-3" />
                                            <span>25-35 min</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </Link>
                ))}
            </div>
        </section>
    );
}
