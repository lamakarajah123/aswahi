import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiCall } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Plus, Edit, Trash2, Store as StoreIcon, AlertCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { DeliveryArea, AdminStore } from './types';
import { useLanguage } from '@/contexts/LanguageContext';
import React, { Suspense } from 'react';

// Lazy load the map to avoid bundling Leaflet when not needed
const AreaDrawMap = React.lazy(() => import('@/components/AreaDrawMap'));

const AREA_TYPES: ('A' | 'B')[] = ['A', 'B'];
const TYPE_COLORS = {
    'A': '#10B981', // Emerald
    'B': '#3B82F6', // Blue
    'C': '#EF4444', // Red (for legacy or automatic)
};


export default function AdminAreas() {
    const { t, currentLanguage } = useLanguage();
    const [areas, setAreas] = useState<DeliveryArea[]>([]);
    const [stores, setStores] = useState<AdminStore[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editArea, setEditArea] = useState<DeliveryArea | null>(null);
    const [form, setForm] = useState<{
        store_id: string;
        area_type: 'A' | 'B' | 'C';
        name: string;
        name_ar: string;
        delivery_fee: string;
        is_active: boolean;
        boundaries: any;
    }>({
        store_id: '',
        area_type: 'A',
        name: '',
        name_ar: '',
        delivery_fee: '0',
        is_active: true,
        boundaries: null,
    });
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<DeliveryArea | null>(null);
    const [deleting, setDeleting] = useState(false);

    const loadData = useCallback(async (signal?: AbortSignal, skipGlobalLoading = false) => {
        try {
            if (!skipGlobalLoading) setLoading(true);
            const [areasRes, storesRes] = await Promise.all([
                apiCall.invoke({ url: '/api/v1/areas', method: 'GET', signal }),
                apiCall.invoke({ url: '/api/v1/grocery/admin/stores', method: 'GET', signal })
            ]);
            const nextAreas = Array.isArray(areasRes.data) ? areasRes.data : [];
            setAreas(nextAreas);
            setStores(Array.isArray(storesRes.data?.data) ? storesRes.data.data : []);
            return nextAreas;
        } catch (err: any) {
            if (err?.code === 'ERR_CANCELED') return [];
            const detail = err.response?.data?.detail || err.message;
            toast.error(`${t('error.load_data', 'Failed to load data')}: ${detail}`);
            return [];
        } finally {
            if (!skipGlobalLoading) setLoading(false);
        }

    }, [t]);

    useEffect(() => {
        const controller = new AbortController();
        loadData(controller.signal);
        return () => controller.abort();
    }, [loadData]);

    const selectedStore = useMemo(() => 
        stores.find(s => s.id.toString() === form.store_id),
    [stores, form.store_id]);

    const openAdd = () => {
        setEditArea(null);
        setForm({
            store_id: '',
            area_type: 'A',
            name: '',
            name_ar: '',
            delivery_fee: '0',
            is_active: true,
            boundaries: null,
        });
        setDialogOpen(true);
    };

    const openEdit = (area: DeliveryArea) => {
        setEditArea(area);
        setForm({
            store_id: area.store_id?.toString() || '',
            area_type: area.area_type || 'A',
            name: area.name,
            name_ar: area.name_ar || '',
            delivery_fee: area.delivery_fee.toString(),
            is_active: area.is_active,
            boundaries: area.boundaries,
        });
        setDialogOpen(true);
    };

    const handleSave = async (addNext = false) => {
        if (!form.store_id) {
            toast.error(t('error.store_req', 'Please select a store'));
            return;
        }
        if (!form.name || !form.name.trim()) {
            toast.error(t('error.area_name_req', 'Area name is required'));
            return;
        }
        if (!form.boundaries) {
            toast.error(t('error.area_boundary_req', 'Please draw an area on the map'));
            return;
        }
        
        setSaving(true);
        try {
            const feeVal = parseFloat(form.delivery_fee);
            const storeIdNum = parseInt(form.store_id);
            const payload = {
                store_id: storeIdNum,
                area_type: form.area_type,
                name: (form.name || '').trim(),
                name_ar: (form.name_ar || '').trim() || null,
                color: (form.area_type && form.area_type in TYPE_COLORS) ? TYPE_COLORS[form.area_type as keyof typeof TYPE_COLORS] : '#3B82F6',
                delivery_fee: form.area_type === 'C' ? 0 : (isNaN(feeVal) ? 0 : feeVal),
                is_active: form.is_active,
                boundaries: form.boundaries,
            };
            
            if (editArea) {
                await apiCall.invoke({ url: `/api/v1/areas/${editArea.id}`, method: 'PUT', data: payload });
                toast.success(t('success.area_updated', 'Area updated!'));
            } else {
                await apiCall.invoke({ url: '/api/v1/areas', method: 'POST', data: payload });
                toast.success(t('success.area_added', 'Area added!'));
            }
            
            // Success - Get fresh data
            const freshAreas = await loadData(undefined, true);

            // Handle "Save & Next" flow
            if (addNext && !editArea) {
                const currentStoreAreas = freshAreas.filter(a => a.store_id === storeIdNum);
                const currentTypes = new Set(currentStoreAreas.map(a => a.area_type));
                
                const nextType = AREA_TYPES.find(type => !currentTypes.has(type));
                
                if (nextType) {
                    setForm({
                        store_id: form.store_id,
                        area_type: nextType,
                        name: `${selectedStore?.name || ''} Zone ${nextType}`.trim(),
                        name_ar: `${selectedStore?.name || ''} منطقة ${nextType}`.trim(),
                        delivery_fee: '0',
                        is_active: true,
                        boundaries: null
                    });
                    toast.info(`${t('admin.areas.moving_to', 'Moving to')} Zone ${nextType}...`);
                    // We don't close the dialog, we just reset the form for the next zone
                    return;
                }
            }
            
            // Default: Close dialog
            setDialogOpen(false);
        } catch (e: unknown) {
            console.error('[AdminAreas_Save_Error]', e);
            const err = e as { response?: { data?: { detail?: any } }; message?: string };
            const detail = err.response?.data?.detail;
            
            let message = t('error.save_area', 'Failed to save area');
            if (typeof detail === 'string') message = detail;
            else if (Array.isArray(detail)) message = detail[0]?.message || JSON.stringify(detail);
            else if (detail && typeof detail === 'object') message = detail.message || JSON.stringify(detail);
            else if (err.message) message = err.message;
            
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };


    const handleDelete = async (area: DeliveryArea) => {
        setDeleting(true);
        try {
            await apiCall.invoke({ url: `/api/v1/areas/${area.id}`, method: 'DELETE' });
            toast.success(t('success.area_deleted', 'Area deleted'));
            setDeleteConfirm(null);
            loadData(undefined, true);
        } catch (e: unknown) {
            const err = e as { response?: { data?: { detail?: string } } };
            toast.error(err?.response?.data?.detail || t('error.delete_area', 'Failed to delete area'));
        } finally {
            setDeleting(false);
        }
    };

    // Group areas by store
    const areasByStore = useMemo(() => {
        const grouped: Record<number, DeliveryArea[]> = {};
        areas.forEach(a => {
            if (a.store_id) {
                if (!grouped[a.store_id]) grouped[a.store_id] = [];
                grouped[a.store_id].push(a);
            }
        });
        return grouped;
    }, [areas]);

    // Prepare map format for existing areas except the one currently being edited
    const mappedExistingAreas = useMemo(() => 
        areas
            .filter(a => a.id !== editArea?.id && a.store_id?.toString() === form.store_id)
            .map(a => ({
                name: `${a.area_type}: ${a.name}`,
                color: a.color || (a.area_type ? TYPE_COLORS[a.area_type] : '#3B82F6'),
                boundaries: a.boundaries,
                isActive: a.is_active
            })),
    [areas, editArea, form.store_id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                            <MapPin className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-gray-900 text-lg">
                                {t('admin.areas.title', 'Delivery Areas')}
                            </h2>
                            <p className="text-sm text-gray-500">
                                {Object.keys(areasByStore).length} {t('admin.areas.stores_with_areas', 'stores with delivery zones')}
                            </p>
                        </div>
                    </div>
                    <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white gap-2" onClick={openAdd}>
                        <Plus className="w-4 h-4" /> {t('admin.areas.add', 'Add Area')}
                    </Button>
                </div>
            </div>

            {/* Overall Map View */}
            {areas.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
                    <Suspense fallback={<div className="h-[400px] bg-slate-50 flex items-center justify-center text-gray-400">{t('common.loading_map', 'Loading map...')}</div>}>
                        <AreaDrawMap
                            mode="view"
                            existingAreas={areas.map(a => ({
                                name: `${a.area_type}: ${a.name}`,
                                color: a.color || (a.area_type ? TYPE_COLORS[a.area_type] : '#3B82F6'),
                                boundaries: a.boundaries,
                                isActive: a.is_active
                            }))}
                            height={400}
                        />
                    </Suspense>
                </div>
            )}

            {/* Areas Grouped by Store */}
            {Object.keys(areasByStore).length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
                    <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">{t('admin.areas.no_areas', 'No areas yet')}</p>
                    <p className="text-sm text-gray-400 mt-1">
                        {t('admin.areas.no_areas_desc', 'Assign delivery zones (A, B, C) to your stores.')}
                    </p>
                    <Button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white" onClick={openAdd}>
                        <Plus className="w-4 h-4 ltr:mr-2 rtl:ml-2" /> {t('admin.areas.add_first', 'Add First Area')}
                    </Button>
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(areasByStore).map(([storeId, storeAreas]) => {
                        const store = stores.find(s => s.id.toString() === storeId);
                        return (
                            <div key={storeId} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="bg-gray-50 px-4 py-3 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <StoreIcon className="w-4 h-4 text-gray-500" />
                                        <span className="font-bold text-gray-900 text-sm sm:text-base">{store?.name || `Store #${storeId}`}</span>
                                    </div>
                                    <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-md border">{storeAreas.length} {t('admin.areas.zones', 'Zones')}</span>
                                </div>
                                <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {storeAreas.sort((a, b) => (a.area_type || '').localeCompare(b.area_type || '')).map((area) => (
                                        <div
                                            key={area.id}
                                            className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col hover:border-blue-200 transition-colors"
                                        >
                                            <div className="p-4 flex-1 flex flex-col">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div 
                                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold" 
                                                            style={{ backgroundColor: area.area_type ? TYPE_COLORS[area.area_type] : '#3B82F6' }}
                                                        >
                                                            {area.area_type}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-gray-900 leading-tight">{area.name}</p>
                                                            <p className="text-xs text-gray-500">
                                                                {area.area_type === 'C' 
                                                                    ? t('admin.areas.no_delivery', 'No Delivery') 
                                                                    : `₪${area.delivery_fee} ${t('admin.areas.fee', 'Fee')}`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-gray-400 hover:text-blue-600 h-8 w-8"
                                                            onClick={() => openEdit(area)}
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-gray-400 hover:text-red-600 h-8 w-8"
                                                            onClick={() => setDeleteConfirm(area)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {storeAreas.length < 3 && (
                                        <button 
                                            onClick={() => {
                                                const missing = AREA_TYPES.find(type => !storeAreas.some(a => a.area_type === type));
                                                setEditArea(null);
                                                setForm({
                                                    store_id: storeId,
                                                    area_type: missing || 'A',
                                                    name: '',
                                                    name_ar: '',
                                                    delivery_fee: '0',
                                                    is_active: true,
                                                    boundaries: null,
                                                });
                                                setDialogOpen(true);
                                            }}
                                            className="border-2 border-dashed border-gray-100 rounded-xl p-4 flex items-center justify-center gap-2 text-gray-400 hover:border-blue-200 hover:text-blue-600 transition-all group"
                                        >
                                            <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                            <span className="text-sm font-medium">{t('admin.areas.add_missing_zone', 'Add Missing Zone')}</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add / Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-4xl w-[95vw] sm:w-[90vw] rounded-2xl p-0 overflow-hidden flex flex-col h-[95vh] sm:h-auto sm:max-h-[90vh]">
                    <DialogHeader className="px-4 sm:px-6 py-4 border-b bg-white shrink-0">
                        <DialogTitle className="text-sm sm:text-base">
                            {editArea
                                ? t('admin.areas.edit_title', 'Edit Delivery Area')
                                : t('admin.areas.add_title', 'Add Delivery Area')}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6 flex flex-col lg:flex-row gap-4 sm:gap-6">
                        {/* Map Section */}
                        <div className="flex-1 min-h-[400px] bg-white p-2 rounded-xl border shadow-sm flex flex-col">
                            <div className="flex-1 relative">
                                <Suspense fallback={<div className="h-full flex items-center justify-center text-gray-400 min-h-[300px]">{t('common.loading_map', 'Loading map...')}</div>}>
                                    <AreaDrawMap
                                        mode="edit"
                                        existingAreas={mappedExistingAreas}
                                        editableBoundary={form.boundaries}
                                        editableColor={TYPE_COLORS[form.area_type]}
                                        onBoundaryChange={(geo) => setForm(f => ({ ...f, boundaries: geo }))}
                                        height={350}
                                        centerLat={Number(selectedStore?.latitude || 32.2211)}
                                        centerLng={Number(selectedStore?.longitude || 35.2544)}
                                        zoom={14}
                                        t={t}
                                    />
                                </Suspense>
                                {selectedStore && (
                                    <div className="absolute top-4 left-4 z-[1000] bg-white px-3 py-2 rounded-lg shadow-md border flex items-center gap-2 pointer-events-none max-w-[200px]">
                                        <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse shrink-0" />
                                        <span className="text-xs font-bold text-gray-700 truncate">{selectedStore.name}</span>
                                    </div>
                                )}
                            </div>
                            <p className="text-[11px] sm:text-sm text-gray-500 mt-2 px-2 flex items-center gap-1.5 leading-tight">
                                <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                {t('admin.areas.draw_hint', 'Use the polygon tool on the right to draw the boundaries for this area.')}
                            </p>
                        </div>
                        
                        {/* Form Section */}
                        <div className="w-full lg:w-80 space-y-4 bg-white p-4 sm:p-5 rounded-xl border shadow-sm shrink-0">
                            <div>
                                <Label className="mb-1 text-xs sm:text-sm block">{t('admin.areas.select_store', 'Select Store')} *</Label>
                                <Select 
                                    value={form.store_id} 
                                    onValueChange={v => {
                                        const s = stores.find(st => st.id.toString() === v);
                                        setForm(f => ({ 
                                            ...f, 
                                            store_id: v,
                                            name: f.name && !f.name.includes('Zone') ? f.name : `${s?.name || ''} Zone ${f.area_type}`.trim(),
                                            name_ar: f.name_ar && !f.name_ar.includes('منطقة') ? f.name_ar : `${s?.name || ''} منطقة ${f.area_type}`.trim()
                                        }));
                                    }}
                                    disabled={!!editArea}
                                >
                                    <SelectTrigger className="bg-gray-50">
                                        <SelectValue placeholder={t('admin.areas.choose_store', 'Choose a store')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {stores.map(s => (
                                            <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label className="mb-1.5 block">{t('admin.areas.zone_type', 'Zone Type')} *</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {AREA_TYPES.map(type => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setForm(f => ({ 
                                                ...f, 
                                                area_type: type, 
                                                name: `${selectedStore?.name || ''} Zone ${type}`.trim(), 
                                                name_ar: `${selectedStore?.name || ''} منطقة ${type}`.trim() 
                                            }))}
                                            className={`py-2 rounded-lg border-2 font-bold transition-all ${
                                                form.area_type === type 
                                                    ? 'border-gray-900 bg-gray-900 text-white' 
                                                    : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'
                                            }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <Label className="mb-1.5 block">{t('admin.areas.name_en', 'Name (English)')} *</Label>
                                <Input
                                    placeholder={t('admin.areas.name_en_placeholder', 'e.g. Zone A')}
                                    value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                />
                            </div>

                                <div className="space-y-4">
                                    <div>
                                        <Label className="mb-1.5 block">{t('admin.areas.delivery_fee_label', 'Delivery Fee (₪)')} *</Label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400 font-bold">₪</div>
                                            <Input
                                                type="number"
                                                className="pl-8"
                                                placeholder="0.00"
                                                value={form.delivery_fee}
                                                onChange={e => setForm(f => ({ ...f, delivery_fee: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex items-start gap-2 shadow-sm">
                                        <Info className="w-4 h-4 text-amber-600 mt-1 shrink-0" />
                                        <div className="space-y-1">
                                            <p className="text-xs font-bold text-amber-900 leading-none">
                                                {t('admin.areas.automatic_c_title', 'What about Zone C?')}
                                            </p>
                                            <p className="text-[11px] text-amber-800 leading-relaxed">
                                                {t('admin.areas.automatic_c_note', 'Zone C is handled automatically. Any customer located outside of your drawn Zone A and Zone B will be considered in "Zone C" (No Delivery). You do not need to draw it.')}
                                            </p>
                                        </div>
                                    </div>
                                    
                                </div>


                            <div className="flex items-center gap-3 pt-2">
                                <Switch
                                    id="area-active"
                                    checked={form.is_active}
                                    onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))}
                                />
                                <Label htmlFor="area-active">{t('admin.areas.active', 'Active')}</Label>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="px-4 sm:px-6 py-4 border-t bg-white shrink-0 grid grid-cols-2 sm:flex sm:flex-row-reverse items-center gap-2">
                        <Button
                            className="col-span-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 h-11 shadow-sm shadow-blue-100 transition-all font-bold"
                            onClick={() => handleSave(false)}
                            disabled={saving}
                        >
                            {saving
                                ? t('common.saving', 'Saving...')
                                : editArea
                                    ? t('common.save_changes', 'Save changes')
                                    : t('admin.areas.save_only', 'Save')}
                        </Button>

                        {!editArea && (AREA_TYPES as string[]).indexOf(form.area_type) < 1 && (
                             <Button
                                className="col-span-2 order-first sm:order-none sm:flex-none bg-slate-800 hover:bg-slate-900 text-white rounded-xl px-6 h-11 transition-all"
                                onClick={() => handleSave(true)}
                                disabled={saving}
                            >
                                {saving ? t('common.saving', 'Saving...') : t('admin.areas.save_and_next', 'Save & Next (Zone B)')}
                            </Button>
                        )}

                        <Button
                            variant="outline"
                            onClick={() => setDialogOpen(false)}
                            className="col-span-1 sm:flex-none rounded-xl px-4 h-11 border-gray-200 text-gray-500"
                        >
                            {t('common.cancel', 'Cancel')}
                        </Button>
                    </DialogFooter>

                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                <DialogContent className="sm:max-w-sm rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>{t('admin.areas.delete_title', 'Delete Zone')}</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-600 py-2">
                        {t('admin.areas.delete_confirm', 'Are you sure you want to delete')}
                        {' '}<strong>{currentLanguage?.code === 'ar' ? (deleteConfirm?.name_ar || deleteConfirm?.name) : deleteConfirm?.name}</strong>?
                    </p>
                    <DialogFooter className="gap-2 sm:gap-0 mt-4">
                        <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="rounded-xl">
                            {t('common.cancel', 'Cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            className="rounded-xl"
                            onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
                            disabled={deleting}
                        >
                            {deleting ? t('common.deleting', 'Deleting...') : t('common.delete', 'Delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
