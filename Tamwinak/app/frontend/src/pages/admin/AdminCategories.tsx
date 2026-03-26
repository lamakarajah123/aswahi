import { useState, useEffect, useCallback } from 'react';
import { apiCall } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tag, Plus, Edit, Trash2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { Category } from './types';
import { useLanguage } from '@/contexts/LanguageContext';

const PRESET_ICONS = ['🛒', '🍎', '🥦', '🥛', '🍞', '🥤', '🍿', '🥩', '🐟', '🌿', '🧴', '💊', '📱', '👗', '🏪', '☕', '🍕', '🧁', '🚗', '🛍️'];

export default function AdminCategories() {
    const { t } = useLanguage();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editCategory, setEditCategory] = useState<Category | null>(null);
    const [form, setForm] = useState({
        name: '',
        name_ar: '',
        icon: '🛒',
        description: '',
        sort_order: 0,
        is_active: true,
    });
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<Category | null>(null);
    const [deleting, setDeleting] = useState(false);

    const loadCategories = useCallback(async (signal?: AbortSignal) => {
        try {
            setLoading(true);
            const res = await apiCall.invoke({ url: '/api/v1/categories', method: 'GET', signal });
            setCategories(Array.isArray(res.data) ? res.data : []);
        } catch (err: any) {
            if (err?.code === 'ERR_CANCELED') return;
            toast.error(t('error.load_categories', 'Failed to load categories'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        const controller = new AbortController();
        loadCategories(controller.signal);
        return () => controller.abort();
    }, [loadCategories]);

    const openAdd = () => {
        setEditCategory(null);
        setForm({
            name: '',
            name_ar: '',
            icon: '🛒',
            description: '',
            sort_order: categories.length,
            is_active: true,
        });
        setDialogOpen(true);
    };

    const openEdit = (cat: Category) => {
        setEditCategory(cat);
        setForm({
            name: cat.name,
            name_ar: cat.name_ar || '',
            icon: cat.icon || '🛒',
            description: cat.description || '',
            sort_order: cat.sort_order,
            is_active: cat.is_active,
        });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) {
            toast.error(t('error.category_name_req', 'Category name is required'));
            return;
        }
        setSaving(true);
        try {
            const payload = {
                name: form.name.trim(),
                name_ar: form.name_ar.trim() || null,
                icon: form.icon || null,
                description: form.description.trim() || null,
                sort_order: Number(form.sort_order) || 0,
                is_active: form.is_active,
            };
            if (editCategory) {
                await apiCall.invoke({ url: `/api/v1/categories/${editCategory.id}`, method: 'PUT', data: payload });
                toast.success(t('success.category_updated', 'Category updated!'));
            } else {
                await apiCall.invoke({ url: '/api/v1/categories', method: 'POST', data: payload });
                toast.success(t('success.category_added', 'Category added!'));
            }
            setDialogOpen(false);
            loadCategories();
        } catch (e: unknown) {
            const err = e as { response?: { data?: { detail?: string } } };
            toast.error(err?.response?.data?.detail || t('error.save_category', 'Failed to save category'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (cat: Category) => {
        setDeleting(true);
        try {
            await apiCall.invoke({ url: `/api/v1/categories/${cat.id}`, method: 'DELETE' });
            toast.success(t('success.category_deleted', 'Category deleted'));
            setDeleteConfirm(null);
            loadCategories();
        } catch (e: unknown) {
            const err = e as { response?: { data?: { detail?: string } } };
            toast.error(err?.response?.data?.detail || t('error.delete_category', 'Failed to delete category'));
        } finally {
            setDeleting(false);
        }
    };

    const shiftOrder = async (cat: Category, direction: 'up' | 'down') => {
        const newOrder = direction === 'up' ? cat.sort_order - 1 : cat.sort_order + 1;
        try {
            await apiCall.invoke({
                url: `/api/v1/categories/${cat.id}`,
                method: 'PUT',
                data: { sort_order: newOrder },
            });
            loadCategories();
        } catch {
            toast.error(t('error.reorder_category', 'Failed to reorder category'));
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
                        <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                            <Tag className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-gray-900 text-lg">
                                {t('admin.categories.title', 'Categories')}
                            </h2>
                            <p className="text-sm text-gray-500">
                                {categories.length} {t('admin.categories.registered', 'categories registered')}
                            </p>
                        </div>
                    </div>
                    <Button className="bg-green-600 hover:bg-green-700 text-white gap-2" onClick={openAdd}>
                        <Plus className="w-4 h-4" /> {t('admin.categories.add', 'Add Category')}
                    </Button>
                </div>
            </div>

            {/* Categories List */}
            {categories.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
                    <Tag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">{t('admin.categories.no_categories', 'No categories yet')}</p>
                    <p className="text-sm text-gray-400 mt-1">
                        {t('admin.categories.no_categories_desc', 'Add categories to organise your products')}
                    </p>
                    <Button className="mt-4 bg-green-600 hover:bg-green-700 text-white" onClick={openAdd}>
                        <Plus className="w-4 h-4 ltr:mr-2 rtl:ml-2" /> {t('admin.categories.add_first', 'Add First Category')}
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categories.map((cat, idx) => (
                        <div
                            key={cat.id}
                            className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-2xl select-none overflow-hidden border border-gray-100">
                                        {cat.icon && (cat.icon.startsWith('data:') || cat.icon.startsWith('http')) ? (
                                            <img src={cat.icon} alt={cat.name} className="w-full h-full object-cover" />
                                        ) : (
                                            cat.icon || '🛒'
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">{cat.name}</p>
                                        {cat.name_ar && (
                                            <p className="text-sm text-gray-500 font-arabic" dir="rtl">{cat.name_ar}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    {/* Reorder buttons */}
                                    <div className="flex flex-col">
                                        <button
                                            disabled={idx === 0}
                                            onClick={() => shiftOrder(cat, 'up')}
                                            className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-20 disabled:cursor-not-allowed"
                                            title="Move up"
                                        >
                                            <ChevronUp className="w-4 h-4" />
                                        </button>
                                        <button
                                            disabled={idx === categories.length - 1}
                                            onClick={() => shiftOrder(cat, 'down')}
                                            className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-20 disabled:cursor-not-allowed"
                                            title="Move down"
                                        >
                                            <ChevronDown className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-gray-400 hover:text-blue-600 h-8 w-8"
                                        onClick={() => openEdit(cat)}
                                    >
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-gray-400 hover:text-red-600 h-8 w-8"
                                        onClick={() => setDeleteConfirm(cat)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            {cat.description && (
                                <p className="text-sm text-gray-500 mt-3 line-clamp-2">{cat.description}</p>
                            )}

                            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                                <Badge
                                    variant={cat.is_active ? 'default' : 'secondary'}
                                    className={cat.is_active ? 'bg-green-100 text-green-700 border-green-200' : ''}
                                >
                                    {cat.is_active ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                                </Badge>
                                <span className="text-xs text-gray-400">
                                    {t('admin.categories.order', 'Order')}: {cat.sort_order}
                                </span>
                                {cat.product_count !== undefined && (
                                    <span className="text-xs text-gray-400 ml-auto">
                                        {cat.product_count} {t('admin.categories.products', 'products')}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add / Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-lg rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editCategory
                                ? t('admin.categories.edit_title', 'Edit Category')
                                : t('admin.categories.add_title', 'Add Category')}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Icon picker */}
                        <div>
                            <Label className="mb-2 block">{t('admin.categories.icon', 'Icon or Icon Image')}</Label>
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                {PRESET_ICONS.map((ic) => (
                                    <button
                                        key={ic}
                                        type="button"
                                        onClick={() => setForm(f => ({ ...f, icon: ic }))}
                                        className={`w-9 h-9 text-xl rounded-lg border transition-all ${form.icon === ic && !form.icon.startsWith('data:')
                                            ? 'border-green-500 bg-green-50 scale-110'
                                            : 'border-gray-200 hover:border-gray-400'
                                            }`}
                                    >
                                        {ic}
                                    </button>
                                ))}

                                <div className="ml-2 pl-2 border-l border-gray-100 flex items-center gap-2">
                                    {form.icon && form.icon.startsWith('data:') ? (
                                        <div className="relative w-10 h-10 rounded-lg overflow-hidden border">
                                            <img src={form.icon} alt="icon" className="w-full h-full object-cover" />
                                            <button 
                                                onClick={() => setForm(f => ({ ...f, icon: '🛒' }))}
                                                className="absolute top-0 right-0 bg-white/80 rounded-full text-red-600 p-0.5 shadow-sm"
                                            >
                                                <Trash2 className="w-2.5 h-2.5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="w-10 h-10 bg-gray-50 flex items-center justify-center rounded-lg border border-dashed cursor-pointer hover:bg-gray-100 transition-all border-gray-300">
                                            <Plus className="w-4 h-4 text-gray-400" />
                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => setForm(f => ({ ...f, icon: reader.result as string }));
                                                    reader.readAsDataURL(file);
                                                }
                                            }} />
                                        </label>
                                    )}
                                </div>
                            </div>
                            <Input
                                placeholder={t('admin.categories.custom_icon_placeholder', 'Or type emoji/URL')}
                                value={form.icon && form.icon.startsWith('data:') ? '' : form.icon}
                                onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                                className="max-w-xs h-9 text-sm"
                            />
                        </div>

                        {/* Name */}
                        <div>
                            <Label className="mb-1.5 block">{t('admin.categories.name_en', 'Name (English)')} *</Label>
                            <Input
                                placeholder="e.g. Vegetables"
                                value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            />
                        </div>

                        {/* Name AR */}
                        <div>
                            <Label className="mb-1.5 block">{t('admin.categories.name_ar', 'Name (Arabic)')}</Label>
                            <Input
                                dir="rtl"
                                placeholder="مثال: خضروات"
                                value={form.name_ar}
                                onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))}
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <Label className="mb-1.5 block">{t('admin.categories.description', 'Description')}</Label>
                            <Textarea
                                placeholder={t('admin.categories.description_placeholder', 'Optional short description...')}
                                value={form.description}
                                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                rows={2}
                                className="resize-none"
                            />
                        </div>

                        {/* Sort Order */}
                        <div>
                            <Label className="mb-1.5 block">{t('admin.categories.sort_order', 'Sort Order')}</Label>
                            <Input
                                type="number"
                                min={0}
                                value={form.sort_order}
                                onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                                className="w-28"
                            />
                        </div>

                        {/* Active toggle */}
                        <div className="flex items-center gap-3">
                            <Switch
                                id="cat-active"
                                checked={form.is_active}
                                onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))}
                            />
                            <Label htmlFor="cat-active">{t('admin.categories.active', 'Active')}</Label>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0 mt-2">
                        <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">
                            {t('common.cancel', 'Cancel')}
                        </Button>
                        <Button
                            className="bg-green-600 hover:bg-green-700 text-white rounded-xl"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving
                                ? t('common.saving', 'Saving...')
                                : editCategory
                                    ? t('common.save_changes', 'Save Changes')
                                    : t('common.add', 'Add')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                <DialogContent className="sm:max-w-sm rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>{t('admin.categories.delete_title', 'Delete Category')}</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-600 py-2">
                        {t('admin.categories.delete_confirm', 'Are you sure you want to delete')}
                        {' '}<strong>{deleteConfirm?.name}</strong>?{' '}
                        {t('admin.categories.delete_note', 'Products assigned to this category will be unassigned.')}
                    </p>
                    <DialogFooter className="gap-2 sm:gap-0">
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
