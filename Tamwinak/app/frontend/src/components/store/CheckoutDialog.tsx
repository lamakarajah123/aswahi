import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { MapPin, Map } from 'lucide-react';
import { toast } from 'sonner';
import { MapPicker } from '@/components/MapPicker';
import { apiCall } from '@/lib/axios';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle } from 'lucide-react';
import type { CartItem } from '@/types';

interface SavedAddress {
  id: string | number;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  is_default?: boolean;
}

interface CheckoutDialogProps {
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  storeId?: string | number;
  cartTotal: number;
  onSuccess: () => void;
}

export function CheckoutDialog({ open, onClose, cart, storeId, cartTotal, onSuccess }: CheckoutDialogProps) {
  const { t } = useLanguage();
  const { isCustomer } = useAuth();

  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryLat, setDeliveryLat] = useState(32.2211);
  const [deliveryLng, setDeliveryLng] = useState(35.2544);
  const [notes, setNotes] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [saveAddress, setSaveAddress] = useState(false);
  const [addressLabel, setAddressLabel] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [areaType, setAreaType] = useState<string | null>(null);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose();
      setShowMap(false);
    }
  };

  const activeStoreId = storeId ?? (cart.length > 0 ? cart[0].product?.store_id : undefined);

  const uniqueStoreIds = Array.from(new Set(cart.map(item => item.product?.store_id).filter(id => !!id)));

  useEffect(() => {
    if (open) {
      loadCheckoutData();
    }
  }, [open]);

  const updateLocationAndFee = async (lat: number, lng: number, addressStr?: string) => {
    setDeliveryLat(lat);
    setDeliveryLng(lng);
    if (addressStr) setDeliveryAddress(addressStr);
    
    if (uniqueStoreIds.length > 0) {
      try {
        setDeliveryError(null);
        const feeRes = await apiCall.invoke({
          url: '/api/v1/grocery/delivery-fee',
          method: 'GET',
          params: { store_ids: uniqueStoreIds.join(','), lat, lng },
        });
        setDeliveryFee(feeRes.data.delivery_fee);
        setAreaType(feeRes.data.area_type);
      } catch (err: any) {
        setDeliveryFee(0);
        setAreaType(err.response?.data?.area_type || 'C');
        setDeliveryError(err.response?.data?.detail || 'Delivery is not available here.');
      }
    } else {
      setDeliveryFee(2.99);
      setAreaType(null);
      setDeliveryError(null);
    }
  };

  const loadCheckoutData = async () => {
    let lat = deliveryLat;
    let lng = deliveryLng;

    if (navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch { /* use defaults */ }
    }

    try {
      const res = await apiCall.invoke({ url: '/api/v1/grocery/addresses', method: 'GET' });
      const addrs = res.data || [];
      setSavedAddresses(addrs);
      const defaultAddr = addrs.find((a: Record<string, unknown>) => a.is_default);
      if (defaultAddr) {
        lat = defaultAddr.latitude as number;
        lng = defaultAddr.longitude as number;
        setDeliveryAddress(defaultAddr.address as string);
      }
    } catch {
      setSavedAddresses([]);
    }

    await updateLocationAndFee(lat, lng);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error(t('admin.add_store.geolocation_not_supported', 'Geolocation is not supported by your browser'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        updateLocationAndFee(lat, lng, `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        toast.success(t('admin.add_store.location_updated', 'Location updated to current position'));
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error(t('admin.add_store.location_permission_error', 'Please allow location access or check your GPS settings'));
      },
      { enableHighAccuracy: true }
    );
  };

  const submitOrder = async () => {
    if (!deliveryAddress.trim()) {
      toast.error('Please enter a delivery address');
      return;
    }
    try {
      setSubmitting(true);
      const items = cart.map((c) => ({
        product_id: c.product.id,
        product_name: c.product.name,
        quantity: c.quantity,
        unit_price: Number(c.price),
        subtotal: Number(c.price) * c.quantity,
        unit_id: c.unitId,
        unit_name: c.unit,
        unit_name_ar: c.unitAr || null,
        customizations: c.customizations || null,
      }));
      const baseData = {
        delivery_address: deliveryAddress,
        delivery_lat: deliveryLat,
        delivery_lng: deliveryLng,
        notes: notes || undefined,
      };

      // If cart has multiple stores OR we are not specifically in ONE store's context, use smart order
      const isMultiStore = uniqueStoreIds.length > 1;
      
      if (!isMultiStore && activeStoreId !== undefined && activeStoreId !== null) {
        const groupId = `GRP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await apiCall.invoke({
          url: '/api/v1/grocery/orders',
          method: 'POST',
          data: { store_id: Number(activeStoreId), items, ...baseData, group_id: groupId },
        });
      } else {
        await apiCall.invoke({
          url: '/api/v1/grocery/orders/smart',
          method: 'POST',
          data: { items, ...baseData },
        });
      }

      if (saveAddress && deliveryAddress.trim()) {
        try {
          await apiCall.invoke({
            url: '/api/v1/grocery/addresses',
            method: 'POST',
            data: {
              label: addressLabel || 'Home',
              address: deliveryAddress,
              latitude: deliveryLat,
              longitude: deliveryLng,
              is_default: savedAddresses.length === 0,
            },
          });
        } catch { /* silently fail */ }
      }

      onSuccess();
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } }; data?: { detail?: string } };
      const detail = e.response?.data?.detail ?? e.data?.detail;
      toast.error(detail ?? 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>{t('checkout.title', 'Checkout')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {savedAddresses.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                {t('checkout.saved_addresses', 'Saved Addresses')}
              </label>
              <div className="space-y-1.5">
                {savedAddresses.map((addr) => (
                  <button
                    key={addr.id}
                    onClick={() => {
                      updateLocationAndFee(addr.latitude, addr.longitude, addr.address);
                      setShowMap(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all flex items-center gap-2 ${
                      deliveryAddress === addr.address
                        ? 'border-green-500 bg-green-50 text-green-800 ring-1 ring-green-200'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <MapPin className="w-4 h-4 shrink-0 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium block truncate">{addr.label}</span>
                      <span className="text-xs text-gray-500 block truncate">{addr.address}</span>
                    </div>
                    {addr.is_default && (
                      <Badge variant="secondary" className="text-[9px] shrink-0">Default</Badge>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-gray-700">
                {t('checkout.delivery_address', 'Delivery Address *')}
              </label>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-green-600 hover:text-green-700 h-7 px-2"
                onClick={() => setShowMap(!showMap)}
              >
                <Map className="w-3.5 h-3.5 mr-1" />
                {showMap ? t('checkout.hide_map', 'Hide Map') : t('checkout.pick_on_map', 'Pick on Map')}
              </Button>
            </div>
            <Input
              placeholder={t('checkout.address_placeholder', 'Enter your delivery address')}
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              className="focus-visible:ring-green-600"
            />
          </div>

          {showMap && (
            <div className="space-y-2 bg-gray-50 p-3 rounded-lg border border-gray-100 mt-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500 flex-1">
                  {t('checkout.map_instruction', 'Tap on the map to set your delivery location')}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] sm:text-xs font-bold border-green-200 text-green-700 hover:bg-green-50 px-2 py-0 gap-1"
                  onClick={getCurrentLocation}
                >
                  <MapPin className="w-3 h-3" /> {t('admin.add_store.get_current_location', 'Get Current Location')}
                </Button>
              </div>
              <MapPicker
                latitude={deliveryLat}
                longitude={deliveryLng}
                onLocationSelect={(lat, lng) => {
                  updateLocationAndFee(lat, lng, `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
                }}
              />
              <p className="text-xs text-gray-400 text-center">
                📍 {deliveryLat.toFixed(5)}, {deliveryLng.toFixed(5)}
              </p>
            </div>
          )}

          {deliveryAddress.trim() && (
            <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border border-gray-100">
              <input
                type="checkbox"
                id="save-address-store"
                checked={saveAddress}
                onChange={(e) => setSaveAddress(e.target.checked)}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <label htmlFor="save-address-store" className="text-sm text-gray-700 flex-1 cursor-pointer">
                {t('checkout.save_address', 'Save this address for future orders')}
              </label>
              {saveAddress && (
                <Input
                  value={addressLabel}
                  onChange={(e) => setAddressLabel(e.target.value)}
                  placeholder="Label"
                  className="w-24 h-8 text-xs"
                />
              )}
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-700">
              {t('checkout.notes', 'Notes (optional)')}
            </label>
            <Textarea
              placeholder={t('checkout.notes_placeholder', 'Any special instructions...')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1"
              rows={2}
            />
          </div>

          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm py-1">
              <span className="text-gray-500">{t('cart.subtotal', 'Subtotal')}</span>
              <span className="font-medium text-gray-900">{cartTotal > 0 ? `₪${cartTotal.toFixed(2)}` : t('common.price_tbd', 'سيتم التحديد')}</span>
            </div>
            <div className="flex justify-between text-sm py-1">
              <span className="text-gray-500">{t('checkout.delivery_fee', 'Delivery Fee')}</span>
              <span className="font-medium text-gray-900">₪{(Number(deliveryFee) || 0).toFixed(2)}</span>
            </div>

            
            {deliveryError && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-start gap-2 text-xs mt-2 border border-red-200">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{deliveryError}</p>
              </div>
            )}

            <div className="flex justify-between text-base font-bold mt-2 pt-2 border-t border-dashed border-gray-200">
              <span>{t('checkout.total', 'Total')}</span>
              <span className="text-green-600 text-lg">
                {(Number(cartTotal) + Number(deliveryFee)) > 0 ? `₪${(Number(cartTotal) + Number(deliveryFee)).toFixed(2)}` : t('common.price_tbd', 'سيتم التحديد')}
              </span>
            </div>
          </div>
          
          {!isCustomer && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 text-amber-800">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold">{t('checkout.restricted_title', 'Business Account Restricted')}</p>
                <p>{t('checkout.restricted_desc', 'Orders can only be placed by customer accounts. Please sign in with a customer account to continue.')}</p>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('common.cancel', 'Cancel')}</Button>
          <Button
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={submitOrder}
            disabled={submitting || !isCustomer || !!deliveryError}
          >
            {submitting
              ? t('checkout.placing_order', 'Placing Order...')
              : t('checkout.place_order', 'Place Order')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
