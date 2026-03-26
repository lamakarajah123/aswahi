import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { apiCall } from '@/lib/axios';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Order } from '@/types';

interface Props {
  order: Order | null;
  onClose: () => void;
}

export function OrderRatingDialog({ order, onClose }: Props) {
  const { t } = useLanguage();
  const [storeRating, setStoreRating] = useState(0);
  const [driverRating, setDriverRating] = useState(0);
  const [comment, setComment] = useState('');

  const handleClose = () => {
    setStoreRating(0);
    setDriverRating(0);
    setComment('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!order) return;
    try {
      await apiCall.invoke({
        url: `/api/v1/grocery/orders/${order.id}/rate`,
        method: 'POST',
        data: {
          store_rating: storeRating || undefined,
          driver_rating: driverRating || undefined,
          comment: comment || undefined,
        },
      });
      toast.success('Rating submitted!');
      handleClose();
    } catch {
      toast.error('Failed to submit rating');
    }
  };

  return (
    <Dialog open={!!order} onOpenChange={() => handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t('orders.rating.title', 'Rate Order #')}
            {order?.id}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">{t('orders.rating.store', 'Store Rating')}</label>
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} onClick={() => setStoreRating(s)}>
                  <Star
                    className={`w-7 h-7 ${s <= storeRating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
                  />
                </button>
              ))}
            </div>
          </div>
          {order?.driver_id && (
            <div>
              <label className="text-sm font-medium">{t('orders.rating.driver', 'Driver Rating')}</label>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} onClick={() => setDriverRating(s)}>
                    <Star
                      className={`w-7 h-7 ${s <= driverRating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="text-sm font-medium">{t('orders.rating.comment', 'Comment (optional)')}</label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('orders.rating.placeholder', 'Share your experience...')}
              rows={3}
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t('orders.rating.cancel', 'Cancel')}
          </Button>
          <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleSubmit}>
            {t('orders.rating.submit', 'Submit Rating')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
