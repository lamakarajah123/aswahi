import { useState, useEffect } from 'react';
import { apiCall } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, ChevronDown, ChevronUp, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

interface Option {
    id?: number;
    name: string;
    name_ar: string;
    price_modifier: number;
}

interface Stage {
    id?: number;
    name: string;
    name_ar: string;
    min_selections: number;
    max_selections: number;
    is_required: boolean;
    options: Option[];
    _ui_expanded?: boolean;
}

interface Props {
    productId: number;
    productName: string;
    open: boolean;
    onClose: () => void;
}

export function AdminProductCustomizationDialog({ productId, productName, open, onClose }: Props) {
    const { t } = useLanguage();
    const [loading, setLoading] = useState(false);
    const [hasCustomizations, setHasCustomizations] = useState(false);
    const [stages, setStages] = useState<Stage[]>([]);

    useEffect(() => {
        if (open && productId) {
            loadCustomizations();
        }
    }, [open, productId]);

    const loadCustomizations = async () => {
        try {
            setLoading(true);
            const productRes = await apiCall.invoke({ url: `/api/v1/entities/products/${productId}`, method: 'GET' });
            setHasCustomizations(!!productRes.data?.has_customizations);

            const res = await apiCall.invoke({ url: `/api/v1/entities/products/${productId}/customizations`, method: 'GET' });
            const data = Array.isArray(res.data) ? res.data : [];
            setStages(data.map((s: any) => ({ ...s, _ui_expanded: true })));
        } catch {
            toast.error('Failed to load customizations');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            await apiCall.invoke({
                url: `/api/v1/entities/products/${productId}/customizations`,
                method: 'PUT',
                data: {
                    has_customizations: hasCustomizations,
                    stages: stages.map(s => ({
                        name: s.name,
                        name_ar: s.name_ar,
                        min_selections: s.min_selections,
                        max_selections: s.max_selections,
                        is_required: s.is_required,
                        options: s.options.map(o => ({
                            name: o.name,
                            name_ar: o.name_ar,
                            price_modifier: o.price_modifier
                        }))
                    }))
                }
            });
            toast.success('Customizations updated successfully');
            onClose();
        } catch (err: any) {
            const msg = err?.response?.data?.detail || 'Failed to update customizations';
            toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg));
        } finally {
            setLoading(false);
        }
    };

    const addStage = () => {
        setStages([...stages, {
            name: '',
            name_ar: '',
            min_selections: 0,
            max_selections: 1,
            is_required: false,
            options: [],
            _ui_expanded: true
        }]);
    };

    const removeStage = (index: number) => {
        setStages(stages.filter((_, i) => i !== index));
    };

    const updateStage = (index: number, data: Partial<Stage>) => {
        const newStages = [...stages];
        newStages[index] = { ...newStages[index], ...data };
        setStages(newStages);
    };

    const addOption = (stageIndex: number) => {
        const newStages = [...stages];
        newStages[stageIndex].options.push({ name: '', name_ar: '', price_modifier: 0 });
        setStages(newStages);
    };

    const removeOption = (stageIndex: number, optionIndex: number) => {
        const newStages = [...stages];
        newStages[stageIndex].options = newStages[stageIndex].options.filter((_, i) => i !== optionIndex);
        setStages(newStages);
    };

    const updateOption = (stageIndex: number, optionIndex: number, data: Partial<Option>) => {
        const newStages = [...stages];
        newStages[stageIndex].options[optionIndex] = { ...newStages[stageIndex].options[optionIndex], ...data };
        setStages(newStages);
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 border-b bg-gray-50">
                    <DialogTitle className="flex items-center gap-2">
                        <Settings2 className="w-5 h-5 text-purple-600" />
                        <div>
                            <span>{t('admin.customization.title', 'Product Customizations')}</span>
                            <p className="text-xs font-normal text-gray-500 mt-1">{productName}</p>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="flex items-center justify-between bg-purple-50 p-4 rounded-lg border border-purple-100">
                        <div className="space-y-0.5">
                            <Label className="text-purple-900">{t('admin.customization.enable_label', 'Enable Customization')}</Label>
                            <p className="text-xs text-purple-600">{t('admin.customization.enable_desc', 'Allow customers to customize this product with extra options')}</p>
                        </div>
                        <Switch checked={hasCustomizations} onCheckedChange={setHasCustomizations} />
                    </div>

                    {hasCustomizations && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-gray-900">{t('admin.customization.stages', 'Customization Stages')}</h3>
                                <Button size="sm" variant="outline" className="text-purple-600 border-purple-200 hover:bg-purple-50 gap-1" onClick={addStage}>
                                    <Plus className="w-4 h-4" /> {t('admin.customization.add_stage', 'Add Stage')}
                                </Button>
                            </div>

                            {stages.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed rounded-xl border-gray-200">
                                    <Settings2 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                    <p className="text-sm text-gray-500">{t('admin.customization.no_stages', 'No stages defined yet')}</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {stages.map((stage, sIdx) => (
                                        <div key={sIdx} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                            <div className="flex items-center justify-between p-3 bg-gray-50 border-b">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <Button variant="ghost" size="icon" className="w-6 h-6 hover:bg-gray-200" onClick={() => updateStage(sIdx, { _ui_expanded: !stage._ui_expanded })}>
                                                        {stage._ui_expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                    </Button>
                                                    <div className="flex-1 grid grid-cols-2 gap-2">
                                                        <Input 
                                                            placeholder={t('admin.customization.stage_name', 'Stage Name (EN)')} 
                                                            value={stage.name} 
                                                            onChange={e => updateStage(sIdx, { name: e.target.value })}
                                                            className="h-8 text-sm"
                                                        />
                                                        <Input 
                                                            placeholder={t('admin.customization.stage_name_ar', 'Stage Name (AR)')} 
                                                            value={stage.name_ar} 
                                                            onChange={e => updateStage(sIdx, { name_ar: e.target.value })}
                                                            className="h-8 text-sm text-right"
                                                            dir="rtl"
                                                        />
                                                    </div>
                                                </div>
                                                <Button variant="ghost" size="icon" className="w-8 h-8 text-red-500 hover:bg-red-50 ml-2" onClick={() => removeStage(sIdx)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>

                                            {stage._ui_expanded && (
                                                <div className="p-4 space-y-4">
                                                    <div className="grid grid-cols-3 gap-4">
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs">{t('admin.customization.min', 'Min Selections')}</Label>
                                                            <Input type="number" value={stage.min_selections} onChange={e => updateStage(sIdx, { min_selections: parseInt(e.target.value) || 0 })} className="h-8" />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs">{t('admin.customization.max', 'Max Selections')}</Label>
                                                            <Input type="number" value={stage.max_selections} onChange={e => updateStage(sIdx, { max_selections: parseInt(e.target.value) || 1 })} className="h-8" />
                                                        </div>
                                                        <div className="flex items-center gap-2 pt-6">
                                                            <Switch checked={stage.is_required} onCheckedChange={v => updateStage(sIdx, { is_required: v })} id={`req-${sIdx}`} />
                                                            <Label htmlFor={`req-${sIdx}`} className="text-xs cursor-pointer">{t('admin.customization.required', 'Required')}</Label>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">{t('admin.customization.options', 'Options')}</Label>
                                                            <Button size="sm" variant="ghost" className="h-7 text-[10px] text-purple-600 hover:bg-purple-50 gap-1 px-2" onClick={() => addOption(sIdx)}>
                                                                <Plus className="w-3 h-3" /> {t('admin.customization.add_option', 'Add Option')}
                                                            </Button>
                                                        </div>

                                                        {stage.options.map((opt, oIdx) => (
                                                            <div key={oIdx} className="flex gap-2 items-start bg-gray-50/50 p-2 rounded-lg border border-gray-100">
                                                                <div className="flex-1 grid grid-cols-4 gap-2">
                                                                    <div className="col-span-1.5">
                                                                        <Input placeholder="Name (EN)" value={opt.name} onChange={e => updateOption(sIdx, oIdx, { name: e.target.value })} className="h-8 text-xs" />
                                                                    </div>
                                                                    <div className="col-span-1.5">
                                                                        <Input placeholder="Name (AR)" value={opt.name_ar} onChange={e => updateOption(sIdx, oIdx, { name_ar: e.target.value })} className="h-8 text-xs text-right" dir="rtl" />
                                                                    </div>
                                                                    <div className="col-span-1">
                                                                        <div className="relative">
                                                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">₪</span>
                                                                            <Input type="number" step="0.5" placeholder="Extra" value={opt.price_modifier} onChange={e => updateOption(sIdx, oIdx, { price_modifier: parseFloat(e.target.value) || 0 })} className="h-8 pl-5 text-xs font-bold text-green-600" />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <Button variant="ghost" size="icon" className="w-8 h-8 text-gray-400 hover:text-red-500 hover:bg-red-50" onClick={() => removeOption(sIdx, oIdx)}>
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="p-4 border-t bg-gray-50">
                    <Button variant="outline" onClick={onClose} disabled={loading}>{t('common.cancel', 'Cancel')}</Button>
                    <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={handleSave} disabled={loading}>
                        {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : t('common.save', 'Save Changes')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
