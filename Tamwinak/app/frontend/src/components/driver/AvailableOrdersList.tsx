import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Truck, MapPin, Navigation, Map as MapIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { AvailableOrder } from '@/types';

interface AvailableOrdersListProps {
  orders: AvailableOrder[];
  loading: boolean;
  isAvailable: boolean;
  onAccept: (orderId: number) => void;
  onViewMap: (order: AvailableOrder) => void;
  onGoOnline: () => void;
}

export function AvailableOrdersList({ orders, loading, isAvailable, onAccept, onViewMap, onGoOnline }: AvailableOrdersListProps) {
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t('admin.settings.loading', 'Loading...')}</p>
      </div>
    );
  }

  if (!isAvailable) {
    return (
      <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-dashed border-gray-300">
        <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-gray-700">{t('driver.you_are_offline', 'You are Offline')}</h3>
        <p className="text-gray-500">{t('driver.go_online_start', 'Go online to start receiving delivery requests.')}</p>
        <Button onClick={onGoOnline} className="mt-4 bg-green-600 hover:bg-green-700">
          {t('driver.go_online', 'Go Online')}
        </Button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">{t('driver.no_available_orders', 'No available orders nearby')}</p>
        <p className="text-xs text-gray-400 mt-1">{t('driver.orders_will_appear', 'Orders will appear when stores mark them as ready')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((item) => {
        const isGroup = item.is_group;
        const displayId = isGroup ? item.group_id : `#${item.id}`;
        const totalFee = isGroup
          ? (item.orders?.reduce((sum, o) => sum + o.delivery_fee, 0) || 0)
          : (item.delivery_fee || 0);

        return (
          <Card key={isGroup ? item.group_id : item.id} className={`border-0 shadow-md ${isGroup ? 'ring-2 ring-blue-50' : ''}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isGroup && (
                    <Badge className="bg-blue-600 text-white px-1.5 py-0 text-[10px]">
                      {t('driver.multi_store', 'Multi-Store')}
                    </Badge>
                  )}
                  <CardTitle className="text-base">{t('orders.title', 'Order')} {displayId}</CardTitle>
                </div>
                <Badge className="bg-green-100 text-green-700 font-bold" dir="ltr">
                  ₪{totalFee.toFixed(2)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
                <div className="space-y-3">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                    {t('driver.pick_up_locations', 'Pick Up Locations')}
                  </p>
                  {(isGroup ? item.orders : [item])?.map((o: any, oidx: number) => (
                    <div key={oidx} className="flex items-start gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                      <MapPin className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-bold text-gray-800 text-xs">{o.store_name}</p>
                        <p className="text-gray-400 text-[10px] leading-tight mb-1">{o.store_address}</p>
                        <div className="border-t border-gray-100 mt-1 pt-1">
                          {o.items?.map((it: any, iidx: number) => (
                            <p key={iidx} className="text-[10px] text-gray-600">
                              • {it.quantity}x {it.product_name}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-2">
                    {t('driver.delivery_destination', 'Delivery Destination')}
                  </p>
                  <div className="flex items-start gap-2">
                    <Navigation className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-gray-700 font-medium text-xs">{item.delivery_address}</p>
                      <p className="text-gray-400 text-[10px] mt-0.5" dir="ltr">
                        {item.distance_km} {t('driver.km_away', 'km away from your location')}
                      </p>
                    </div>
                    {item.delivery_lat && item.delivery_lng && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${item.delivery_lat},${item.delivery_lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-800 font-bold bg-blue-50 px-2 py-1 rounded border border-blue-100 transition-colors"
                      >
                        <MapIcon className="w-3 h-3" />
                        {t('driver.open_in_maps', 'Open in Maps')}
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 w-full mt-4">
                <Button
                  variant="outline"
                  className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50 font-bold h-11"
                  onClick={() => onViewMap(item)}
                >
                  <MapIcon className="w-4 h-4 mr-2" /> {t('driver.view_map', 'View Map')}
                </Button>
                <Button
                  className="flex-[2] bg-green-600 hover:bg-green-700 text-white font-bold h-11"
                  onClick={() => onAccept(isGroup ? (item.orders?.[0]?.id) : item.id)}
                >
                  <Truck className="w-4 h-4 mr-2" />
                  {isGroup
                    ? t('driver.accept_group_delivery', 'Accept Group Delivery')
                    : t('driver.accept_delivery', 'Accept Delivery')}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
