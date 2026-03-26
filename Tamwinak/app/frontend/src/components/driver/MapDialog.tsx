import { lazy, Suspense } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Map as MapIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { AvailableOrder, Delivery } from '@/types';

// Leaflet is lazy-loaded only when the map dialog is opened
const DriverMap = lazy(() => import('@/components/DriverMap'));

interface MapDialogProps {
  open: boolean;
  onClose: () => void;
  order: AvailableOrder | Delivery | null;
  driverLat: number;
  driverLng: number;
  calculateOptimalRoute: (orderContext: any) => any[];
}

export function MapDialog({ open, onClose, order, driverLat, driverLng, calculateOptimalRoute }: MapDialogProps) {
  const { t } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-2xl w-[95vw] p-0 overflow-hidden h-[80vh] flex flex-col rounded-2xl">
        <DialogHeader className="px-4 py-3 bg-white border-b z-10 shadow-sm shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <MapIcon className="w-5 h-5 text-blue-600" />
            {t('driver.map.optimal_route', 'Optimal Delivery Route')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 relative z-0 w-full bg-gray-100">
          {order && (
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            }>
              <DriverMap
                driverLat={driverLat}
                driverLng={driverLng}
                orderInfo={order}
                calculateOptimalRoute={calculateOptimalRoute}
                t={t}
              />
            </Suspense>
          )}
        </div>

        <div className="bg-white p-4 border-t shrink-0 max-h-48 overflow-y-auto">
          <p className="font-bold text-sm mb-2 text-gray-800">{t('driver.map.route_sequence', 'Route Sequence:')}</p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Badge className="bg-green-600">{t('driver.map.start', 'Start')}</Badge>
              <span className="text-gray-600 truncate">{t('driver.map.your_location', 'Your Current Location')}</span>
            </div>
            {order &&
              calculateOptimalRoute(order)
                .filter((p: any) => p.lat != null && p.lng != null)
                .map((p: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 ml-3 pl-3 border-l-[2px] border-dashed border-gray-300">
                    <Badge className={p.isCustomer ? 'bg-red-600' : 'bg-blue-600'}>
                      {p.isCustomer
                        ? t('driver.map.dropoff', 'Drop-off')
                        : `${t('driver.map.pickup', 'Pickup')} ${idx + 1}`}
                    </Badge>
                    <span className="text-gray-900 font-medium truncate">{p.name}</span>
                  </div>
                ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
