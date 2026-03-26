import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const RETURN_REASONS = [
  'رفض الزبون استلام الطلب',
  'عدم الرد على الهاتف',
  'عدم وجود الزبون في الموقع',
  'عنوان خاطئ أو غير مكتمل',
];

interface ReturnOrderDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export function ReturnOrderDialog({ open, onClose, onConfirm }: ReturnOrderDialogProps) {
  const { t } = useLanguage();
  const [returnReason, setReturnReason] = useState<string>(RETURN_REASONS[0]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-red-600 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> {t('driver.return.title', 'Return Order')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-gray-600">
            {t('driver.return.desc', 'Please specify the reason for returning this order. This will notify the customer and the admin.')}
          </p>
          <Select value={returnReason} onValueChange={setReturnReason}>
            <SelectTrigger>
              <SelectValue placeholder={t('common.select_placeholder', 'Select a reason')} />
            </SelectTrigger>
            <SelectContent>
              {RETURN_REASONS.map((reason) => {
                const reasonLabel =
                  reason === RETURN_REASONS[0] ? t('driver.return.reason_customer_refused') :
                  reason === RETURN_REASONS[1] ? t('driver.return.reason_no_answer') :
                  reason === RETURN_REASONS[2] ? t('driver.return.reason_not_at_location') :
                  t('driver.return.reason_wrong_address');
                return <SelectItem key={reason} value={reason}>{reasonLabel}</SelectItem>;
              })}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('common.cancel', 'Cancel')}</Button>
          <Button
            variant="destructive"
            className="bg-red-600 hover:bg-red-700"
            onClick={() => onConfirm(returnReason)}
          >
            {t('driver.return.confirm', 'Confirm Return')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
