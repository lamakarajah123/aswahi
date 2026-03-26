import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Edit } from 'lucide-react';
import { toast } from 'sonner';
import { apiCall } from '@/lib/axios';
import { MapPicker } from '@/components/MapPicker';
import { useLanguage } from '@/contexts/LanguageContext';
import type { MyStore } from '@/types';

interface StoreFormState {
  name: string;
  description: string;
  address: string;
  phone: string;
  image_url: string;
  latitude: string;
  longitude: string;
  working_hours: string;
}

const DEFAULT_FORM: StoreFormState = {
  name: '',
  description: '',
  address: '',
  phone: '',
  image_url: '',
  latitude: '32.2211',
  longitude: '35.2544',
  working_hours: '00:00-23:59',
};

interface Props {
  myStore: MyStore | null;
  user: { role?: string } | null;
  createDialogOpen: boolean;
  onCreateDialogClose: () => void;
  onSaved: () => void;
}

export function StoreSettingsSection({
  myStore,
  user,
  createDialogOpen,
  onCreateDialogClose,
  onSaved,
}: Props) {
  const { t } = useLanguage();
  const [isEditingStore, setIsEditingStore] = useState(false);
  const [storeForm, setStoreForm] = useState<StoreFormState>(DEFAULT_FORM);

  const openEditStore = () => {
    if (myStore) {
      setStoreForm({
        name: myStore.name || '',
        description: myStore.description || '',
        address: myStore.address || '',
        phone: myStore.phone || '',
        image_url: myStore.image_url || '',
        latitude: String(myStore.latitude || '32.2211'),
        longitude: String(myStore.longitude || '35.2544'),
        working_hours: myStore.working_hours || '00:00-23:59',
      });
      setIsEditingStore(true);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setStoreForm((prev) => ({ ...prev, image_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveStore = async () => {
    try {
      if (!storeForm.name || !storeForm.address) {
        toast.error('Name and address are required');
        return;
      }
      const payload = {
        name: storeForm.name,
        description: storeForm.description || null,
        address: storeForm.address,
        phone: storeForm.phone || null,
        image_url: storeForm.image_url || null,
        latitude: parseFloat(storeForm.latitude) || 32.2211,
        longitude: parseFloat(storeForm.longitude) || 35.2544,
        working_hours: storeForm.working_hours,
        is_approved: myStore ? myStore.is_approved : user?.role === 'admin',
        is_active: myStore ? myStore.is_active : true,
      };

      if (myStore !== null) {
        await apiCall.invoke({ url: `/api/v1/entities/stores/${myStore.id}`, method: 'PUT', data: payload });
        toast.success('Store updated successfully!');
        setIsEditingStore(false);
      } else {
        await apiCall.invoke({
          url: '/api/v1/entities/stores',
          method: 'POST',
          data: { ...payload, rating: 0, total_ratings: 0 },
        });
        toast.success(
          user?.role === 'admin'
            ? 'Store created and automatically approved!'
            : 'Store created! Waiting for admin approval.',
        );
        onCreateDialogClose();
        setStoreForm(DEFAULT_FORM);
      }
      onSaved();
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string | { message: string }[] } }; message?: string };
      const detail = e?.response?.data?.detail;
      const msg = Array.isArray(detail) ? detail[0]?.message : detail;
      toast.error(msg ?? e?.message ?? 'Failed to save store');
    }
  };

  return (
    <>
      {/* Settings tab content */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{isEditingStore ? 'Edit Store Profile' : 'Store Settings'}</CardTitle>
            {!isEditingStore && (
              <Button size="sm" variant="outline" onClick={openEditStore}>
                <Edit className="w-4 h-4 mr-1" /> Edit Store Profile
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditingStore ? (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-1">Store Name *</p>
                  <Input
                    placeholder="Store Name"
                    value={storeForm.name}
                    onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Phone Number</p>
                  <Input
                    placeholder="Phone Number"
                    value={storeForm.phone}
                    onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-1">{t('admin.add_store.working_hours_start', 'Start Time')}</p>
                  <Input
                    type="time"
                    value={storeForm.working_hours.split('-')[0] || '08:00'}
                    onChange={(e) => {
                      const end = storeForm.working_hours.split('-')[1] || '22:00';
                      setStoreForm({ ...storeForm, working_hours: `${e.target.value}-${end}` });
                    }}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">{t('admin.add_store.working_hours_end', 'End Time')}</p>
                  <Input
                    type="time"
                    value={storeForm.working_hours.split('-')[1] || '22:00'}
                    onChange={(e) => {
                      const start = storeForm.working_hours.split('-')[0] || '08:00';
                      setStoreForm({ ...storeForm, working_hours: `${start}-${e.target.value}` });
                    }}
                  />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Description</p>
                <Textarea
                  placeholder="Store Description"
                  value={storeForm.description}
                  onChange={(e) => setStoreForm({ ...storeForm, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Store Image</p>
                <Input type="file" accept="image/*" onChange={handleImageUpload} />
                {storeForm.image_url && (
                  <img
                    src={storeForm.image_url}
                    alt="Preview"
                    className="h-32 object-cover rounded mt-2 border"
                    loading="lazy"
                    width={256}
                    height={128}
                  />
                )}
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Full Address *</p>
                <Input
                  placeholder="Address"
                  value={storeForm.address}
                  onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                />
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Location on Map</p>
                <div className="mb-2">
                  <MapPicker
                    latitude={parseFloat(storeForm.latitude) || 32.2211}
                    longitude={parseFloat(storeForm.longitude) || 35.2544}
                    onLocationSelect={(lat, lng) =>
                      setStoreForm({ ...storeForm, latitude: String(lat), longitude: String(lng) })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm text-gray-500">
                  <p>Lat: {storeForm.latitude}</p>
                  <p>Lng: {storeForm.longitude}</p>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setIsEditingStore(false)}>
                  Cancel
                </Button>
                <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleSaveStore}>
                  Save Changes
                </Button>
              </div>
            </div>
          ) : (
            <div>
              {myStore?.image_url && (
                <div className="mb-4">
                  <img
                    src={myStore.image_url}
                    alt={myStore.name}
                    className="w-full max-w-sm h-48 object-cover rounded-lg shadow-sm"
                    loading="lazy"
                    width={384}
                    height={192}
                  />
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Store Name</h4>
                  <p className="text-gray-900 font-medium">{myStore?.name}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Phone</h4>
                  <p className="text-gray-900 font-medium">{myStore?.phone || 'Not provided'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">{t('admin.add_store.working_hours', 'Working Hours')}</h4>
                  <p className="text-gray-900 font-medium">{myStore?.working_hours || '00:00-23:59'}</p>
                </div>
                <div className="md:col-span-2">
                  <h4 className="text-sm font-medium text-gray-500">Description</h4>
                  <p className="text-gray-900 font-medium">{myStore?.description || 'No description'}</p>
                </div>
                <div className="md:col-span-2">
                  <h4 className="text-sm font-medium text-gray-500">Address</h4>
                  <p className="text-gray-900 font-medium">{myStore?.address}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Status</h4>
                  <Badge variant={myStore?.is_approved ? 'default' : 'secondary'} className="mt-1">
                    {myStore?.is_approved ? 'Approved' : 'Pending Approval'}
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Active State</h4>
                  <Badge
                    variant={myStore?.is_active ? 'default' : 'secondary'}
                    className={myStore?.is_active ? 'bg-green-600 mt-1' : 'mt-1'}
                  >
                    {myStore?.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Store Dialog */}
      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            onCreateDialogClose();
            setStoreForm(DEFAULT_FORM);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Your Store</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Store Name *"
              value={storeForm.name}
              onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
            />
            <Textarea
              placeholder="Store Description"
              value={storeForm.description}
              onChange={(e) => setStoreForm({ ...storeForm, description: e.target.value })}
              rows={2}
            />
            <Input
              placeholder="Phone Number"
              value={storeForm.phone}
              onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-4 mt-1">
              <div>
                <Label className="text-xs text-gray-500">{t('admin.add_store.working_hours_start', 'Start Time')}</Label>
                <Input
                  type="time"
                  value={storeForm.working_hours.split('-')[0] || '08:00'}
                  onChange={(e) => {
                    const end = storeForm.working_hours.split('-')[1] || '22:00';
                    setStoreForm({ ...storeForm, working_hours: `${e.target.value}-${end}` });
                  }}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">{t('admin.add_store.working_hours_end', 'End Time')}</Label>
                <Input
                  type="time"
                  value={storeForm.working_hours.split('-')[1] || '22:00'}
                  onChange={(e) => {
                    const start = storeForm.working_hours.split('-')[0] || '08:00';
                    setStoreForm({ ...storeForm, working_hours: `${start}-${e.target.value}` });
                  }}
                />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Store Image</p>
              <Input type="file" accept="image/*" onChange={handleImageUpload} />
            </div>
            <Input
              placeholder="Full Address *"
              value={storeForm.address}
              onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
            />
            <div className="mb-2">
              <p className="text-sm text-gray-500 mb-1">Pick Location</p>
              <MapPicker
                latitude={parseFloat(storeForm.latitude) || 32.2211}
                longitude={parseFloat(storeForm.longitude) || 35.2544}
                onLocationSelect={(lat, lng) =>
                  setStoreForm({ ...storeForm, latitude: String(lat), longitude: String(lng) })
                }
              />
            </div>
            <p className="text-xs text-gray-500 italic mt-2">
              * Note: Your store will need admin approval before it becomes publicly visible to customers.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                onCreateDialogClose();
                setStoreForm(DEFAULT_FORM);
              }}
            >
              Cancel
            </Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleSaveStore}>
              Create Store
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
