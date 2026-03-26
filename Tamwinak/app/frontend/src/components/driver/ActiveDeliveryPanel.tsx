import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, CheckCircle, AlertTriangle, Map as MapIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Delivery } from '@/types';

interface ActiveDeliveryPanelProps {
  deliveries: Delivery[];
  onUpdateStatus: (orderId: number, status: string) => void;
  onViewMap: (delivery: Delivery) => void;
  onReturn: (orderId: number) => void;
}

export function ActiveDeliveryPanel({ deliveries, onUpdateStatus, onViewMap, onReturn }: ActiveDeliveryPanelProps) {
  const { t, currentLanguage } = useLanguage();

  if (deliveries.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">{t('store_dashboard.no_history', 'No delivery history')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {deliveries.map((d) => {
        const isGroup = d.is_group;
        const displayId = isGroup ? d.group_id : `#${d.id}`;
        const totalFee = isGroup
          ? (d.orders?.reduce((sum, o) => sum + o.delivery_fee, 0) || 0)
          : (d.delivery_fee || 0);
        const firstOrderId = isGroup ? d.orders?.[0]?.id : d.id;

        return (
          <Card key={isGroup ? d.group_id : d.id} className={`border-0 shadow-md ${isGroup ? 'ring-2 ring-green-50' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {isGroup && (
                      <Badge className="bg-green-600 text-white text-[9px] h-4">
                        {t('orders.page.consolidated_order', 'Grouped')}
                      </Badge>
                    )}
                    <p className="font-bold text-gray-900">{t('driver.task', 'Task')} {displayId}</p>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(isGroup ? d.orders : [d])?.map((o: any, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-[10px] bg-white text-gray-600">
                        🏬 {o.store_name}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="secondary" className="mb-1 bg-gray-100 text-gray-700 font-bold capitalize text-[10px]">
                    {t(`status.${d.status}`, d.status.replace('_', ' '))}
                  </Badge>
                  <p className="text-sm font-bold text-green-600" dir="ltr">₪{totalFee.toFixed(2)}</p>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 space-y-2 mb-3">
                <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <span className="w-4 text-center">👤</span> {d.customer_name}
                </p>
                <p className="text-xs text-blue-600 font-medium flex items-center gap-1.5 pb-2 border-b border-gray-200">
                  <span className="w-4 text-center">📞</span> {d.customer_phone}
                </p>
                <p className="text-xs text-gray-500 flex items-start gap-1.5 pt-1">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 text-red-400 shrink-0" />
                  <span className="font-medium flex-1">{d.delivery_address}</span>
                  {d.delivery_lat && d.delivery_lng && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${d.delivery_lat},${d.delivery_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto flex items-center gap-1 text-[10px] sm:text-xs text-blue-600 hover:text-blue-800 font-bold bg-blue-50 px-2 py-1 rounded-md border border-blue-100 transition-colors"
                    >
                      <MapIcon className="w-3 h-3" />
                      {t('driver.open_in_maps', 'Open in Maps')}
                    </a>
                  )}
                </p>
                {d.notes && (
                  <div className="bg-amber-50 p-2 rounded-lg border border-amber-100 flex items-start gap-1.5">
                    <span className="text-amber-500 font-bold text-[10px]">ℹ️</span>
                    <span className="text-[10px] text-amber-700 italic">{d.notes}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                {(d.status === 'ready' || d.status === 'picked_up') && (
                  <div className="space-y-2 mt-2">
                    <p className="text-xs font-bold text-gray-700">{t('driver.pickup_requirements', 'Pickup Requirements:')}</p>
                    {(isGroup ? d.orders : [d])?.map((o: any) => (
                      <div key={o.id} className="flex flex-col text-sm bg-white border border-gray-200 p-2 rounded-lg gap-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-xs text-gray-800">🏬 {o.store_name}</span>
                          {o.status === 'ready' ? (
                            <Button
                              size="sm"
                              className="h-7 text-[10px] bg-orange-600 hover:bg-orange-700"
                              onClick={() => onUpdateStatus(o.id, 'picked_up')}
                            >
                              {t('driver.actions.confirm_pickup', 'Confirm Pickup')}
                            </Button>
                          ) : (
                            <span className="text-green-600 text-[10px] font-bold flex items-center pr-1">
                              <CheckCircle className="w-3 h-3 mr-1" /> {t('status.picked_up', 'Picked Up')}
                            </span>
                          )}
                        </div>
                        <div className="border-t border-gray-100 pt-1">
                          {o.items?.map((item: any, iidx: number) => {
                            const unitLabel = currentLanguage?.code === 'ar' && item.unit_name_ar ? item.unit_name_ar : (item.unit_name || '');
                            return (
                              <p key={iidx} className="text-[10px] text-gray-500">
                                • {item.quantity}x {item.product_name} {unitLabel && <span className="text-gray-400">({unitLabel})</span>}
                              </p>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {(isGroup ? d.orders.every((o: any) => o.status === 'picked_up') : d.status === 'picked_up') && (
                  <Button
                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-white h-10 font-bold"
                    onClick={() => firstOrderId !== undefined && onUpdateStatus(firstOrderId, 'delivering')}
                  >
                    {t('driver.actions.mark_on_way', 'Mark All On the Way')}
                  </Button>
                )}

                {(isGroup ? d.orders.some((o: any) => o.status === 'delivering') : d.status === 'delivering') && (
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white h-10 font-bold"
                    onClick={() => firstOrderId !== undefined && onUpdateStatus(firstOrderId, 'delivered')}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" /> {t('driver.actions.complete_delivery', 'Complete Group Delivery')}
                  </Button>
                )}

                {d.status !== 'delivered' && d.status !== 'returned' && (
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <Button
                      variant="outline"
                      className="border-blue-200 text-blue-700 hover:bg-blue-50 h-10 font-bold"
                      onClick={() => onViewMap(d)}
                    >
                      <MapIcon className="w-4 h-4 mr-2 text-blue-500" />
                      {t('driver.actions.view_route', 'View Route')}
                    </Button>
                    <Button
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 h-10 font-bold"
                      onClick={() => firstOrderId !== undefined && onReturn(firstOrderId)}
                    >
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      {t('driver.actions.return', 'Return (إرجاع)')}
                    </Button>
                  </div>
                )}
                <p className="text-[9px] text-gray-400 text-center mt-1">
                  First Ordered: {new Date(d.created_at).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
