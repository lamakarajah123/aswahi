import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { apiCall } from '@/lib/axios';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Order } from '@/types';

interface Props {
  order: Order | null;
  onClose: () => void;
  onResolved: () => void;
}

export function OrderResolveMissingDialog({ order, onClose, onResolved }: Props) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);

  const handleAction = async (action: 'continue' | 'cancel') => {
    if (!order) return;
    try {
      setLoading(true);
      await apiCall.invoke({
        url: `/api/v1/grocery/orders/${order.id}/resolve-missing`,
        method: 'POST',
        data: { action },
      });
      toast.success(action === 'continue' ? 'Order updated. The store will proceed.' : 'Order cancelled.');
      onClose();
      onResolved();
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string; error?: string } } };
      toast.error(e?.response?.data?.detail ?? e?.response?.data?.error ?? 'Failed to update order');
    } finally {
      setLoading(false);
    }
  };

  const isStoreCancelled = order?.issue_details === 'STORE_CANCELLED';

  return (
    <Dialog open={!!order} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="w-5 h-5" />
            {isStoreCancelled
              ? t('orders.store_cancelled.title', 'Store Unfulfillable')
              : t('orders.missing.title', 'Missing Items')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {isStoreCancelled ? (
            <>
              <p className="text-sm text-gray-600 leading-relaxed">
                {t(
                  'orders.store_cancelled.msg',
                  'Unfortunately, the store is unable to fulfill this part of your order.',
                )}
              </p>
              <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                <p className="text-xs font-semibold text-red-800 uppercase tracking-wider mb-1">
                  {t('admin.orders.store', 'Store')}:
                </p>
                <p className="text-sm text-red-700 font-bold">
                  {order?.store_name || `ID: ${order?.store_id}`}
                </p>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600 leading-relaxed">
                {t('orders.missing.out_of_stock', 'Some items you requested in order #')}
                {order?.id}
                {t('orders.missing.out_of_stock2', ' are currently out of stock.')}
              </p>
              <div className="bg-orange-50 border border-orange-100 rounded-lg p-3">
                <p className="text-xs font-semibold text-orange-800 uppercase tracking-wider mb-2">
                  {t('orders.missing.unavailable', 'Unavailable Items:')}
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-orange-700">
                  {order?.issue_details?.split(',').map((missingId) => {
                    const item = order.items?.find((i) => i.id.toString() === missingId);
                    return (
                      <li key={missingId}>
                        {item ? `${item.quantity}x ${item.product_name}` : `Item ID: ${missingId}`}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </>
          )}
          <p className="text-sm text-gray-600">
            {isStoreCancelled
              ? t(
                  'orders.store_cancelled.question',
                  'Do you want to continue with the other items in your consolidated order, or cancel everything?',
                )
              : t(
                  'orders.missing.question',
                  'Do you want to continue with the rest of your order (your total will be adjusted), or cancel the entire order group?',
                )}
          </p>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          <Button
            variant="destructive"
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold"
            disabled={loading}
            onClick={() => handleAction('cancel')}
          >
            {t('orders.cancel_order', 'Cancel Order')}
          </Button>
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold"
            disabled={loading}
            onClick={() => handleAction('continue')}
          >
            {t('orders.missing.continue', 'Continue Anyway')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
