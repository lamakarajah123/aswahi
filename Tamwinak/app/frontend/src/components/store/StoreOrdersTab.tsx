import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Package, Check, X, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { apiCall } from '@/lib/axios';
import { useLanguage } from '@/contexts/LanguageContext';
import type { StoreOrder } from '@/types';

interface Props {
  activeOrders: StoreOrder[];
  historyOrders: StoreOrder[];
  ordersPage: number;
  ordersTotalPages: number;
  onLoadOrders: (page: number) => void;
  onRefresh: () => void;
}

export function StoreOrdersTab({
  activeOrders,
  historyOrders,
  ordersPage,
  ordersTotalPages,
  onLoadOrders,
  onRefresh,
}: Props) {
  const { t, currentLanguage } = useLanguage();
  const [reportingMissing, setReportingMissing] = useState<StoreOrder | null>(null);
  const [selectedMissingItems, setSelectedMissingItems] = useState<string[]>([]);

  const handleOrderAction = async (orderId: number, status: string) => {
    try {
      await apiCall.invoke({
        url: `/api/v1/grocery/store/orders/${orderId}/status`,
        method: 'PUT',
        data: { status },
      });
      toast.success(`Order ${status}`);
      onRefresh();
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } }; data?: { detail?: string } };
      toast.error(e?.response?.data?.detail ?? e?.data?.detail ?? 'Failed to update order');
    }
  };

  const handleReportMissing = async () => {
    if (!reportingMissing || selectedMissingItems.length === 0) return;
    try {
      await apiCall.invoke({
        url: `/api/v1/grocery/store/orders/${reportingMissing.id}/report-missing`,
        method: 'POST',
        data: { missing_items: selectedMissingItems },
      });
      toast.success('Customer notified of missing items');
      setReportingMissing(null);
      setSelectedMissingItems([]);
      onRefresh();
    } catch {
      toast.error('Failed to report missing items');
    }
  };

  return (
    <>
      <div>
        <h3 className="font-semibold mb-4 text-gray-800">{t('store_dashboard.active_orders', 'Active Orders')}</h3>
        <div className="space-y-4">
          {activeOrders.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-lg border">
              <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">{t('store_dashboard.no_active_orders', 'No active orders')}</p>
            </div>
          ) : (
            [...activeOrders]
              .sort((a, b) => (b.status === 'awaiting_customer' ? 1 : 0) - (a.status === 'awaiting_customer' ? 1 : 0))
              .map((order) => {
                const isAwaiting = order.status === 'awaiting_customer';
                const missingItemIds = order.issue_details?.split(',') ?? [];
                return (
                  <Card
                    key={order.id}
                    className={`border-0 shadow-sm border-l-4 ${isAwaiting ? 'border-l-orange-500 bg-orange-50/10' : 'border-l-blue-500'}`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          {isAwaiting && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                          {t('orders.tracking.reference', 'Order Reference')} #{order.id}
                        </CardTitle>
                        <Badge
                          variant={isAwaiting ? 'outline' : 'secondary'}
                          className={isAwaiting ? 'border-orange-500 text-orange-600 bg-orange-50' : 'capitalize'}
                        >
                          {t(`status.${order.status}`, order.status)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {order.items?.map((item) => {
                        const isMissing = item.status === 'unavailable' || missingItemIds.includes(item.id.toString());
                        return (
                          <div
                            key={item.id}
                            className={`flex justify-between text-sm py-1 ${isMissing ? 'text-red-400 line-through' : ''}`}
                          >
                            <span>
                              {item.quantity} {item.unit_name || t('admin.orders.unit', 'unit')} {item.product_name}{' '}
                              {isMissing && `(${t('orders.missing.title', 'Missing')})`}
                              {item.customizations && item.customizations.map((stage: any, sIdx: number) => (
                                <div key={sIdx} className="flex flex-wrap gap-1 mt-0.5">
                                  {stage.options.map((opt: any, oIdx: number) => (
                                    <span key={oIdx} className="text-[10px] bg-indigo-50 text-indigo-600 px-1 py-0.5 rounded border border-indigo-100 font-bold whitespace-nowrap">
                                      {currentLanguage?.code === 'ar' ? (opt.name_ar || opt.name) : opt.name}
                                    </span>
                                  ))}
                                </div>
                              ))}
                            </span>
                            <span>₪{(Number(item.subtotal) || 0).toFixed(2)}</span>
                          </div>
                        );
                      })}
                      <div className="border-t mt-2 pt-2 flex justify-between font-semibold">
                        <span>{t('orders.details.subtotal', 'Items Total')}</span>
                        <span className="text-green-600">₪{(Number(order.subtotal) || 0).toFixed(2)}</span>
                      </div>
                      {order.delivery_address && (
                        <p className="text-xs text-gray-400 mt-2">📍 {order.delivery_address}</p>
                      )}
                      {order.notes && <p className="text-xs text-gray-400 mt-1">📝 {order.notes}</p>}
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {order.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => handleOrderAction(order.id, 'accepted')}
                            >
                              <Check className="w-3 h-3 mr-1" /> {t('orders.actions.accept', 'Accept')}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-orange-500 text-orange-600 hover:bg-orange-50"
                              onClick={() => { setReportingMissing(order); setSelectedMissingItems([]); }}
                            >
                              <X className="w-3 h-3 mr-1" /> {t('orders.missing.title', 'Missing Items?')}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleOrderAction(order.id, 'cancelled')}
                            >
                              <X className="w-3 h-3 mr-1" /> {t('orders.actions.reject', 'Reject')}
                            </Button>
                          </>
                        )}
                        {order.status === 'accepted' && (
                          <>
                            <Button
                              size="sm"
                              className="bg-purple-600 hover:bg-purple-700 text-white"
                              onClick={() => handleOrderAction(order.id, 'preparing')}
                            >
                              {t('orders.actions.start_preparing', 'Start Preparing')}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-orange-500 text-orange-600 hover:bg-orange-50"
                              onClick={() => { setReportingMissing(order); setSelectedMissingItems([]); }}
                            >
                              <X className="w-3 h-3 mr-1" /> {t('orders.missing.title', 'Missing Items?')}
                            </Button>
                          </>
                        )}
                        {order.status === 'preparing' && (
                          <>
                            <Button
                              size="sm"
                              className="bg-indigo-600 hover:bg-indigo-700 text-white"
                              onClick={() => handleOrderAction(order.id, 'ready')}
                            >
                              {t('orders.actions.mark_ready', 'Mark Ready')}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-orange-500 text-orange-600 hover:bg-orange-50"
                              onClick={() => { setReportingMissing(order); setSelectedMissingItems([]); }}
                            >
                              <X className="w-3 h-3 mr-1" /> {t('orders.missing.title', 'Missing Items?')}
                            </Button>
                          </>
                        )}
                        {isAwaiting && (
                          <Badge
                            variant="outline"
                            className="text-orange-600 border-orange-200 bg-orange-50 py-1 flex items-center gap-2"
                          >
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
                            </span>
                            {t('orders.status.awaiting_customer', 'Awaiting Customer Response...')}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
          )}
        </div>
      </div>

      <div className="mt-8">
        <h3 className="font-semibold mb-4 text-gray-800">{t('store_dashboard.history', 'Order History (Logs)')}</h3>
        <div className="space-y-4">
          {historyOrders.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-lg border">
              <p className="text-gray-500 text-sm">{t('store_dashboard.no_history', 'No historical orders yet')}</p>
            </div>
          ) : (
            historyOrders.map((order) => (
              <Card key={order.id} className="border-0 shadow-sm bg-gray-50 opacity-80">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base text-gray-600">Order #{order.id}</CardTitle>
                    <Badge
                      className={
                        order.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }
                    >
                      {order.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 mb-2">
                    {order.items?.map((item) => (
                      <div
                        key={item.id}
                        className={`flex justify-between text-xs ${
                          item.status === 'unavailable' ? 'text-red-400 line-through' : 'text-gray-500'
                        }`}
                      >
                        <span>
                          {item.quantity} {item.unit_name || t('admin.orders.unit', 'unit')} {item.product_name}
                          {item.customizations && item.customizations.map((stage: any, sIdx: number) => (
                            <div key={sIdx} className="flex flex-wrap gap-1 mt-0.5 opacity-70">
                                {stage.options.map((opt: any, oIdx: number) => (
                                    <span key={oIdx} className="text-[9px] bg-indigo-50 text-indigo-500 px-1 py-0.5 rounded border border-indigo-100 font-bold whitespace-nowrap">
                                        {opt.name}
                                    </span>
                                ))}
                            </div>
                          ))}
                        </span>
                        <span>₪{(Number(item.subtotal) || 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between font-semibold mt-1 pt-2 border-t border-gray-100">
                    <span>{t('orders.details.subtotal', 'Items Total')}</span>
                    <span>₪{(Number(order.subtotal) || 0).toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {ordersTotalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={ordersPage === 1}
            onClick={() => onLoadOrders(ordersPage - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-gray-500">
            {t('common.page', 'Page')} {ordersPage} / {ordersTotalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={ordersPage === ordersTotalPages}
            onClick={() => onLoadOrders(ordersPage + 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Report Missing Items Dialog */}
      <Dialog open={!!reportingMissing} onOpenChange={(open) => !open && setReportingMissing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t('orders.missing.title', 'Report Missing Items')} - #{reportingMissing?.id}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              {t(
                'orders.missing.select_missing',
                'Select the items that are currently out of stock. The customer will be asked if they want to proceed with the rest or cancel.',
              )}
            </p>
            <div className="space-y-2 mt-4 max-h-60 overflow-y-auto pr-2">
              {reportingMissing?.items?.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded border">
                  <input
                    type="checkbox"
                    id={`missing-${item.id}`}
                    className="w-4 h-4 cursor-pointer"
                    checked={selectedMissingItems.includes(item.id.toString())}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedMissingItems([...selectedMissingItems, item.id.toString()]);
                      } else {
                        setSelectedMissingItems(selectedMissingItems.filter((id) => id !== item.id.toString()));
                      }
                    }}
                  />
                  <label htmlFor={`missing-${item.id}`} className="text-sm flex-1 cursor-pointer">
                    {item.product_name}{' '}
                    <span className="text-gray-400">({item.quantity}x)</span>
                  </label>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setReportingMissing(null)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={handleReportMissing}
              disabled={selectedMissingItems.length === 0}
            >
              {t('orders.missing.report_btn', 'Notify Customer')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
