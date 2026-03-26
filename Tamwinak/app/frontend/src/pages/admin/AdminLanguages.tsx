import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage, Language, STATIC_LABELS } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { Loader2, Plus, Edit, Trash, Check, X, Search } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { apiCall } from '@/lib/axios';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function AdminLanguages() {
    const { t, refreshLanguages } = useLanguage();
    const [languages, setLanguages] = useState<Language[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentLang, setCurrentLang] = useState<Partial<Language> | null>(null);
    const [labelSearch, setLabelSearch] = useState('');
    const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; message: string; onConfirm: () => void }>({ open: false, message: '', onConfirm: () => {} });
    const openConfirm = (message: string, onConfirm: () => void) => setConfirmDialog({ open: true, message, onConfirm });

    const fetchLanguages = useCallback(async (signal?: AbortSignal) => {
        setLoading(true);
        try {
            const res = await apiCall.invoke({
                url: '/api/v1/languages',
                method: 'GET',
                signal,
            });
            if (res.data) {
                setLanguages(res.data.items || res.data);
            }
        } catch (err: any) {
            if (err?.code === 'ERR_CANCELED') return;
            toast.error(t('error.fetch_languages', 'Failed to fetch languages'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        const controller = new AbortController();
        fetchLanguages(controller.signal);
        return () => controller.abort();
    }, [fetchLanguages]);


    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentLang) return;

        try {
            const url = currentLang.id ? `/api/v1/languages/${currentLang.id}` : '/api/v1/languages';
            const method = currentLang.id ? 'PUT' : 'POST';

            const payload = {
                code: currentLang.code,
                name: currentLang.name,
                isDefault: currentLang.isDefault,
                isRtl: currentLang.isRtl,
                translations: currentLang.translations || {}
            };

            const res = await apiCall.invoke({
                url,
                method,
                data: payload
            });

            if (res.data) {
                toast.success(currentLang.id ? t('success.updated', 'Updated') : t('success.created', 'Created'));
                setIsEditing(false);
                setCurrentLang(null);
                await refreshLanguages();
            }
        } catch (error: any) {
            toast.error(error.response?.data?.detail || t('error.save', 'Error saving language'));
        }
    };

    const handleDelete = (id: number) => {
        openConfirm(
            t('admin.delete_confirm', 'Are you sure you want to delete this language?'),
            async () => {
                try {
                    await apiCall.invoke({ url: `/api/v1/languages/${id}`, method: 'DELETE' });
                    toast.success(t('success.deleted', 'Deleted successfully'));
                    await refreshLanguages();
                } catch (error: any) {
                    toast.error(error.response?.data?.detail || t('error.delete', 'Error deleting'));
                }
            }
        );
    }


    const handleTranslationChange = (key: string, value: string) => {
        if (!currentLang) return;
        setCurrentLang({
            ...currentLang,
            translations: {
                ...(currentLang.translations || {}),
                [key]: value
            }
        });
    }

    const filteredLabels = useMemo(() => {
        if (!labelSearch.trim()) return STATIC_LABELS;
        const q = labelSearch.toLowerCase();
        return STATIC_LABELS.filter(
            (l) => l.key.toLowerCase().includes(q) || l.defaultEn?.toLowerCase().includes(q) || l.defaultAr?.includes(q)
        );
    }, [labelSearch]);

    const formatLabelKey = (key: string) => {
        return key
            .split('.')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).replace(/_/g, ' '))
            .join(' ');
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            </div>
        );
    }

    if (isEditing && currentLang) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold">
                        {currentLang.id ? t('admin.edit_language', 'Edit Language') : t('admin.add_language', 'Add Language')}
                    </h1>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                        <X className="w-4 h-4 mr-2" /> {t('common.cancel', 'Cancel')}
                    </Button>
                </div>

                <form onSubmit={handleSave} className="space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('admin.basic_info', 'Basic Information')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{t('admin.lang_code', 'Language Code (e.g. en, ar)')}</Label>
                                    <Input
                                        required
                                        value={currentLang.code || ''}
                                        onChange={(e) => setCurrentLang({ ...currentLang, code: e.target.value })}
                                        disabled={!!currentLang.id} // Code usually shouldn't change
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('admin.lang_name', 'Language Name (e.g. English, العربية)')}</Label>
                                    <Input
                                        required
                                        value={currentLang.name || ''}
                                        onChange={(e) => setCurrentLang({ ...currentLang, name: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="isDefault"
                                    checked={currentLang.isDefault || false}
                                    onCheckedChange={(checked) => setCurrentLang({ ...currentLang, isDefault: checked as boolean })}
                                />
                                <Label htmlFor="isDefault">{t('admin.default_lang', 'Default Language')}</Label>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="isRtl"
                                    checked={currentLang.isRtl || false}
                                    onCheckedChange={(checked) => setCurrentLang({ ...currentLang, isRtl: checked as boolean })}
                                />
                                <Label htmlFor="isRtl">{t('admin.is_rtl', 'Right to Left (RTL)')}</Label>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('admin.translations_title', 'Static Label Translations')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* F-10: search to limit visible inputs */}
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    className="pl-9"
                                    placeholder={t('admin.search_labels', 'Search labels...')}
                                    value={labelSearch}
                                    onChange={(e) => setLabelSearch(e.target.value)}
                                />
                            </div>
                            <p className="text-xs text-gray-500 -mt-2">{filteredLabels.length} / {STATIC_LABELS.length} {t('admin.labels_shown', 'labels shown')}</p>
                            {filteredLabels.map((label) => (
                                <div key={label.key} className="space-y-2 pb-4 border-b border-gray-100 last:border-0">
                                    <div className="flex justify-between items-center text-sm">
                                        <div className="flex flex-col">
                                            <Label className="font-semibold text-gray-700">
                                                {formatLabelKey(label.key)}
                                                <span className="text-[11px] text-green-600 font-normal ml-2 italic">
                                                    — {label.defaultAr}
                                                </span>
                                            </Label>
                                            {label.description && (
                                                <span className="text-[10px] text-gray-400 mt-0.5">
                                                    {label.description}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-gray-400 font-mono">
                                            {t('admin.default_ar', 'Default Ar')}: {label.defaultAr} | {t('admin.default_en', 'Default En')}: {label.defaultEn}
                                        </div>
                                    </div>
                                    <Input
                                        value={currentLang.translations?.[label.key] || ''}
                                        onChange={(e) => handleTranslationChange(label.key, e.target.value)}
                                        placeholder={t('admin.translation_placeholder', `Enter translation for ${label.key}`)}
                                        className="mt-1"
                                    />
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Button type="submit" className="w-full md:w-auto bg-green-600 hover:bg-green-700">
                        <Check className="w-4 h-4 mr-2" /> {t('common.save', 'Save')}
                    </Button>
                </form>
            </div>
        )
    }

    return (
        <>
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">{t('admin.languages', 'Languages')}</h1>
                <Button onClick={() => { setCurrentLang({ translations: {} }); setIsEditing(true); }} className="bg-green-600 hover:bg-green-700">
                    <Plus className="w-4 h-4 mr-2" /> {t('admin.add_language', 'Add Language')}
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {languages.map(lang => (
                    <Card key={lang.id}>
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-lg">{lang.name} ({lang.code})</h3>
                                <p className="text-sm text-gray-500">
                                    {lang.isDefault && <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs mr-2">{t('admin.default_lang', 'Default')}</span>}
                                    {lang.isRtl ? 'RTL' : 'LTR'}
                                </p>
                            </div>
                            <div className="flex space-x-2">
                                <Button variant="outline" size="sm" onClick={() => { setCurrentLang(lang); setIsEditing(true); }}>
                                    <Edit className="w-4 h-4" />
                                </Button>
                                {!lang.isDefault && (
                                    <Button variant="destructive" size="sm" onClick={() => handleDelete(lang.id)}>
                                        <Trash className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {languages.length === 0 && (
                    <div className="text-center p-8 text-gray-500">
                        {t('common.no_results', 'No languages found.')}
                    </div>
                )}
            </div>
        </div>

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(s => ({ ...s, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(s => ({ ...s, open: false })); }} className="bg-red-600 hover:bg-red-700">
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        </>
    );
}
