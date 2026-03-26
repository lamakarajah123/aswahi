import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Package, Star, Truck, XCircle, MapPin, AlertTriangle, ChefHat,
  Clock, CheckCircle
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Order } from '@/types';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  accepted: { label: 'Accepted', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  preparing: { label: 'Preparing', color: 'bg-purple-100 text-purple-700', icon: ChefHat },
  ready: { label: 'Ready', color: 'bg-indigo-100 text-indigo-700', icon: Package },
  picked_up: { label: 'Picked Up', color: 'bg-orange-100 text-orange-700', icon: Truck },
  delivering: { label: 'On the Way', color: 'bg-cyan-100 text-cyan-700', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle },
  awaiting_customer: { label: 'Action Required', color: 'bg-orange-500 text-white animate-pulse', icon: Clock },
};

function deriveGroupStatus(statuses: string[]): string {
  const activeStatuses = statuses.filter((s) => s !== 'cancelled');
  if (activeStatuses.length === 0) return 'cancelled';
  if (activeStatuses.includes('awaiting_customer')) return 'awaiting_customer';
  if (activeStatuses.every((s) => s === 'delivered')) return 'delivered';
  if (activeStatuses.includes('delivering') || activeStatuses.includes('delivered')) return 'delivering';
  if (activeStatuses.includes('picked_up')) return 'picked_up';
  if (activeStatuses.includes('ready')) return 'ready';
  if (activeStatuses.includes('preparing')) return 'preparing';
  if (activeStatuses.includes('accepted')) return 'accepted';
  return 'pending';
}

interface Props {
  groupKey: string;
  groupOrders: Order[];
  onRate: (order: Order) => void;
  onTrack: (order: Order) => void;
  onCancel: (params: { groupId?: string; id?: number }) => void;
  onResolve: (order: Order) => void;
}

export function OrderGroupCard({ groupOrders, onRate, onTrack, onCancel, onResolve }: Props) {
  const { t } = useLanguage();

  const isGroup = groupOrders.length > 1;
  const firstOrder = groupOrders[0];
  const groupTotal = groupOrders.reduce((sum, o) => sum + o.total, 0);
  const groupSubtotal = groupOrders.reduce((sum, o) => sum + o.subtotal, 0);
  const groupDeliveryFee = groupOrders.reduce((sum, o) => sum + o.delivery_fee, 0);
  const groupStatus = deriveGroupStatus(groupOrders.map((o) => o.status));
  const statusConf = STATUS_CONFIG[groupStatus] || STATUS_CONFIG.pending;
  const StatusIcon = statusConf.icon;

  const actionRequiredOrder = groupOrders.find(
    (o) => o.status === 'awaiting_customer' || o.issue_details === 'STORE_CANCELLED',
  );

  return (
    <Card className={`border-0 shadow-md ${isGroup ? 'bg-white ring-2 ring-green-100' : ''}`}>
      <CardHeader className="pb-3 border-b border-gray-50 bg-gray-50/50 rounded-t-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isGroup ? 'bg-green-100' : 'bg-gray-100'}`}>
              <Package className={`w-5 h-5 ${isGroup ? 'text-green-600' : 'text-gray-500'}`} />
            </div>
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                {isGroup
                  ? t('orders.page.consolidated_order', 'Consolidated Order')
                  : `${t('orders.tracking.reference', 'Order Reference')} #${firstOrder.id}`}
              </CardTitle>
              <p className="text-[10px] text-gray-400 font-medium">
                {firstOrder.created_at ? new Date(firstOrder.created_at).toLocaleString() : ''}
              </p>
            </div>
          </div>
          <div className="text-right">
            <Badge className={`${statusConf.color} border-0 px-2 py-0.5 text-[10px] mb-1 capitalize`}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {t(`status.${groupStatus}`, statusConf.label)}
            </Badge>
            <p className="text-sm font-bold text-gray-900" dir="ltr">
              ₪{(Number(groupTotal) || 0).toFixed(2)}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        <div className="space-y-1.5 px-1">
          {groupOrders.flatMap((o) => o.items || []).map((item, idx) => (
            <div key={`${item.id}-${idx}`} className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <span className="px-1.5 h-5 flex items-center justify-center bg-gray-100 rounded text-[10px] font-bold text-gray-500 w-auto min-w-[20px]">
                  {item.quantity} {item.unit_name || ''}
                </span>
                <span className="text-gray-700">{item.product_name}</span>
              </div>
              <span className="text-gray-400 font-medium" dir="ltr">
                ₪{(Number(item.subtotal) || 0).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-dashed border-gray-100 mt-2 space-y-1">
          {isGroup && (
            <>
              <div className="flex justify-between text-[11px]">
                <span className="text-gray-500">{t('orders.subtotal', 'Subtotal')}</span>
                <span className="text-gray-700 font-medium" dir="ltr">
                  ₪{(Number(groupSubtotal) || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-gray-500">{t('orders.delivery_fee', 'Delivery Fee')}</span>
                <span className="text-gray-700 font-medium" dir="ltr">
                  ₪{(Number(groupDeliveryFee) || 0).toFixed(2)}
                </span>
              </div>
            </>
          )}
          {firstOrder.delivery_address && (
            <div className="flex items-start gap-1 pb-1">
              <MapPin className="w-3 h-3 text-gray-400 mt-0.5" />
              <p className="text-[10px] text-gray-400 leading-tight flex-1">{firstOrder.delivery_address}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          {groupStatus === 'pending' || groupStatus === 'awaiting_customer' ? (
            <>
              {actionRequiredOrder && (
                <Button
                  size="sm"
                  className="h-9 text-xs flex-1 bg-orange-500 hover:bg-orange-600 border-none text-white font-bold"
                  onClick={() => onResolve(actionRequiredOrder)}
                >
                  <AlertTriangle className="w-3.5 h-3.5 mr-1.5" /> {t('orders.action_required', 'Action Required')}
                </Button>
              )}
              {!actionRequiredOrder && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs flex-1 border-gray-200"
                  onClick={() => onTrack(firstOrder)}
                >
                  <Truck className="w-3.5 h-3.5 mr-1.5 text-blue-600" /> {t('orders.page.track', 'Track')}
                </Button>
              )}
              <Button
                variant="destructive"
                size="sm"
                className="h-9 text-xs flex-1 bg-red-600 hover:bg-red-700 text-white font-bold"
                onClick={() =>
                  onCancel(firstOrder.group_id ? { groupId: firstOrder.group_id } : { id: firstOrder.id })
                }
              >
                <XCircle className="w-3.5 h-3.5 mr-1.5" /> {t('orders.cancel_order', 'Cancel Order')}
              </Button>
            </>
          ) : groupStatus === 'delivered' ? (
            <Button variant="outline" size="sm" className="h-9 text-xs flex-1" onClick={() => onRate(firstOrder)}>
              <Star className="w-3.5 h-3.5 mr-1.5 text-yellow-500 fill-yellow-500" />{' '}
              {t('orders.page.rate_order', 'Rate Order')}
            </Button>
          ) : groupStatus !== 'cancelled' ? (
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs flex-1 border-gray-200"
              onClick={() => onTrack(firstOrder)}
            >
              <Truck className="w-3.5 h-3.5 mr-1.5 text-blue-600" />{' '}
              {t('orders.page.track_progress', 'Track Progress')}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
