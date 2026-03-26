import { useState, useEffect, useCallback } from 'react';
import { apiCall } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Edit, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { Unit } from './types';

export default function AdminUnits() {
    const { t } = useLanguage();
    const [units, setUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(true);

    const [modalOpen, setModalOpen] = useState(false);
    const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
    const [formData, setFormData] = useState({ name: '', name_ar: '', is_active: true, step: 1.0, allow_decimal: false });
    const [saving, setSaving] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; message: string; onConfirm: () => void }>({ open: false, message: '', onConfirm: () => { } });
    const openConfirm = (message: string, onConfirm: () => void) => setConfirmDialog({ open: true, message, onConfirm });

    const loadUnits = useCallback(async (signal?: AbortSignal) => {
        try {
            const res = await apiCall.invoke({ url: '/api/v1/units', method: 'GET', signal });
            setUnits(res.data);
        } catch (err: any) {
            if (err?.code === 'ERR_CANCELED') return;
            toast.error(t('error.load_units', 'Failed to load units'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        const controller = new AbortController();
        loadUnits(controller.signal);
        return () => controller.abort();
    }, [loadUnits]);

    const handleOpenModal = (unit?: Unit) => {
        if (unit) {
            setEditingUnit(unit);
            setFormData({ name: unit.name, name_ar: unit.name_ar || '', is_active: unit.is_active, step: unit.step || 1.0, allow_decimal: unit.allow_decimal || false });
        } else {
            setEditingUnit(null);
            setFormData({ name: '', name_ar: '', is_active: true, step: 1.0, allow_decimal: false });
        }
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name) {
            toast.error(t('error.unit_name_req', 'Name is required'));
            return;
        }

        setSaving(true);
        try {
            if (editingUnit) {
                await apiCall.invoke({
                    url: `/api/v1/units/${editingUnit.id}`,
                    method: 'PUT',
                    data: formData,
                });
                toast.success(t('success.unit_updated', 'Unit updated'));
            } else {
                await apiCall.invoke({
                    url: '/api/v1/units',
                    method: 'POST',
                    data: formData,
                });
                toast.success(t('success.unit_created', 'Unit created'));

            }
            setModalOpen(false);
            loadUnits();
        } catch (e: any) {
            toast.error(e?.response?.data?.detail || t('error.save_unit', 'Failed to save unit'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (id: number) => {
        openConfirm(
            t('admin.units.confirm_delete', 'Are you sure you want to delete this unit?'),
            async () => {
                try {
                    await apiCall.invoke({ url: `/api/v1/units/${id}`, method: 'DELETE' });
                    toast.success(t('success.unit_deleted', 'Unit deleted'));
                    loadUnits();
                } catch (e: any) {
                    toast.error(e?.response?.data?.detail || t('error.delete_unit', 'Failed to delete unit'));
                }
            }
        );
    };

    return (
        <>
            <div className="space-y-6">
            <div className="flex justify-between items-center bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h1 className="text-xl font-semibold text-gray-900">{t('admin.units.title', 'Units')}</h1>
                <Button onClick={() => handleOpenModal()} className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
                    <Plus className="w-4 h-4" /> {t('admin.units.add', 'Add Unit')}
                </Button>
            </div>

                {loading ? (
                    <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                                        <th className="py-3 px-4 font-semibold text-start border-e border-gray-200 w-20">{t('admin.units.id', 'ID')}</th>
                                        <th className="py-3 px-4 font-semibold text-start border-e border-gray-200">{t('admin.units.name', 'Name')}</th>
                                        <th className="py-3 px-4 font-semibold text-start border-e border-gray-200">{t('admin.units.name_ar', 'Name (Ar)')}</th>
                                        <th className="py-3 px-4 font-semibold text-center border-e border-gray-200 w-32">{t('admin.units.step', 'Step')}</th>
                                        <th className="py-3 px-4 font-semibold text-center border-e border-gray-200 w-32">{t('admin.units.active', 'Active')}</th>
                                        <th className="py-3 px-4 font-semibold text-center w-32">{t('admin.units.actions', 'Actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {units.map((unit) => (
                                        <tr key={unit.id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="py-3 px-4 text-gray-500 font-medium border-e border-gray-200 text-center">
                                                #{unit.id}
                                            </td>
                                            <td className="py-3 px-4 font-medium text-gray-900 border-e border-gray-200">
                                                {unit.name}
                                            </td>
                                            <td className="py-3 px-4 font-medium text-gray-600 border-e border-gray-200">
                                                {unit.name_ar || <span className="text-gray-400">—</span>}
                                            </td>
                                            <td className="py-3 px-4 text-center border-e border-gray-200">
                                                {unit.allow_decimal ? (
                                                    <Badge className="bg-blue-50 text-blue-600 border-blue-100">{t('admin.units.decimal', 'Decimals')}</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-gray-400 border-gray-100">{t('admin.units.whole', 'Whole')}</Badge>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-center border-e border-gray-200">
                                                <div className="flex justify-center items-center">
                                                    <Switch
                                                        checked={unit.is_active}
                                                        onCheckedChange={async (checked) => {
                                                            try {
                                                                await apiCall.invoke({ url: `/api/v1/units/${unit.id}`, method: 'PUT', data: { is_active: checked } });
                                                                loadUnits();
                                                            } catch {
                                                                toast.error(t('error.update_failed', 'Update failed'));
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 border border-transparent transition-all" onClick={() => handleOpenModal(unit)} title={t('admin.industries.edit', 'Edit')}>
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-transparent transition-all" onClick={() => handleDelete(unit.id)} title={t('admin.industries.delete', 'Delete')}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {units.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="py-12 text-center text-gray-500 font-medium">
                                                {t('admin.units.no_units', 'No units found')}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingUnit ? t('admin.units.edit_dialog_title', 'Edit Unit') : t('admin.units.add_dialog_title', 'Add Unit')}</DialogTitle>
                        </DialogHeader>
                        
                        {!editingUnit && (
                            <div className="flex gap-2 flex-wrap mb-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-full text-xs"
                                    onClick={() => setFormData({ name: 'Piece', name_ar: 'حبة', is_active: true, step: 1.0, allow_decimal: false })}
                                >
                                    {t('admin.units.preset_piece', 'حبة')}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-full text-xs text-green-600 bg-green-50"
                                    onClick={() => setFormData({ name: 'Kilogram', name_ar: 'كيلو', is_active: true, step: 0.1, allow_decimal: true })}
                                >
                                    {t('admin.units.preset_kg', 'كيلو')} (0.1)
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-full text-xs text-green-600 bg-green-50"
                                    onClick={() => setFormData({ name: 'Gram', name_ar: 'جرام', is_active: true, step: 100, allow_decimal: false })}
                                >
                                    {t('admin.units.preset_gram', 'جرام')} (100)
                                </Button>
                            </div>
                        )}

                        <div className="space-y-4 pt-2">
                            <div>
                                <label className="text-sm font-medium block mb-1">{t('admin.units.name_en_req', 'Name (English) *')}</label>
                                <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder={t('admin.units.eg_kg', 'e.g. Kg')} />
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1">{t('admin.units.name_ar_label', 'Name (Arabic)')}</label>
                                <Input value={formData.name_ar} onChange={e => setFormData({ ...formData, name_ar: e.target.value })} placeholder={t('admin.units.eg_kg_ar', 'e.g. كغم')} className="text-end font-arabic" dir="rtl" />
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="space-y-0.5">
                                    <label className="text-sm font-semibold text-gray-900">{t('admin.units.allow_decimals', 'Allow Decimals (1.5, 0.5...)')}</label>
                                    <p className="text-xs text-gray-500">{t('admin.units.allow_decimals_desc', 'Enable for weighted products like Kilograms')}</p>
                                </div>
                                <Switch checked={formData.allow_decimal} onCheckedChange={c => setFormData({ ...formData, allow_decimal: c, step: c ? 0.1 : 1.0 })} />
                            </div>

                            {formData.allow_decimal && (
                              <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 mt-2">
                                  <label className="text-xs font-bold text-blue-600 uppercase mb-1 block">{t('admin.units.step_label', 'Quantity Step (Current: 0.1)')}</label>
                                  <Input type="number" step="0.1" value={formData.step} onChange={e => setFormData({ ...formData, step: parseFloat(e.target.value) || 0.1 })} className="bg-white border-blue-200 focus:ring-blue-500" />
                              </div>
                            )}

                            <div className="flex items-center gap-2 pt-2">
                                <label className="text-sm font-medium">{t('admin.units.active', 'Active')}</label>
                                <Switch checked={formData.is_active} onCheckedChange={c => setFormData({ ...formData, is_active: c })} />
                            </div>
                            <div className="flex justify-end pt-4 gap-2">
                                <Button variant="outline" onClick={() => setModalOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
                                <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleSave} disabled={saving}>
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.save', 'Save')}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(s => ({ ...s, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirm.action', 'Confirm Action')}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(s => ({ ...s, open: false })); }} className="bg-red-600 hover:bg-red-700">
              {t('common.confirm', 'Confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
