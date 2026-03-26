import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiCall } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPicker } from '@/components/MapPicker';
import { toast } from 'sonner';
import {
    Store, MapPin, Image as ImageIcon, ArrowLeft, Loader2,
    Save, Check, X, Package, Shield, Tag, Layers
} from 'lucide-react';
import { Industry } from './types';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AdminEditStore() {
    const { t, currentLanguage } = useLanguage();
    const { storeId } = useParams<{ storeId: string }>();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Industry selection
    const [allIndustries, setAllIndustries] = useState<Industry[]>([]);
    const [selectedIndustryIds, setSelectedIndustryIds] = useState<Set<number>>(new Set());

    const [form, setForm] = useState({
        name: '',
        description: '',
        address: '',
        phone: '',
        image_url: '',
        latitude: '32.2211',
        longitude: '35.2544',
        is_approved: false,
        is_active: true,
        commission_rate: '10',
        working_hours: '00:00-23:59',
        group_id: '',
    });

    const [allGroups, setAllGroups] = useState<any[]>([]);

    const [originalOwner, setOriginalOwner] = useState({ email: '', name: '' });

    useEffect(() => {
        if (storeId) {
            loadStore();
            loadIndustries();
            loadGroups();
        }
    }, [storeId]);

    const loadStore = async () => {
        try {
            setLoading(true);
            const [storesRes, industriesRes] = await Promise.all([
                apiCall.invoke({ url: '/api/v1/grocery/admin/stores?limit=1000', method: 'GET' }),
                apiCall.invoke({ url: `/api/v1/grocery/admin/stores/${storeId}/industries`, method: 'GET' }),
            ]);
            const stores: any[] = Array.isArray(storesRes.data?.data) ? storesRes.data.data : (Array.isArray(storesRes.data) ? storesRes.data : []);
            const store = stores.find(s => String(s.id) === storeId);
            if (!store) { toast.error(t('admin.edit_store.not_found', 'Store not found')); navigate('/admin/stores'); return; }

            setForm({
                name: store.name || '',
                description: store.description || '',
                address: store.address || '',
                phone: store.phone || '',
                image_url: store.image_url || '',
                latitude: String(store.latitude || '32.2211'),
                longitude: String(store.longitude || '35.2544'),
                is_approved: store.is_approved ?? false,
                is_active: store.is_active ?? true,
                commission_rate: String(store.commission_rate ?? '10'),
                working_hours: store.working_hours || '00:00-23:59',
                group_id: store.group_id ? String(store.group_id) : '',
            });
            setOriginalOwner({ email: store.owner_email || '', name: store.owner_name || '' });

            // Set currently assigned industries
            const assignedIds: number[] = (industriesRes.data || []).map((i: any) => i.id);
            setSelectedIndustryIds(new Set(assignedIds));
        } catch {
            toast.error(t('admin.edit_store.load_failed', 'Failed to load store'));
        } finally {
            setLoading(false);
        }
    };

    const loadIndustries = async () => {
        try {
            const res = await apiCall.invoke({ url: '/api/v1/industries', method: 'GET' });
            setAllIndustries(Array.isArray(res.data) ? res.data : []);
        } catch { /* non-critical */ }
    };

    const loadGroups = async () => {
        try {
            const res = await apiCall.invoke({ url: '/api/v1/grocery/admin/store-groups', method: 'GET' });
            setAllGroups(res.data || []);
        } catch { /* non-critical */ }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => setForm(f => ({ ...f, image_url: reader.result as string }));
        reader.readAsDataURL(file);
    };

    const getCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast.error(t('admin.add_store.geolocation_not_supported', 'Geolocation is not supported by your browser'));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setForm(f => ({
                    ...f,
                    latitude: String(position.coords.latitude),
                    longitude: String(position.coords.longitude)
                }));
                toast.success(t('admin.add_store.location_updated', 'Location updated to current position'));
            },
            (error) => {
                console.error('Geolocation error:', error);
                toast.error(t('admin.add_store.location_permission_error', 'Please allow location access or check your GPS settings'));
            },
            { enableHighAccuracy: true }
        );
    };

    const handleSave = async () => {
        if (!form.name || !form.address) {
            toast.error(t('admin.add_store.required_fields_error', 'Store name and address are required'));
            return;
        }
        setSaving(true);
        try {
            await Promise.all([
                apiCall.invoke({
                    url: `/api/v1/grocery/admin/stores/${storeId}`,
                    method: 'PUT',
                    data: {
                        name: form.name,
                        description: form.description || null,
                        address: form.address,
                        phone: form.phone || null,
                        image_url: form.image_url || null,
                        latitude: parseFloat(form.latitude) || 32.2211,
                        longitude: parseFloat(form.longitude) || 35.2544,
                        is_approved: form.is_approved,
                        is_active: form.is_active,
                        commission_rate: parseFloat(form.commission_rate) || 10,
                        working_hours: form.working_hours,
                        group_id: form.group_id || null,
                    },
                }),
                apiCall.invoke({
                    url: `/api/v1/grocery/admin/stores/${storeId}/industries`,
                    method: 'PUT',
                    data: { industry_ids: Array.from(selectedIndustryIds) },
                }),
            ]);
            toast.success(t('admin.edit_store.update_success', 'Store updated successfully!'));
            navigate('/admin/stores');
        } catch (e: any) {
            toast.error(e?.response?.data?.detail || t('admin.edit_store.update_failed', 'Failed to update store'));
        } finally {
            setSaving(false);
        }
    };

    const toggleIndustry = (id: number) => {
        setSelectedIndustryIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/stores')} className="rounded-lg">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <div className="flex items-center gap-2">
                            {form.image_url ? (
                                <img src={form.image_url} alt={form.name}
                                    className="w-10 h-10 rounded-lg object-cover border border-gray-100" loading="lazy" width={40} height={40} />
                            ) : (
                                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                                    <Store className="w-5 h-5 text-purple-500" />
                                </div>
                            )}
                            <div>
                                <h1 className="text-lg font-semibold text-gray-900">{form.name || t('admin.edit_store.title', 'Edit Store')}</h1>
                                <p className="text-sm text-gray-400">{t('admin.edit_store.id', 'ID #')}{storeId}</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => navigate('/admin/stores')}>{t('common.cancel', 'Cancel')}</Button>
                        <Button
                            className="bg-green-600 hover:bg-green-700 text-white gap-2"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving
                                ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('common.saving', 'Saving...')}</>
                                : <><Save className="w-4 h-4" /> {t('common.save_changes', 'Save Changes')}</>
                            }
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ── Main form (left 2/3) ── */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Basic Info */}
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Store className="w-4 h-4 text-green-600" /> {t('admin.add_store.store_details', 'Store Information')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <Label>{t('admin.add_store.store_name', 'Store Name *')}</Label>
                                    <Input className="mt-1" value={form.name}
                                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                                </div>
                                <div>
                                    <Label>{t('admin.add_store.phone', 'Phone Number')}</Label>
                                    <Input className="mt-1" value={form.phone}
                                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-xs text-gray-500">{t('admin.add_store.working_hours_start', 'Start Time')}</Label>
                                        <Input
                                            type="time"
                                            className="mt-1"
                                            value={form.working_hours.split('-')[0] || '08:00'}
                                            onChange={(e) => {
                                                const end = form.working_hours.split('-')[1] || '22:00';
                                                setForm({ ...form, working_hours: `${e.target.value}-${end}` });
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs text-gray-500">{t('admin.add_store.working_hours_end', 'End Time')}</Label>
                                        <Input
                                            type="time"
                                            className="mt-1"
                                            value={form.working_hours.split('-')[1] || '22:00'}
                                            onChange={(e) => {
                                                const start = form.working_hours.split('-')[0] || '08:00';
                                                setForm({ ...form, working_hours: `${start}-${e.target.value}` });
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <Label>{t('admin.add_store.address', 'Address *')}</Label>
                                <Input className="mt-1" value={form.address}
                                    onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                            </div>
                            <div>
                                <Label>{t('admin.add_store.description', 'Description')}</Label>
                                <Textarea className="mt-1 resize-none" rows={3} value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Map */}
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <MapPin className="w-4 h-4 text-green-600" /> {t('admin.add_store.location_label', 'Store Location')}
                                </CardTitle>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-[10px] sm:text-xs font-bold border-green-200 text-green-700 hover:bg-green-50 px-2.5 py-0 gap-1.5 shadow-sm"
                                    onClick={getCurrentLocation}
                                >
                                    <MapPin className="w-3 h-3" /> {t('admin.add_store.get_current_location', 'Get Current Location')}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <MapPicker
                                latitude={parseFloat(form.latitude) || 32.2211}
                                longitude={parseFloat(form.longitude) || 35.2544}
                                onLocationSelect={(lat, lng) =>
                                    setForm(f => ({ ...f, latitude: String(lat), longitude: String(lng) }))
                                }
                            />
                            <p className="text-xs text-gray-400 mt-2">
                                📍 {parseFloat(form.latitude).toFixed(5)}, {parseFloat(form.longitude).toFixed(5)}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Image */}
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <ImageIcon className="w-4 h-4 text-green-600" /> {t('admin.add_store.store_image', 'Store Image')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-4 items-start">
                                {form.image_url ? (
                                    <img src={form.image_url} alt="Store"
                                        className="w-24 h-24 object-cover rounded-xl border border-gray-100 shrink-0" loading="lazy" width={96} height={96} />
                                ) : (
                                    <div className="w-24 h-24 rounded-xl bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center shrink-0">
                                        <ImageIcon className="w-8 h-8 text-gray-300" />
                                    </div>
                                )}
                                <div className="flex-1 space-y-2">
                                    <Input type="file" accept="image/*" onChange={handleImageUpload} />
                                    {form.image_url && (
                                        <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50"
                                            onClick={() => setForm(f => ({ ...f, image_url: '' }))}>
                                            <X className="w-3.5 h-3.5 mr-1" /> {t('admin.edit_store.remove_image', 'Remove Image')}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ── Sidebar (right 1/3) ── */}
                <div className="space-y-4">
                    {/* Status */}
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Shield className="w-4 h-4 text-green-600" /> {t('admin.edit_store.status_settings', 'Status & Settings')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Approved */}
                             <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                    <p className="text-sm font-medium text-gray-700">{t('admin.edit_store.approved', 'Approved')}</p>
                                    <p className="text-xs text-gray-400">{t('admin.edit_store.visible_to_customers', 'Visible to customers')}</p>
                                </div>
                                <button
                                    onClick={() => setForm(f => ({ ...f, is_approved: !f.is_approved }))}
                                    className={`w-10 h-6 rounded-full transition-colors relative ${form.is_approved ? 'bg-green-500' : 'bg-gray-300'}`}
                                >
                                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.is_approved ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                </button>
                            </div>

                            {/* Active */}
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                    <p className="text-sm font-medium text-gray-700">{t('admin.edit_store.active', 'Active')}</p>
                                    <p className="text-xs text-gray-400">{t('admin.edit_store.operational', 'Store is operational')}</p>
                                </div>
                                <button
                                    onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                                    className={`w-10 h-6 rounded-full transition-colors relative ${form.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
                                >
                                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.is_active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                </button>
                            </div>

                            {/* Commission */}
                            <div>
                                <Label className="text-sm">{t('admin.edit_store.commission_rate', 'Commission Rate (%)')}</Label>
                                <Input
                                    type="number" min="0" max="100" step="0.5"
                                    className="mt-1"
                                    value={form.commission_rate}
                                    onChange={e => setForm(f => ({ ...f, commission_rate: e.target.value }))}
                                />
                            </div>

                            {/* Store Group */}
                            <div className="pt-2">
                                <Label className="text-sm flex items-center gap-1.5">
                                    <Layers className="w-3.5 h-3.5 text-purple-600" />
                                    مجموعة التوصيل المشترك
                                </Label>
                                <select
                                    value={form.group_id}
                                    onChange={e => setForm(f => ({ ...f, group_id: e.target.value }))}
                                    className="w-full h-10 px-3 py-2 mt-1 text-sm bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                >
                                    <option value="">-- بدون مجموعة (توصيل فردي) --</option>
                                    {allGroups.map(g => (
                                        <option key={g.id} value={g.id}>
                                            {g.name} (₪{g.delivery_fee})
                                        </option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-gray-400 mt-1">تحديد مجموعة يوحد سعر التوصيل مع جميع متاجر المجموعة عند طلب العميل منها معاً.</p>
                            </div>

                            <div className="pt-1 border-t border-gray-100">
                                <div className="flex gap-2 flex-wrap">
                                    {form.is_approved
                                        ? <Badge className="bg-green-100 text-green-700 hover:bg-green-100"><Check className="w-3 h-3 mr-1" />{t('admin.edit_store.approved', 'Approved')}</Badge>
                                        : <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100"><X className="w-3 h-3 mr-1" />{t('admin.stores.pending', 'Pending')}</Badge>
                                    }
                                    {form.is_active
                                        ? <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">{t('admin.edit_store.active', 'Active')}</Badge>
                                        : <Badge className="bg-red-100 text-red-700 hover:bg-red-100">{t('admin.stores.archived', 'Archived')}</Badge>
                                    }
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Owner info (read-only) */}
                    {(originalOwner.email || originalOwner.name) && (
                        <Card className="border-0 shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base text-gray-700">{t('admin.add_store.owner_account', 'Owner Account')}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                {originalOwner.name && <p className="text-gray-600"><span className="font-medium">{t('common.name', 'Name')}:</span> {originalOwner.name}</p>}
                                {originalOwner.email && <p className="text-gray-600"><span className="font-medium">{t('common.email', 'Email')}:</span> {originalOwner.email}</p>}
                                <p className="text-xs text-gray-400 pt-1">{t('admin.edit_store.owner_creds_notice', 'Owner credentials can only be changed by the owner themselves.')}</p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Industries */}
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Tag className="w-4 h-4 text-green-600" /> {t('admin.add_store.industries', 'Industries')}
                                {selectedIndustryIds.size > 0 && (
                                    <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 ml-1">
                                        {t('admin.add_store.selected_count', '{count} selected').replace('{count}', String(selectedIndustryIds.size))}
                                    </Badge>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {allIndustries.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-2">{t('admin.edit_store.no_industries', 'No industries available')}</p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {allIndustries.map(ind => {
                                        const active = selectedIndustryIds.has(ind.id);
                                        return (
                                            <button
                                                key={ind.id}
                                                onClick={() => toggleIndustry(ind.id)}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all
                                                    ${active
                                                        ? 'bg-purple-600 text-white border-purple-600'
                                                        : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-600'
                                                    }`}
                                            >
                                                {ind.icon && <span>{ind.icon}</span>}
                                                {currentLanguage?.code === 'ar' && ind.name_ar ? ind.name_ar : ind.name}
                                                {active && <Check className="w-3 h-3 ml-0.5" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick actions */}

                    <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base text-gray-700">{t('admin.edit_store.quick_actions', 'Quick Actions')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Button variant="outline" className="w-full gap-2 justify-start text-blue-600 border-blue-200 hover:bg-blue-50"
                                onClick={() => navigate('/admin/store-products', { state: { storeId: Number(storeId) } })}>
                                <Package className="w-4 h-4" /> {t('admin.edit_store.manage_products', 'Manage Products')}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
