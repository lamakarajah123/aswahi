import { useState, useEffect, useCallback } from 'react';
import { apiCall } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Edit, Trash2, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface StoreGroup {
    id: number;
    name: string;
    delivery_fee: number;
    is_active: boolean;
    stores?: { id: number; name: string }[];
}

export default function AdminDeliveryGroups() {
    const { t } = useLanguage();
    const [groups, setGroups] = useState<StoreGroup[]>([]);
    const [allStores, setAllStores] = useState<{ id: number; name: string }[]>([]);
    const [loading, setLoading] = useState(true);

    const [modalOpen, setModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<StoreGroup | null>(null);
    const [formData, setFormData] = useState({ name: '', delivery_fee: '0', is_active: true, store_ids: [] as number[] });
    const [saving, setSaving] = useState(false);
    const [storeSearch, setStoreSearch] = useState('');
    const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; message: string; onConfirm: () => void }>({ open: false, message: '', onConfirm: () => { } });
    const openConfirm = (message: string, onConfirm: () => void) => setConfirmDialog({ open: true, message, onConfirm });

    const loadData = useCallback(async (signal?: AbortSignal) => {
        try {
            const [groupsRes, storesRes] = await Promise.all([
                apiCall.invoke({ url: '/api/v1/grocery/admin/store-groups', method: 'GET', signal }),
                apiCall.invoke({ url: '/api/v1/grocery/admin/stores?limit=200', method: 'GET', signal })
            ]);
            setGroups(groupsRes.data);
            
            // storesRes.data could be { data: [] } or just [] depending on pagination
            const rawStores = storesRes.data?.data || storesRes.data || [];
            setAllStores(rawStores.map((s: any) => ({ id: s.id, name: s.name })));
        } catch (err: any) {
            if (err?.code === 'ERR_CANCELED') return;
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        loadData(controller.signal);
        return () => controller.abort();
    }, [loadData]);

    const handleOpenModal = (group?: StoreGroup) => {
        if (group) {
            setEditingGroup(group);
            setFormData({ 
                name: group.name, 
                delivery_fee: group.delivery_fee.toString(), 
                is_active: group.is_active,
                store_ids: group.stores?.map(s => s.id) || []
            });
        } else {
            setEditingGroup(null);
            setFormData({ name: '', delivery_fee: '0', is_active: true, store_ids: [] });
        }
        setStoreSearch('');
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name) {
            toast.error('Name is required');
            return;
        }

        setSaving(true);
        try {
            if (editingGroup) {
                await apiCall.invoke({
                    url: `/api/v1/grocery/admin/store-groups/${editingGroup.id}`,
                    method: 'PUT',
                    data: formData,
                });
                toast.success('Group updated');
            } else {
                await apiCall.invoke({
                    url: '/api/v1/grocery/admin/store-groups',
                    method: 'POST',
                    data: formData,
                });
                toast.success('Group created');
            }
            setModalOpen(false);
            loadData();
        } catch (e: any) {
            toast.error(e?.response?.data?.detail || 'Failed to save group');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (id: number) => {
        openConfirm(
            'Are you sure you want to delete this delivery group? Stores in this group will revert to individual fees.',
            async () => {
                try {
                    await apiCall.invoke({ url: `/api/v1/grocery/admin/store-groups/${id}`, method: 'DELETE' });
                    toast.success('Group deleted');
                    loadData();
                } catch (e: any) {
                    toast.error(e?.response?.data?.detail || 'Failed to delete group');
                }
            }
        );
    };

    const toggleStore = (id: number) => {
        setFormData(f => {
            const ids = f.store_ids.includes(id) 
                ? f.store_ids.filter(x => x !== id)
                : [...f.store_ids, id];
            return { ...f, store_ids: ids };
        });
    };

    const filteredStores = allStores.filter(s => 
        s.name.toLowerCase().includes(storeSearch.toLowerCase())
    );

    return (
        <>
            <div className="space-y-6">
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-md p-6 text-white mb-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold">مجموعات التوصيل المشترك</h1>
                            <p className="opacity-80 mt-1">إدارة المتاجر المرتبطة بسعر توصيل واحد موحد لتبسيط تجربة العميل.</p>
                        </div>
                        <Button onClick={() => handleOpenModal()} className="bg-white text-purple-600 hover:bg-purple-50 font-bold gap-2 rounded-xl h-11 px-6 border-0 shadow-lg transition-all active:scale-95">
                            <Plus className="w-5 h-5" /> إضافة مجموعة
                        </Button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center p-12"><Loader2 className="w-10 h-10 animate-spin text-purple-600" /></div>
                ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {groups.map((group) => (
                            <div key={group.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                                <div className="p-5 flex justify-between items-start border-b border-gray-50 bg-gray-50/30">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-lg text-gray-900">{group.name}</h3>
                                            <Badge variant={group.is_active ? 'default' : 'secondary'} className={group.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}>
                                                {group.is_active ? 'نشط' : 'معطل'}
                                            </Badge>
                                        </div>
                                        <p className="text-sm font-semibold text-purple-600">رسوم التوصيل: ₪{group.delivery_fee}</p>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="w-9 h-9 text-gray-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => handleOpenModal(group)}>
                                            <Edit className="w-5 h-5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="w-9 h-9 text-gray-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(group.id)}>
                                            <Trash2 className="w-5 h-5" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="p-5">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">المتاجر في هذه المجموعة ({group.stores?.length || 0})</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {group.stores && group.stores.length > 0 ? (
                                            group.stores.map(s => (
                                                <Badge key={s.id} variant="outline" className="px-3 py-1 border-gray-200 text-gray-600 font-medium">
                                                    {s.name}
                                                </Badge>
                                            ))
                                        ) : (
                                            <span className="text-sm text-gray-400 italic">لا يوجد متاجر مرتبطة</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                    <DialogContent className="max-w-2xl overflow-hidden p-0 rounded-2xl border-0 shadow-2xl">
                        <DialogHeader className="p-6 bg-purple-600 text-white">
                            <DialogTitle className="text-xl font-bold">{editingGroup ? 'تعديل مجموعة التوصيل' : 'إضافة مجموعة توصيل جديدة'}</DialogTitle>
                        </DialogHeader>
                        
                        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-bold text-gray-700 block mb-1.5">اسم المجموعة</label>
                                    <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="مثلاً: مطاعم المركز" className="h-11 rounded-xl" />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-gray-700 block mb-1.5">سعر التوصيل الثابت (₪)</label>
                                    <Input type="number" step="0.5" value={formData.delivery_fee} onChange={e => setFormData({ ...formData, delivery_fee: e.target.value })} className="h-11 rounded-xl" />
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-sm font-bold text-gray-700">تحديد المتاجر المرتبطة</label>
                                    <div className="relative w-48">
                                        <Input 
                                            placeholder="بحث..." 
                                            value={storeSearch} 
                                            onChange={e => setStoreSearch(e.target.value)}
                                            className="h-8 text-xs rounded-lg pl-8"
                                        />
                                        <div className="absolute left-2.5 top-2.5 opacity-40">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                        </div>
                                    </div>
                                </div>
                                <div className="border border-gray-100 rounded-xl overflow-hidden bg-gray-50/50">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 p-3 max-h-48 overflow-y-auto">
                                        {filteredStores.map(s => (
                                            <button
                                                key={s.id}
                                                type="button"
                                                onClick={() => toggleStore(s.id)}
                                                className={`flex items-center gap-2 p-2.5 rounded-lg text-sm transition-all border ${
                                                    formData.store_ids.includes(s.id) 
                                                        ? 'bg-purple-50 border-purple-200 text-purple-700 shadow-sm' 
                                                        : 'hover:bg-white hover:border-gray-200 border-transparent text-gray-600'
                                                }`}
                                            >
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                                    formData.store_ids.includes(s.id) ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white border-gray-300'
                                                }`}>
                                                    {formData.store_ids.includes(s.id) && <Check className="w-3 h-3 stroke-[3]" />}
                                                </div>
                                                <span className="font-semibold truncate">{s.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-2 px-1">تلميح: المتاجر المحددة سيتم تطبيق سعر هذه المجموعة عليها بشكل آلي عند الطلب منها معاً.</p>
                            </div>

                            <div className="flex items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div className="flex-1">
                                    <label className="text-sm font-bold text-gray-900">تفعيل هذه المجموعة فوراً</label>
                                    <p className="text-[11px] text-gray-500">إذا تم التعطيل، سيعود نظام التوصيل لكل متجر لحسابه الفردي.</p>
                                </div>
                                <Switch checked={formData.is_active} onCheckedChange={c => setFormData({ ...formData, is_active: c })} />
                            </div>
                        </div>

                        <div className="flex justify-end p-6 bg-gray-50 gap-3">
                            <Button variant="outline" onClick={() => setModalOpen(false)} className="h-11 rounded-xl px-6">إلغاء</Button>
                            <Button className="bg-purple-600 hover:bg-purple-700 h-11 rounded-xl px-10 shadow-lg shadow-purple-200 transition-all active:scale-95" onClick={handleSave} disabled={saving}>
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ التغييرات'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(s => ({ ...s, open }))}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>تأكيد الإجراء</AlertDialogTitle>
                        <AlertDialogDescription>{confirmDialog.message}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(s => ({ ...s, open: false })); }} className="bg-red-600 hover:bg-red-700">
                            تأكيد
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
