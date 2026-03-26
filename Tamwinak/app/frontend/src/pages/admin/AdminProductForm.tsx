import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiCall } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Package, Plus, Trash2, Save, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router-dom';
import { Product, Industry, Unit, ProductUnit } from './types';
import { useLanguage } from '@/contexts/LanguageContext';

const STANDARD_CATEGORIES = ['Fruits', 'Vegetables', 'Dairy', 'Meat', 'Seafood', 'Bakery', 'Beverages', 'Pantry', 'Snacks', 'Frozen'];

export default function AdminProductForm() {
    const { productId } = useParams<{ productId: string }>();
    const isEditing = !!productId;
    const navigate = useNavigate();
    const { t, currentLanguage } = useLanguage();

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Product data
    const [industries, setIndustries] = useState<Industry[]>([]);
    const [allUnits, setAllUnits] = useState<Unit[]>([]);

    // Form state
    const [productForm, setProductForm] = useState({
        industry_id: '', name: '', description: '', category: 'Fruits', image_url: '',
    });
    const [customCategory, setCustomCategory] = useState('');
    const [productUnits, setProductUnits] = useState<ProductUnit[]>([]);

    // Categories
    const [dynamicCategories, setDynamicCategories] = useState<string[]>(STANDARD_CATEGORIES);

    // New Unit state
    const [showNewUnit, setShowNewUnit] = useState(false);
    const [newUnitName, setNewUnitName] = useState('');
    const [newUnitNameAr, setNewUnitNameAr] = useState('');
    const [creatingUnit, setCreatingUnit] = useState(false);

    const loadData = useCallback(async (signal?: AbortSignal) => {
        setLoading(true);
        try {
            const [industriesRes, unitsRes, categoriesRes, allCategoriesRes] = await Promise.all([
                apiCall.invoke({ url: '/api/v1/industries', method: 'GET', signal }),
                apiCall.invoke({ url: '/api/v1/units', method: 'GET', signal }),
                apiCall.invoke({ url: '/api/v1/entities/products/categories', method: 'GET', signal }),
                apiCall.invoke({ url: '/api/v1/categories', method: 'GET', signal }),
            ]);

            setIndustries(Array.isArray(industriesRes.data) ? industriesRes.data : []);
            setAllUnits(unitsRes.data.filter((u: Unit) => u.is_active !== false));

            // Setup dynamic categories
            const customCats = (Array.isArray(categoriesRes.data) ? categoriesRes.data as string[] : []);
            const definedCats = (Array.isArray(allCategoriesRes.data) ? allCategoriesRes.data.map((c: any) => c.name) : []);
            
            const mergedCats = Array.from(new Set([...STANDARD_CATEGORIES, ...customCats, ...definedCats]))
                .filter(cat => cat !== 'Other');
                
            setDynamicCategories(mergedCats);

            if (isEditing) {
                const [productRes, productUnitsRes] = await Promise.all([
                    apiCall.invoke({ url: `/api/v1/entities/products/${productId}`, method: 'GET', signal }),
                    apiCall.invoke({ url: `/api/v1/entities/products/${productId}/units`, method: 'GET', signal }),
                ]);

                const p = productRes.data;
                const isStandardCategory = STANDARD_CATEGORIES.includes(p.category || '') || customCats.includes(p.category || '');

                setProductForm({
                    industry_id: p.industry_id ? String(p.industry_id) : '',
                    name: p.name || '',
                    description: p.description || '',
                    category: isStandardCategory ? (p.category || 'Fruits') : 'Other',
                    image_url: p.image_url || '',
                });
                setCustomCategory(isStandardCategory ? '' : (p.category || ''));
                if (Array.isArray(productUnitsRes.data)) {
                    setProductUnits(productUnitsRes.data);
                } else {
                    setProductUnits([]);
                }
            }
        } catch (err: any) {
            if (err?.code === 'ERR_CANCELED') return;
            toast.error('Failed to load necessary data');
        } finally {
            setLoading(false);
        }
    }, [isEditing, productId]);

    useEffect(() => {
        const controller = new AbortController();
        loadData(controller.signal);
        return () => controller.abort();
    }, [loadData]);

    const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProductForm({ ...productForm, image_url: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCreateNewUnit = async () => {
        if (!newUnitName) {
            toast.error('Unit name is required');
            return;
        }
        setCreatingUnit(true);
        try {
            const res = await apiCall.invoke({
                url: '/api/v1/units',
                method: 'POST',
                data: { name: newUnitName, name_ar: newUnitNameAr, is_active: true }
            });
            const newUnit = res.data;
            setAllUnits([...allUnits, newUnit]);
            setProductUnits([...productUnits, { unit_id: newUnit.id, price: 0 }]);

            setShowNewUnit(false);
            setNewUnitName('');
            setNewUnitNameAr('');
            toast.success('New unit created and added');
        } catch {
            toast.error('Failed to create unit');
        } finally {
            setCreatingUnit(false);
        }
    };

    const addUnit = () => {
        if (allUnits.length === 0) return;
        setProductUnits([...productUnits, { unit_id: allUnits[0].id, price: 0 }]);
    };

    const updateUnit = (index: number, field: keyof ProductUnit, value: any) => {
        const updated = [...productUnits];
        updated[index] = { ...updated[index], [field]: value };
        setProductUnits(updated);
    };

    const removeUnit = (index: number) => {
        setProductUnits(productUnits.filter((_, i) => i !== index));
    };

    const handleSaveProduct = async () => {
        try {
            setSaving(true);
            const finalCategory = productForm.category === 'Other' ? customCategory : productForm.category;

            if (productForm.category === 'Other' && !finalCategory.trim()) {
                toast.error('Please specify the custom category');
                return;
            }

            if (!productForm.name.trim()) {
                toast.error('Product name is required');
                return;
            }

            const data: any = {
                name: productForm.name,
                description: productForm.description || null,
                category: finalCategory,
                is_available: true,
                image_url: productForm.image_url || null,
            };

            if (productForm.industry_id) {
                data.industry_id = parseInt(productForm.industry_id);
            }

            if (productUnits.length === 0) {
                toast.error('Please add at least one unit and price');
                return;
            }

            // Sync category to master table if it is a new custom one
            if (productForm.category === 'Other' && finalCategory.trim()) {
                try {
                    await apiCall.invoke({
                        url: '/api/v1/categories',
                        method: 'POST',
                        data: { name: finalCategory.trim(), is_active: true }
                    });
                } catch {
                    // Ignore if already exists (409)
                }
            }

            let savedProductId = productId;

            if (isEditing) {
                await apiCall.invoke({
                    url: `/api/v1/entities/products/${productId}`,
                    method: 'PUT',
                    data,
                });
            } else {
                const createRes = await apiCall.invoke({
                    url: '/api/v1/entities/products',
                    method: 'POST',
                    data,
                });
                savedProductId = String(createRes.data.id);
            }

            // Save units
            await apiCall.invoke({
                url: `/api/v1/entities/products/${savedProductId}/units`,
                method: 'PUT',
                data: { units: productUnits }
            });

            toast.success(isEditing ? 'Product updated!' : 'Product added!');
            navigate('/admin/products');
        } catch (e: any) {
            toast.error(e?.response?.data?.detail?.[0]?.message || e?.response?.data?.detail || e?.message || 'Failed to save product');
        } finally {
            setSaving(false);
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
        <div className="space-y-6 pb-12 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <Button variant="ghost" size="icon" onClick={() => navigate('/admin/products')} className="text-gray-500 hover:text-gray-900">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-none">
                    <Package className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                    <h2 className="font-semibold text-gray-900 text-lg">{isEditing ? t('admin.products_form.edit', 'Edit Product') : t('admin.products_form.add', 'Add New Product')}</h2>
                    <p className="text-sm text-gray-500">{t('admin.products_form.subtitle', 'Manage product details, pricing, and specific units')}</p>
                </div>
                <Button className="bg-green-600 hover:bg-green-700 text-white gap-2" onClick={handleSaveProduct} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {t('admin.products_form.save', 'Save Product')}
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Product Basics Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                        <h3 className="font-medium text-gray-900">{t('admin.products_form.basic_info', 'Basic Information')}</h3>
                    </div>
                    <div className="p-5 space-y-4">
                        {/* Industry */}
                        <div>
                            <Label className="text-sm font-medium">{t('admin.products_form.industry', 'Industry')}</Label>
                            <Select value={productForm.industry_id || 'none'} onValueChange={(v) => setProductForm({ ...productForm, industry_id: v === 'none' ? '' : v })}>
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder={t('admin.products_form.select_industry', 'Select Industry (optional)')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">{t('admin.products_form.none', 'None')}</SelectItem>
                                    {industries.map(i => (
                                        <SelectItem key={i.id} value={String(i.id)}>
                                            {i.icon} {t('industry.' + i.name.toLowerCase().replace(/ & /g, '_').replace(/ /g, '_'), i.name)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label className="text-sm font-medium">{t('admin.products_form.name', 'Product Name *')}</Label>
                            <Input className="mt-1" placeholder={t('admin.products_form.name_placeholder', 'Product name')} value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
                        </div>

                        <div>
                            <Label className="text-sm font-medium">{t('admin.products_form.description', 'Description')}</Label>
                            <Textarea className="mt-1" placeholder={t('admin.products_form.description', 'Description')} value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} rows={2} />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium">{t('admin.products_form.category', 'Category')}</Label>
                            <Select value={productForm.category} onValueChange={(v) => setProductForm({ ...productForm, category: v })}>
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder={t('admin.products_form.category', 'Category')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {dynamicCategories.map((c) => (
                                        <SelectItem key={c} value={c}>{t(`category.${c.toLowerCase()}`, c)}</SelectItem>
                                    ))}
                                    <SelectItem value="Other">{t('admin.products_form.category_other', 'Other...')}</SelectItem>
                                </SelectContent>
                            </Select>
                            {productForm.category === 'Other' && (
                                <Input
                                    placeholder={t('admin.products_form.enter_custom_category', 'Enter custom category')}
                                    value={customCategory}
                                    onChange={(e) => setCustomCategory(e.target.value)}
                                />
                            )}
                        </div>

                        {/* Base unit removed as it is now part of the multi-unit system */}

                        <div>
                            <Label className="text-sm font-medium">{t('admin.products_form.image', 'Product Image')}</Label>
                            <div className="mt-1 flex items-center gap-4">
                                {productForm.image_url ? (
                                    <img src={productForm.image_url} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-gray-200" loading="lazy" width={64} height={64} />
                                ) : (
                                    <div className="w-16 h-16 bg-gray-50 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400">
                                        <Package className="w-6 h-6" />
                                    </div>
                                )}
                                <div className="flex-1">
                                    <Input type="file" accept="image/*" onChange={handleProductImageUpload} className="text-sm" />
                                    <p className="text-xs text-gray-500 mt-1">{t('admin.products_form.image_hint', 'Recommended size: 500x500px, JPG or PNG.')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Additional Units Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                    <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                        <h3 className="font-medium text-gray-900">{t('admin.products_form.units_title', 'Custom Units & Pricing')}</h3>
                        <p className="text-xs text-gray-500 mt-1">{t('admin.products_form.units_subtitle', 'Add alternative units (like piece, dozen, box) and their prices')}</p>
                    </div>

                    <div className="p-5 flex-1 flex flex-col space-y-4">
                        {productUnits.length > 0 ? (
                            <div className="space-y-3">
                                {productUnits.map((pu, index) => (
                                    <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-100 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1">
                                                <Label className="text-[10px] uppercase text-gray-400 font-bold mb-1 block">{t('admin.products_form.unit_type', 'Unit Type')}</Label>
                                                <Select
                                                    value={String(pu.unit_id)}
                                                    onValueChange={(val) => updateUnit(index, 'unit_id', parseInt(val))}
                                                >
                                                    <SelectTrigger className="bg-white">
                                                        <SelectValue placeholder={t('admin.products_form.select_unit', 'Select unit')} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {allUnits.map(u => (
                                                            <SelectItem key={u.id} value={String(u.id)}>
                                                                {currentLanguage?.code === 'ar' ? (u.name_ar || u.name) : u.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="flex-1">
                                                <Label className="text-[10px] uppercase text-gray-400 font-bold mb-1 block">{t('admin.products_form.price', 'Price (₪)')}</Label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    className="bg-white h-10"
                                                    value={pu.price}
                                                    onChange={(e) => updateUnit(index, 'price', parseFloat(e.target.value) || 0)}
                                                />
                                            </div>

                                            <Button variant="ghost" size="icon" onClick={() => removeUnit(index)} className="text-red-500 hover:text-red-600 hover:bg-red-50 flex-none bg-white border border-gray-100 h-10 w-10 mt-5">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                                <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                <p className="text-sm">{t('admin.products_form.no_units', 'No alternative units specified.')}</p>
                                <p className="text-xs mt-1">{t('admin.products_form.base_unit_used', 'The base unit and price will be used exclusively.')}</p>
                            </div>
                        )}

                        <div className="mt-auto pt-4 space-y-3">
                            <div className="flex flex-wrap gap-2">
                                <Button variant="outline" onClick={addUnit} className="flex-1 border-dashed">
                                    <Plus className="w-4 h-4 mr-2" /> {t('admin.products_form.add_unit', 'Add Unit')}
                                </Button>
                                <Button variant="outline" onClick={() => setShowNewUnit(!showNewUnit)} className="flex-none border-dashed text-purple-600 border-purple-200 bg-purple-50 hover:bg-purple-100">
                                    <Plus className="w-4 h-4 mr-2" /> {t('admin.products_form.create_new_unit', 'Create New Unit')}
                                </Button>
                            </div>

                            {showNewUnit && (
                                <div className="p-3 bg-purple-50 rounded-lg border border-purple-100 space-y-3 animate-in fade-in slide-in-from-top-2">
                                    <h4 className="text-sm font-medium text-purple-900">{t('admin.products_form.create_new_unit_db', 'Create New Unit Database Entry')}</h4>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder={t('admin.products_form.name_en', 'Name (English) *')}
                                            value={newUnitName}
                                            onChange={e => setNewUnitName(e.target.value)}
                                            className="h-9 text-sm bg-white"
                                        />
                                        <Input
                                            placeholder={t('admin.products_form.name_ar', 'Name (Arabic) *')}
                                            value={newUnitNameAr}
                                            onChange={e => setNewUnitNameAr(e.target.value)}
                                            className="h-9 text-sm bg-white"
                                        />
                                        <Button size="sm" onClick={handleCreateNewUnit} disabled={creatingUnit} className="h-9 w-20 bg-purple-600 hover:bg-purple-700">
                                            {creatingUnit ? <Loader2 className="w-4 h-4 animate-spin" /> : t('admin.products_form.create', 'Create')}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
