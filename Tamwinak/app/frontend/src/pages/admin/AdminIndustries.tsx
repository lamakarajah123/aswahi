import { useState, useEffect, useCallback } from 'react';
import { apiCall } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Factory, Plus, Edit, Trash2, Store } from 'lucide-react';
import { toast } from 'sonner';
import { Industry } from './types';
import { useLanguage } from '@/contexts/LanguageContext';

const PRESET_ICONS = ['🛒', '🍞', '🍽️', '💊', '📱', '👗', '🏪', '🧴', '🥩', '☕', '🍕', '🧁', '🌿', '🛍️', '🚗'];

export default function AdminIndustries() {
    const { t } = useLanguage();
    const [industries, setIndustries] = useState<Industry[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editIndustry, setEditIndustry] = useState<Industry | null>(null);
    const [form, setForm] = useState({
        name: '',
        name_ar: '',
        icon: '🏪',
        image_url: '',
        description: '',
        is_active: true,
    });
    const [deleteConfirm, setDeleteConfirm] = useState<Industry | null>(null);

    const loadIndustries = useCallback(async (signal?: AbortSignal) => {
        try {
            setLoading(true);
            const res = await apiCall.invoke({ url: '/api/v1/industries', method: 'GET', signal });
            setIndustries(Array.isArray(res.data) ? res.data : []);
        } catch (err: any) {
            if (err?.code === 'ERR_CANCELED') return;
            toast.error(t('error.load_industries', 'Failed to load industries'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        const controller = new AbortController();
        loadIndustries(controller.signal);
        return () => controller.abort();
    }, [loadIndustries]);

    const openAdd = () => {
        setEditIndustry(null);
        setForm({ name: '', name_ar: '', icon: '🏪', image_url: '', description: '', is_active: true });
        setDialogOpen(true);
    };

    const openEdit = (ind: Industry) => {
        setEditIndustry(ind);
        setForm({
            name: ind.name,
            name_ar: ind.name_ar || '',
            icon: ind.icon || '🏪',
            image_url: ind.image_url || '',
            description: ind.description || '',
            is_active: ind.is_active,
        });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) {
            toast.error(t('error.industry_name_req', 'Industry name is required'));
            return;
        }
        try {
            const payload = {
                name: form.name.trim(),
                name_ar: form.name_ar.trim() || null,
                icon: form.icon || null,
                image_url: form.image_url || null,
                description: form.description.trim() || null,
                is_active: form.is_active,
            };
            if (editIndustry) {
                await apiCall.invoke({ url: `/api/v1/industries/${editIndustry.id}`, method: 'PUT', data: payload });
                toast.success(t('success.industry_updated', 'Industry updated!'));
            } else {
                await apiCall.invoke({ url: '/api/v1/industries', method: 'POST', data: payload });
                toast.success(t('success.industry_added', 'Industry added!'));
            }
            setDialogOpen(false);
            loadIndustries();
        } catch (e: any) {
            toast.error(e?.response?.data?.detail || t('error.save_industry', 'Failed to save industry'));
        }
    };

    const handleDelete = async (ind: Industry) => {
        try {
            await apiCall.invoke({ url: `/api/v1/industries/${ind.id}`, method: 'DELETE' });
            toast.success(t('success.industry_deleted', 'Industry deleted'));
            setDeleteConfirm(null);
            loadIndustries();
        } catch (e: any) {
            toast.error(e?.response?.data?.detail || t('error.delete_industry', 'Failed to delete industry'));
        }
    };

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
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                            <Factory className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-gray-900 text-lg">{t('admin.industries.title', 'Industries')}</h2>
                            <p className="text-sm text-gray-500">{industries.length} {t('admin.industries.registered', 'industries registered')}</p>
                        </div>
                    </div>
                    <Button
                        className="bg-green-600 hover:bg-green-700 text-white gap-2"
                        onClick={openAdd}
                    >
                        <Plus className="w-4 h-4" /> {t('admin.industries.add', 'Add Industry')}
                    </Button>
                </div>
            </div>

            {/* Industries Grid */}
            {industries.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
                    <Factory className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">{t('admin.industries.no_industries', 'No industries yet')}</p>
                    <p className="text-sm text-gray-400 mt-1">{t('admin.industries.no_industries_desc', 'Add industries to categorize your stores and products')}</p>
                    <Button className="mt-4 bg-green-600 hover:bg-green-700 text-white" onClick={openAdd}>
                        <Plus className="w-4 h-4 ltr:mr-2 rtl:ml-2" /> {t('admin.industries.add_first', 'Add First Industry')}
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {industries.map((ind) => (
                        <div
                            key={ind.id}
                            className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-2xl overflow-hidden relative border border-gray-100 shadow-sm shrink-0">
                                        {ind.image_url ? (
                                             <img src={ind.image_url} alt={ind.name} className="w-full h-full object-cover" />
                                        ) : (
                                             <div className="w-full h-full bg-gray-100 flex items-center justify-center">{ind.icon || '🏪'}</div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">{ind.name}</p>
                                        {ind.name_ar && (
                                            <p className="text-sm text-gray-500 font-arabic" dir="rtl">{ind.name_ar}</p>
                                        )}
                                    </div>
                                </div>
                                <Badge
                                    variant="outline"
                                    className={ind.is_active
                                        ? 'text-green-700 bg-green-50 border-green-200'
                                        : 'text-gray-500 bg-gray-50 border-gray-200'
                                    }
                                >
                                    {ind.is_active ? t('superadmin.active', 'Active') : t('superadmin.inactive', 'Inactive')}
                                </Badge>
                            </div>
                            {ind.description && (
                                <p className="text-sm text-gray-500 mt-3 line-clamp-2">{ind.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-50">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex-1 gap-2 hover:bg-blue-50 hover:text-blue-600"
                                    onClick={() => openEdit(ind)}
                                >
                                    <Edit className="w-3.5 h-3.5" /> {t('admin.industries.edit', 'Edit')}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex-1 gap-2 hover:bg-red-50 hover:text-red-600"
                                    onClick={() => setDeleteConfirm(ind)}
                                >
                                    <Trash2 className="w-3.5 h-3.5" /> {t('admin.industries.delete', 'Delete')}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Factory className="w-5 h-5 text-purple-600" />
                            {editIndustry ? t('admin.industries.edit_dialog_title', 'Edit Industry') : t('admin.industries.add_dialog_title', 'Add Industry')}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label className="text-sm font-medium">{t('admin.industries.image', 'Background Image')}</Label>
                            <div className="mt-2 flex items-center gap-4">
                                {form.image_url ? (
                                    <div className="relative w-16 h-16 rounded-xl overflow-hidden border">
                                        <img src={form.image_url} alt="preview" className="w-full h-full object-cover" />
                                        <button 
                                            onClick={() => setForm({ ...form, image_url: '' })}
                                            className="absolute top-1 right-1 bg-white/80 rounded-full text-red-600 p-0.5"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="w-16 h-16 bg-gray-50 flex items-center justify-center rounded-xl border border-dashed">
                                        <Factory className="w-6 h-6 text-gray-300" />
                                    </div>
                                )}
                                <Input type="file" accept="image/*" onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onloadend = () => setForm({ ...form, image_url: reader.result as string });
                                        reader.readAsDataURL(file);
                                    }
                                }} className="max-w-[200px]" />
                            </div>
                        </div>
                        <div>
                            <Label className="text-sm font-medium">{t('admin.industries.icon', 'Icon or Icon Image')}</Label>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                {PRESET_ICONS.map((ico) => (
                                    <button
                                        key={ico}
                                        onClick={() => setForm({ ...form, icon: ico })}
                                        className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${form.icon === ico && !form.icon.startsWith('data:')
                                            ? 'bg-green-100 ring-2 ring-green-500'
                                            : 'bg-gray-50 hover:bg-gray-100'
                                            }`}
                                    >
                                        {ico}
                                    </button>
                                ))}
                                
                                <div className="ml-2 pl-2 border-l border-gray-100 flex items-center gap-2">
                                    {form.icon && form.icon.startsWith('data:') ? (
                                        <div className="relative w-10 h-10 rounded-lg overflow-hidden border">
                                            <img src={form.icon} alt="icon" className="w-full h-full object-cover" />
                                            <button 
                                                onClick={() => setForm({ ...form, icon: '🏪' })}
                                                className="absolute top-0 right-0 bg-white/80 rounded-full text-red-600 p-0.5"
                                            >
                                                <Trash2 className="w-2.5 h-2.5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="w-10 h-10 bg-gray-50 flex items-center justify-center rounded-lg border border-dashed cursor-pointer hover:bg-gray-100 transition-colors">
                                            <Plus className="w-4 h-4 text-gray-400" />
                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => setForm({ ...form, icon: reader.result as string });
                                                    reader.readAsDataURL(file);
                                                }
                                            }} />
                                        </label>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-sm font-medium">{t('admin.industries.name_en', 'Name (EN) *')}</Label>
                                <Input
                                    className="mt-1"
                                    placeholder="e.g. Grocery"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label className="text-sm font-medium">{t('admin.industries.name_ar_label', 'Name (AR)')}</Label>
                                <Input
                                    className="mt-1 text-right font-arabic"
                                    dir="rtl"
                                    placeholder="مثال: بقالة"
                                    value={form.name_ar}
                                    onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <Label className="text-sm font-medium">{t('admin.industries.description', 'Description')}</Label>
                            <Textarea
                                className="mt-1"
                                placeholder={t('admin.industries.desc_placeholder', 'Brief description of this industry')}
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                rows={2}
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <Switch
                                id="is_active"
                                checked={form.is_active}
                                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                            />
                            <Label htmlFor="is_active">{t('superadmin.active', 'Active')}</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
                        <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleSave}>
                            {editIndustry ? t('admin.industries.update_btn', 'Update') : t('admin.industries.add_btn', 'Add')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm Dialog */}
            <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <Trash2 className="w-5 h-5" /> {t('admin.industries.delete_dialog_title', 'Delete Industry')}
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-gray-600">
                        {t('admin.industries.delete_dialog_desc', 'Are you sure you want to delete')} <strong>{deleteConfirm?.name}</strong>? {t('admin.products.delete_dialog_warning', 'This cannot be undone.')}
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirm(null)}>{t('common.cancel', 'Cancel')}</Button>
                        <Button
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
                        >
                            {t('admin.industries.delete', 'Delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
