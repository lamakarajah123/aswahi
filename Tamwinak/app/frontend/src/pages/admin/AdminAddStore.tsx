import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiCall } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPicker } from '@/components/MapPicker';
import { toast } from 'sonner';
import {
    User, Store, Package, Check, ChevronRight, ChevronLeft,
    Search, Plus, Minus, MapPin, Image, ArrowLeft, Loader2, Tag, Layers
} from 'lucide-react';
import { Product, Industry } from './types';
import { useLanguage } from '@/contexts/LanguageContext';

// ─── Step indicator ──────────────────────────────────────────────────────────
const getSteps = (t: (key: string, defaultVal: string) => string) => [
    { id: 1, label: t('admin.add_store.owner_account', 'Owner Account'), icon: User },
    { id: 2, label: t('admin.add_store.store_details', 'Store Details'), icon: Store },
    { id: 3, label: t('admin.add_store.add_products', 'Add Products'), icon: Package },
];

function StepIndicator({ current, steps }: { current: number, steps: { id: number, label: string, icon: React.ElementType }[] }) {
    return (
        <div className="flex items-center gap-0 mb-8">
            {steps.map((step, i) => {
                const Icon = step.icon;
                const done = current > step.id;
                const active = current === step.id;
                return (
                    <div key={step.id} className="flex items-center flex-1 last:flex-none">
                        <div className={`flex flex-col items-center gap-1 ${active ? 'opacity-100' : done ? 'opacity-100' : 'opacity-40'}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all
                                ${done ? 'bg-green-600 border-green-600 text-white'
                                    : active ? 'bg-white border-green-600 text-green-600'
                                        : 'bg-white border-gray-300 text-gray-400'}`}>
                                {done ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                            </div>
                            <span className={`text-xs font-medium whitespace-nowrap ${active ? 'text-green-700' : done ? 'text-green-600' : 'text-gray-400'}`}>
                                {step.label}
                            </span>
                        </div>
                        {i < steps.length - 1 && (
                            <div className={`h-0.5 flex-1 mx-2 mt-[-14px] transition-all ${done ? 'bg-green-500' : 'bg-gray-200'}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminAddStore() {
    const navigate = useNavigate();
    const { t, currentLanguage } = useLanguage();
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const [createdStoreId, setCreatedStoreId] = useState<number | null>(null);

    // Step 1 — Owner
    const [owner, setOwner] = useState({ name: '', email: '', password: '' });

    // Step 2 — Store
    const [store, setStore] = useState({
        name: '', description: '', address: '', phone: '',
        latitude: '32.2211', longitude: '35.2544', image_url: '',
        working_hours: '00:00-23:59',
        group_id: '',
    });

    const [allGroups, setAllGroups] = useState<any[]>([]);

    // Step 2 industries
    const [storeIndustriesAll, setStoreIndustriesAll] = useState<Industry[]>([]);
    const [selectedStoreIndustryIds, setSelectedStoreIndustryIds] = useState<Set<number>>(new Set());

    // Step 3 — Products
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [industries, setIndustries] = useState<Industry[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [productSearch, setProductSearch] = useState('');
    const [productIndustry, setProductIndustry] = useState('');
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [assigningSaving, setAssigningSaving] = useState(false);

    useEffect(() => {
        // Load industries for step 2 on mount
        apiCall.invoke({ url: '/api/v1/industries', method: 'GET' })
            .then(r => setStoreIndustriesAll(Array.isArray(r.data) ? r.data : []))
            .catch(() => { });
            
        apiCall.invoke({ url: '/api/v1/grocery/admin/store-groups', method: 'GET' })
            .then(r => setAllGroups(Array.isArray(r.data) ? r.data : []))
            .catch(() => { });
    }, []);

    useEffect(() => {
        if (step === 3) loadProducts();
    }, [step]);

    const loadProducts = async () => {
        setLoadingProducts(true);
        try {
            const [pRes, iRes] = await Promise.all([
                apiCall.invoke({ url: '/api/v1/entities/products?limit=500', method: 'GET' }),
                apiCall.invoke({ url: '/api/v1/industries', method: 'GET' }),
            ]);
            setAllProducts(pRes.data?.items || pRes.data?.data || (Array.isArray(pRes.data) ? pRes.data : []));
            setIndustries(Array.isArray(iRes.data) ? iRes.data : []);
        } catch {
            toast.error('Failed to load products');
        } finally {
            setLoadingProducts(false);
        }
    };

    const filteredProducts = useMemo(() => {
        return allProducts.filter(p => {
            if (productSearch && !p.name.toLowerCase().includes(productSearch.toLowerCase())) return false;
            if (productIndustry && String(p.industry_id) !== productIndustry) return false;
            return true;
        });
    }, [allProducts, productSearch, productIndustry]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => setStore(s => ({ ...s, image_url: reader.result as string }));
        reader.readAsDataURL(file);
    };

    const getCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast.error(t('admin.add_store.geolocation_not_supported', 'Geolocation is not supported by your browser'));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setStore(s => ({
                    ...s,
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

    // ── Step 1 → 2: Create the store+owner ────────────────────────────────────
    const handleCreateStore = async () => {
        if (!owner.email || !owner.password || !store.name || !store.address) {
            toast.error(t('admin.add_store.required_fields_error', 'Owner email, password, store name and address are required'));
            return;
        }
        setSaving(true);
        try {
            const res = await apiCall.invoke({
                url: '/api/v1/grocery/admin/stores/with-owner',
                method: 'POST',
                data: {
                    owner_name: owner.name || null,
                    email: owner.email,
                    password: owner.password,
                    store_name: store.name,
                    description: store.description || null,
                    address: store.address,
                    phone: store.phone || null,
                    image_url: store.image_url || null,
                    latitude: parseFloat(store.latitude) || 32.2211,
                    longitude: parseFloat(store.longitude) || 35.2544,
                    working_hours: store.working_hours,
                    group_id: store.group_id || null,
                },
            });
            const sid = res.data?.store?.id || res.data?.id;
            setCreatedStoreId(sid);

            // Save industries if any selected
            if (selectedStoreIndustryIds.size > 0 && sid) {
                try {
                    await apiCall.invoke({
                        url: `/api/v1/grocery/admin/stores/${sid}/industries`,
                        method: 'PUT',
                        data: { industry_ids: Array.from(selectedStoreIndustryIds) },
                    });
                } catch { /* non-critical */ }
            }

            toast.success(t('admin.add_store.store_created', 'Store and owner account created!'));
            setStep(3);
        } catch (e: unknown) {
            const err = e as Record<string, unknown>;
            toast.error((err?.response as any)?.data?.detail?.[0]?.message || (err?.response as any)?.data?.detail || err?.message || t('admin.add_store.create_failed', 'Failed to create store'));
        } finally {
            setSaving(false);
        }
    };

    // ── Step 3: Assign selected products ──────────────────────────────────────
    const handleAssignProducts = async () => {
        if (!createdStoreId || selectedIds.size === 0) {
            navigate('/admin/stores');
            return;
        }
        setAssigningSaving(true);
        try {
            await apiCall.invoke({
                url: `/api/v1/store-products/${createdStoreId}/add`,
                method: 'POST',
                data: { product_ids: Array.from(selectedIds) },
            });
            toast.success(t('admin.add_store.products_added_success', '{count} product(s) added to the store!').replace('{count}', String(selectedIds.size)));
            navigate('/admin/stores');
        } catch (e: unknown) {
            const err = e as Record<string, unknown>;
            toast.error((err?.response as any)?.data?.detail || t('admin.add_store.assign_failed', 'Failed to assign products'));
        } finally {
            setAssigningSaving(false);
        }
    };

    const toggleProduct = (id: number) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const selectAll = () => setSelectedIds(new Set(filteredProducts.map(p => p.id)));
    const clearAll = () => setSelectedIds(new Set());

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/admin/stores')} className="rounded-lg">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">{t('admin.add_store.title', 'Add New Store')}</h1>
                        <p className="text-sm text-gray-500">{t('admin.add_store.subtitle', 'Create a store, set its location, and assign products')}</p>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto">
                <StepIndicator current={step} steps={getSteps(t)} />

                {/* ─── Step 1: Owner ─────────────────────────────────────────── */}
                {step === 1 && (
                    <Card className="border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <User className="w-5 h-5 text-green-600" /> {t('admin.add_store.owner_account', 'Owner Account')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label>{t('admin.add_store.owner_name', 'Owner Name')}</Label>
                                <Input className="mt-1" placeholder={t('admin.add_store.owner_name_placeholder', 'Full name')} value={owner.name}
                                    onChange={e => setOwner(o => ({ ...o, name: e.target.value }))} />
                            </div>
                            <div>
                                <Label>{t('admin.add_store.email', 'Email *')}</Label>
                                <Input className="mt-1" type="email" placeholder="owner@example.com" value={owner.email}
                                    onChange={e => setOwner(o => ({ ...o, email: e.target.value }))} />
                            </div>
                            <div>
                                <Label>{t('admin.add_store.password', 'Password *')}</Label>
                                <Input className="mt-1" type="password" placeholder={t('admin.add_store.password_placeholder', 'Secure password')} value={owner.password}
                                    onChange={e => setOwner(o => ({ ...o, password: e.target.value }))} />
                            </div>
                            <div className="flex justify-end pt-2">
                                <Button className="bg-green-600 hover:bg-green-700 text-white gap-2"
                                    onClick={() => {
                                        if (!owner.email || !owner.password) { toast.error(t('admin.add_store.email_pass_required', 'Email and password are required')); return; }
                                        setStep(2);
                                    }}>
                                    {t('admin.add_store.next_store_details', 'Next: Store Details')} <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ─── Step 2: Store Details ──────────────────────────────────── */}
                {step === 2 && (
                    <Card className="border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Store className="w-5 h-5 text-green-600" /> {t('admin.add_store.store_details', 'Store Details')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <Label>{t('admin.add_store.store_name', 'Store Name *')}</Label>
                                    <Input className="mt-1" placeholder={t('admin.add_store.store_name_placeholder', 'e.g. Green Market')} value={store.name}
                                        onChange={e => setStore(s => ({ ...s, name: e.target.value }))} />
                                </div>
                                <div>
                                    <Label>{t('admin.add_store.phone', 'Phone Number')}</Label>
                                    <Input className="mt-1" placeholder="+970 5x xxx xxxx" value={store.phone}
                                        onChange={e => setStore(s => ({ ...s, phone: e.target.value }))} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-xs text-gray-500">{t('admin.add_store.working_hours_start', 'Start Time')}</Label>
                                        <Input
                                            type="time"
                                            className="mt-1"
                                            value={store.working_hours.split('-')[0] || '08:00'}
                                            onChange={(e) => {
                                                const end = store.working_hours.split('-')[1] || '22:00';
                                                setStore(s => ({ ...s, working_hours: `${e.target.value}-${end}` }));
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs text-gray-500">{t('admin.add_store.working_hours_end', 'End Time')}</Label>
                                        <Input
                                            type="time"
                                            className="mt-1"
                                            value={store.working_hours.split('-')[1] || '22:00'}
                                            onChange={(e) => {
                                                const start = store.working_hours.split('-')[0] || '08:00';
                                                setStore(s => ({ ...s, working_hours: `${start}-${e.target.value}` }));
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <Label>{t('admin.add_store.address', 'Store Address *')}</Label>
                                <Input className="mt-1" placeholder={t('admin.add_store.address_placeholder', 'Full address')} value={store.address}
                                    onChange={e => setStore(s => ({ ...s, address: e.target.value }))} />
                            </div>

                            <div>
                                <Label>{t('admin.add_store.description', 'Description')}</Label>
                                <Textarea className="mt-1" placeholder={t('admin.add_store.description_placeholder', 'A short description of the store...')} rows={2}
                                    value={store.description} onChange={e => setStore(s => ({ ...s, description: e.target.value }))} />
                            </div>

                            <div className="pt-2 border-t border-gray-100">
                                <Label className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                                    <Layers className="w-4 h-4 text-purple-600" />
                                    مجموعة التوصيل المشترك
                                </Label>
                                <select
                                    value={store.group_id}
                                    onChange={e => setStore({ ...store, group_id: e.target.value })}
                                    className="w-full h-11 px-4 py-2 text-base bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-600 outline-none transition-all shadow-sm"
                                >
                                    <option value="">-- بدون مجموعة (توصيل يعتمد على المسافة/المنطقة) --</option>
                                    {allGroups.map(g => (
                                        <option key={g.id} value={g.id}>
                                            {g.name} (₪{g.delivery_fee})
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-2 bg-purple-50 p-2 rounded-lg border border-purple-100 italic">
                                    تلميح: ربط المتجر بمجموعة يجعل سعر التوصيل ثابتاً (سعر المجموعة) حتى لو طلب العميل من متاجر أخرى في نفس المجموعة.
                                </p>
                            </div>

                            {/* Map */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <Label className="flex items-center gap-1.5 mb-0">
                                        <MapPin className="w-3.5 h-3.5 text-green-600" /> {t('admin.add_store.location_label', 'Store Location — click on the map to pin')}
                                    </Label>
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
                                <div className="mt-1.5">
                                    <MapPicker
                                        latitude={parseFloat(store.latitude) || 32.2211}
                                        longitude={parseFloat(store.longitude) || 35.2544}
                                        onLocationSelect={(lat, lng) =>
                                            setStore(s => ({ ...s, latitude: String(lat), longitude: String(lng) }))
                                        }
                                    />
                                </div>
                                <p className="text-xs text-gray-400 mt-1.5">
                                    📍 {t('admin.add_store.pinned', 'Pinned:')} {parseFloat(store.latitude).toFixed(5)}, {parseFloat(store.longitude).toFixed(5)}
                                </p>
                            </div>

                            {/* Industries */}
                            {storeIndustriesAll.length > 0 && (
                                <div>
                                    <Label className="flex items-center gap-1.5">
                                        <Tag className="w-3.5 h-3.5 text-green-600" /> {t('admin.add_store.industries', 'Industries')}
                                    </Label>
                                    <div className="flex flex-wrap gap-2 mt-1.5">
                                        {storeIndustriesAll.map(ind => {
                                            const active = selectedStoreIndustryIds.has(ind.id);
                                            return (
                                                <button
                                                    key={ind.id}
                                                    type="button"
                                                    onClick={() => setSelectedStoreIndustryIds(prev => {
                                                        const next = new Set(prev);
                                                        if (next.has(ind.id)) {
                                                            next.delete(ind.id);
                                                        } else {
                                                            next.add(ind.id);
                                                        }
                                                        return next;
                                                    })}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all
                                                        ${active
                                                            ? 'bg-purple-600 text-white border-purple-600'
                                                            : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-600'
                                                        }`}
                                                >
                                                    {ind.icon && <span>{ind.icon}</span>}
                                                    {t('industry.' + ind.name.toLowerCase().replace(/ & /g, '_').replace(/ /g, '_'), ind.name)}
                                                    {active && <Check className="w-3 h-3 ml-0.5" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Image */}
                            <div>
                                <Label className="flex items-center gap-1.5">
                                    <Image className="w-3.5 h-3.5 text-green-600" /> {t('admin.add_store.store_image', 'Store Image')}
                                </Label>
                                <Input className="mt-1.5" type="file" accept="image/*" onChange={handleImageUpload} />
                                {store.image_url && (
                                    <img src={store.image_url} alt="Preview" className="mt-2 h-24 w-32 object-cover rounded-lg border" loading="lazy" width={128} height={96} />
                                )}
                            </div>

                            <div className="flex justify-between pt-2">
                                <Button variant="outline" className="gap-2" onClick={() => setStep(1)}>
                                    <ChevronLeft className="w-4 h-4" /> {t('common.back', 'Back')}
                                </Button>
                                <Button className="bg-green-600 hover:bg-green-700 text-white gap-2"
                                    disabled={saving} onClick={handleCreateStore}>
                                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('admin.add_store.creating', 'Creating...')}</> : <>{t('admin.add_store.create_store', 'Create Store')} <ChevronRight className="w-4 h-4" /></>}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ─── Step 3: Products ───────────────────────────────────────── */}
                {step === 3 && (
                    <div className="space-y-4">
                        {/* Summary banner */}
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                <Check className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="font-semibold text-green-800">{t('admin.add_store.store_created_banner', 'Store "{storeName}" created!').replace('{storeName}', store.name)}</p>
                                <p className="text-sm text-green-700">{t('admin.add_store.pick_products', 'Now pick which products to assign to this store.')}</p>
                            </div>
                        </div>

                        <Card className="border-0 shadow-sm">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Package className="w-5 h-5 text-green-600" /> {t('admin.add_store.select_products', 'Select Products')}
                                        {selectedIds.size > 0 && (
                                            <Badge className="bg-green-600 text-white ml-1">{t('admin.add_store.selected_count', '{count} selected').replace('{count}', String(selectedIds.size))}</Badge>
                                        )}
                                    </CardTitle>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={selectAll} className="text-xs">
                                            <Plus className="w-3 h-3 mr-1" /> {t('admin.add_store.all_visible', 'All Visible')}
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={clearAll} className="text-xs text-gray-500">
                                            <Minus className="w-3 h-3 mr-1" /> {t('common.clear', 'Clear')}
                                        </Button>
                                    </div>
                                </div>

                                {/* Filters */}
                                <div className="flex flex-col sm:flex-row gap-2 mt-3">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                        <Input className="pl-8 h-8 text-sm" placeholder={t('admin.add_store.search_products', 'Search products...')}
                                            value={productSearch} onChange={e => setProductSearch(e.target.value)} />
                                    </div>
                                    <select
                                        className="h-8 text-sm border border-input rounded-md px-2 bg-background min-w-[140px]"
                                        value={productIndustry}
                                        onChange={e => setProductIndustry(e.target.value)}
                                    >
                                        <option value="">{t('admin.add_store.all_industries', 'All Industries')}</option>
                                        {industries.map(i => (
                                            <option key={i.id} value={String(i.id)}>
                                                {i.icon} {t('industry.' + i.name.toLowerCase().replace(/ & /g, '_').replace(/ /g, '_'), i.name)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </CardHeader>

                            <CardContent className="pt-0">
                                {loadingProducts ? (
                                    <div className="flex items-center justify-center py-10">
                                        <Loader2 className="w-6 h-6 animate-spin text-green-600" />
                                    </div>
                                ) : filteredProducts.length === 0 ? (
                                    <div className="text-center py-10 text-gray-400">
                                        <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                        <p className="text-sm">{t('home.no_products', 'No products found')}</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-1">
                                        {filteredProducts.map(p => {
                                            const selected = selectedIds.has(p.id);
                                            const industry = p.industry || industries.find(i => i.id === p.industry_id);
                                            return (
                                                <button
                                                    key={p.id}
                                                    onClick={() => toggleProduct(p.id)}
                                                    className={`flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all w-full
                                                        ${selected
                                                            ? 'border-green-500 bg-green-50'
                                                            : 'border-gray-100 hover:border-gray-300 bg-white hover:bg-gray-50'
                                                        }`}
                                                >
                                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0
                                                        ${selected ? 'bg-green-600 border-green-600' : 'border-gray-300'}`}>
                                                        {selected && <Check className="w-2.5 h-2.5 text-white" />}
                                                    </div>
                                                    {p.image_url ? (
                                                        <img src={p.image_url} alt={p.name} className="w-9 h-9 object-cover rounded shrink-0" loading="lazy" width={36} height={36} />
                                                    ) : (
                                                        <div className="w-9 h-9 bg-gray-100 rounded flex items-center justify-center shrink-0">
                                                            <Package className="w-4 h-4 text-gray-400" />
                                                        </div>
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="text-xs text-green-600 font-semibold">₪{p.price.toFixed(2)}</span>
                                                            {industry && (
                                                                <span className="text-[10px] text-purple-600 bg-purple-50 px-1.5 rounded">
                                                                    {industry.icon} {t('industry.' + industry.name.toLowerCase().replace(/ & /g, '_').replace(/ /g, '_'), industry.name)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <div className="flex justify-between">
                            <Button variant="outline" onClick={() => navigate('/admin/stores')}>
                                {t('admin.add_store.skip', 'Skip — Finish Later')}
                            </Button>
                            <Button className="bg-green-600 hover:bg-green-700 text-white gap-2"
                                disabled={assigningSaving} onClick={handleAssignProducts}>
                                {assigningSaving
                                    ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('common.saving', 'Saving...')}</>
                                    : <><Check className="w-4 h-4" /> {t('admin.add_store.add_and_finish', 'Add {count} Products & Finish').replace('{count}', selectedIds.size > 0 ? `${selectedIds.size}` : '')}</>
                                }
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
