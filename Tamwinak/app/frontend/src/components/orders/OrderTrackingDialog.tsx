import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CheckCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Order } from '@/types';

const TRACKING_STEPS = [
  { id: 'pending', labelKey: 'status.pending', label: 'Order Placed', descKey: 'status.pending_desc', desc: 'Awaiting store confirmation' },
  { id: 'accepted', labelKey: 'status.accepted', label: 'Accepted', descKey: 'status.accepted_desc', desc: 'Store has accepted your order' },
  { id: 'preparing', labelKey: 'status.preparing', label: 'Preparing', descKey: 'status.preparing_desc', desc: 'Your items are being prepared' },
  { id: 'ready', labelKey: 'status.ready', label: 'Ready', descKey: 'status.ready_desc', desc: 'Waiting for a driver' },
  { id: 'picked_up', labelKey: 'status.picked_up', label: 'Picked Up', descKey: 'status.picked_up_desc', desc: 'Driver has picked up your order' },
  { id: 'delivering', labelKey: 'status.delivering', label: 'On the Way', descKey: 'status.delivering_desc', desc: 'Driver is heading to your location' },
  { id: 'delivered', labelKey: 'status.delivered', label: 'Delivered', descKey: 'status.delivered_desc', desc: 'Order has been delivered' },
];

interface Props {
  order: Order | null;
  onClose: () => void;
}

export function OrderTrackingDialog({ order, onClose }: Props) {
  const { t } = useLanguage();

  const stepIds = useMemo(() => TRACKING_STEPS.map((s) => s.id), []);

  const getStepStatus = (currentStatus: string, stepId: string) => {
    if (currentStatus === 'cancelled') return 'cancelled';
    const currentIdx = stepIds.indexOf(currentStatus);
    const stepIdx = stepIds.indexOf(stepId);
    if (stepIdx < currentIdx) return 'completed';
    if (stepIdx === currentIdx) return 'current';
    return 'pending';
  };

  return (
    <Dialog open={!!order} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t('orders.tracking.title', 'Track Order')} #{order?.id}
          </DialogTitle>
        </DialogHeader>
        {order && (
          <div className="py-4">
            <div className="flex justify-between items-center mb-6 bg-gray-50 p-3 rounded-lg border">
              <div>
                <p className="text-xs text-gray-500">{t('orders.tracking.reference', 'Order Reference')}</p>
                <p className="font-semibold text-sm">#{order.id}</p>
              </div>
              {order.driver_id && (
                <div className="text-right">
                  <p className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full inline-block mb-1">
                    {t('orders.tracking.assigned_driver', 'Assigned Driver')}
                  </p>
                  <p className="font-medium text-sm text-gray-700">
                    {t('orders.tracking.on_the_way', 'On the way to you')}
                  </p>
                </div>
              )}
            </div>

            <div className="relative border-l-2 border-gray-200 ml-4 space-y-6">
              {TRACKING_STEPS.map((step) => {
                const status = getStepStatus(order.status, step.id);
                let iconColor = 'bg-gray-200 text-gray-400';
                let textColor = 'text-gray-400';
                let ring = '';

                if (status === 'completed') {
                  iconColor = 'bg-green-500 text-white';
                  textColor = 'text-gray-800';
                } else if (status === 'current') {
                  iconColor = 'bg-blue-600 text-white';
                  textColor = 'text-blue-700 font-semibold';
                  ring = 'ring-4 ring-blue-100';
                }

                return (
                  <div key={step.id} className="relative pl-6">
                    <div
                      className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full flex items-center justify-center ${iconColor} ${ring}`}
                    >
                      {status === 'completed' && <CheckCircle className="w-3 h-3 text-white" />}
                    </div>
                    <div>
                      <p className={`text-sm ${textColor}`}>{t(step.labelKey, step.label)}</p>
                      {status === 'current' && (
                        <p className="text-xs text-gray-500 mt-1">{t(step.descKey, step.desc)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button className="w-full bg-gray-100 text-gray-700 hover:bg-gray-200" onClick={onClose}>
            {t('orders.tracking.close', 'Close Tracker')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
