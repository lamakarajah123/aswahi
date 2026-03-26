import { useState, useEffect } from 'react';
import { apiCall } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Unit, ProductUnit } from './types';

interface Props {
    productId: number;
    productName: string;
    open: boolean;
    onClose: () => void;
}

export function AdminProductUnitsDialog({ productId, productName, open, onClose }: Props) {
    const { t, isRTL } = useLanguage();
    const [allUnits, setAllUnits] = useState<Unit[]>([]);
    const [productUnits, setProductUnits] = useState<ProductUnit[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // New Unit state
    const [showNewUnit, setShowNewUnit] = useState(false);
    const [newUnitName, setNewUnitName] = useState('');
    const [newUnitNameAr, setNewUnitNameAr] = useState('');
    const [creatingUnit, setCreatingUnit] = useState(false);

    useEffect(() => {
        if (open) {
            loadData();
        }
    }, [open, productId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [unitsRes, productUnitsRes] = await Promise.all([
                apiCall.invoke({ url: '/api/v1/units', method: 'GET' }),
                apiCall.invoke({ url: `/api/v1/entities/products/${productId}/units`, method: 'GET' })
            ]);
            setAllUnits(unitsRes.data.filter((u: any) => u.is_active !== false));
            setProductUnits(productUnitsRes.data);
        } catch {
            toast.error(t('error.load_units', 'Failed to load units data'));
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await apiCall.invoke({
                url: `/api/v1/entities/products/${productId}/units`,
                method: 'PUT',
                data: { units: productUnits }
            });
            toast.success(t('success.product_updated', 'Product units saved'));
            onClose();
        } catch {
            toast.error(t('error.save_unit', 'Failed to save units'));
        } finally {
            setSaving(false);
        }
    };

    const handleCreateNewUnit = async () => {
        if (!newUnitName) {
            toast.error(t('error.unit_name_req', 'Unit name is required'));
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
            toast.success(t('success.unit_created', 'New unit created and added'));
        } catch {
            toast.error(t('error.save_unit', 'Failed to create unit'));
        } finally {
            setCreatingUnit(false);
        }
    };

    const addUnit = () => {
        if (allUnits.length === 0) return;
        setProductUnits([...productUnits, { unit_id: allUnits[0].id, price: 0 }]);
    };

    const updateUnit = (index: number, field: 'unit_id' | 'price', value: number) => {
        const updated = [...productUnits];
        updated[index] = { ...updated[index], [field]: value };
        setProductUnits(updated);
    };

    const removeUnit = (index: number) => {
        setProductUnits(productUnits.filter((_, i) => i !== index));
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-xl" dir={isRTL ? 'rtl' : 'ltr'}>
                <DialogHeader>
                    <DialogTitle>{t('admin.products_form.units_title', 'Manage Units')}: {productName}</DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-purple-600" /></div>
                ) : (
                    <div className="space-y-4 pt-4">
                        {productUnits.map((pu, index) => (
                            <div key={index} className="flex items-center gap-3">
                                <Select
                                    value={String(pu.unit_id)}
                                    onValueChange={(val) => updateUnit(index, 'unit_id', parseInt(val))}
                                >
                                    <SelectTrigger className="w-1/2">
                                        <SelectValue placeholder={t('admin.products_form.select_unit', 'Select unit')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {allUnits.map(u => (
                                            <SelectItem key={u.id} value={String(u.id)}>
                                                {isRTL && u.name_ar ? u.name_ar : u.name}
                                                {!isRTL && u.name_ar ? ` (${u.name_ar})` : ''}
                                                {isRTL && !u.name_ar ? ` (${u.name})` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <div className="flex items-center gap-2 w-1/2 relative">
                                    <span className={`text-gray-500 absolute ${isRTL ? 'right-3' : 'left-3'}`}>₪</span>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        className={isRTL ? 'pr-8 pl-10' : 'pl-8 pr-10'}
                                        value={pu.price}
                                        onChange={(e) => updateUnit(index, 'price', parseFloat(e.target.value) || 0)}
                                    />
                                    <Button variant="ghost" size="icon" onClick={() => removeUnit(index)} className="text-red-500 hover:text-red-600 hover:bg-red-50 flex-none">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}

                        {productUnits.length === 0 && (
                            <div className="text-center text-gray-500 py-4 text-sm border-2 border-dashed rounded-lg">
                                {t('admin.products_form.no_units', 'No units defined for this product yet.')}
                            </div>
                        )}

                        <div className="flex gap-2 relative">
                            <Button variant="outline" onClick={addUnit} className="flex-1 border-dashed">
                                <Plus className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} /> {t('admin.products_form.add_unit', 'Add Unit')}
                            </Button>
                            <Button variant="outline" onClick={() => setShowNewUnit(!showNewUnit)} className="flex-1 border-dashed text-purple-600 border-purple-200 bg-purple-50 hover:bg-purple-100 min-w-10">
                                <Plus className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} /> {t('admin.products_form.create_new_unit', 'Create New Unit')}
                            </Button>
                        </div>

                        {showNewUnit && (
                            <div className="p-3 bg-purple-50 rounded-lg border border-purple-100 space-y-3 mt-3">
                                <h4 className="text-sm font-medium text-purple-900">{t('admin.products_form.create_new_unit_db', 'Create New Unit Database Entry')}</h4>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder={t('admin.products_form.name_en', 'Name (English) *')}
                                        value={newUnitName}
                                        onChange={e => setNewUnitName(e.target.value)}
                                        className="h-8 text-sm"
                                    />
                                    <Input
                                        placeholder={t('admin.products_form.name_ar', 'Name (Arabic) *')}
                                        value={newUnitNameAr}
                                        onChange={e => setNewUnitNameAr(e.target.value)}
                                        className="h-8 text-sm text-end font-arabic"
                                        dir="rtl"
                                    />
                                    <Button size="sm" onClick={handleCreateNewUnit} disabled={creatingUnit} className="h-8 bg-purple-600 hover:bg-purple-700">
                                        {creatingUnit ? <Loader2 className="w-4 h-4 animate-spin" /> : t('admin.products_form.create', 'Create')}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <DialogFooter className="pt-4 border-t mt-4 gap-2">
                    <Button variant="ghost" onClick={onClose}>{t('common.cancel', 'Cancel')}</Button>
                    <Button onClick={handleSave} disabled={saving || loading} className="bg-purple-600 hover:bg-purple-700">
                        {saving ? <Loader2 className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'} animate-spin`} /> : <Save className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />}
                        {t('common.save', 'Save')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
