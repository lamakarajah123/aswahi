import { useState, useEffect, useCallback } from 'react';
import { apiCall } from '@/lib/axios';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { AppSetting } from './types';

export default function AdminSettings() {
    const { t } = useLanguage();
    const [settings, setSettings] = useState<AppSetting[]>([]);
    const [editingSettings, setEditingSettings] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(true);

    const loadSettings = useCallback(async (signal?: AbortSignal) => {
        try {
            setLoading(true);
            const res = await apiCall.invoke({ url: '/api/v1/grocery/admin/settings', method: 'GET', signal });
            setSettings(res.data || []);
        } catch (err: any) {
            if (err?.code === 'ERR_CANCELED') return;
            toast.error(t('error.load_settings', 'Failed to load settings'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        const controller = new AbortController();
        loadSettings(controller.signal);
        return () => controller.abort();
    }, [loadSettings]);

    const updateSetting = async (settingId: number) => {
        const newValue = editingSettings[settingId];
        if (!newValue) return;
        try {
            await apiCall.invoke({
                url: `/api/v1/grocery/admin/settings/${settingId}`,
                method: 'PUT',
                data: { value: newValue },
            });
            toast.success(t('success.update_setting', 'Setting updated successfully'));
            setEditingSettings((prev) => {
                const copy = { ...prev };
                delete copy[settingId];
                return copy;
            });
            loadSettings();
        } catch {
            toast.error(t('error.update_setting', 'Failed to update setting'));
        }
    };

    if (loading) return <div className="text-center py-16"><p className="text-gray-500">{t('admin.settings.loading', 'Loading settings...')}</p></div>;

    return (
        <div className="space-y-4">
            <Card className="border border-gray-100 shadow-sm overflow-hidden min-h-[50vh]">
                <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
                    <CardTitle className="text-lg flex items-center gap-2 font-bold text-gray-800">
                        <Settings className="w-5 h-5 text-gray-600" /> {t('admin.settings.title', 'Platform Configuration')}
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1">{t('admin.settings.desc', 'Manage global application parameters to control behavior across the platform.')}</p>
                </CardHeader>
                <CardContent className="p-6 bg-white">
                    {settings.length === 0 ? (
                        <div className="text-center py-12 border border-gray-100 rounded-lg">
                            <Settings className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">{t('admin.settings.no_settings', 'No settings available to configure.')}</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {settings.map((setting) => (
                                <div key={setting.id} className="flex flex-col md:flex-row md:items-center gap-4 bg-gray-50/50 p-4 rounded-lg border border-gray-100 transition-colors hover:border-gray-200">
                                    <div className="flex-1 space-y-1">
                                        <p className="font-bold text-sm text-gray-800">{setting.description || setting.key}</p>
                                        <p className="text-xs text-gray-500 font-medium font-mono bg-gray-100/80 inline-block px-1.5 py-0.5 rounded border border-gray-200 shadow-sm">{setting.key}</p>
                                    </div>
                                    <div className="flex items-center gap-3 w-full md:w-auto mt-2 md:mt-0">
                                        <Input
                                            className="w-full md:w-48 bg-white border-gray-200 focus-visible:ring-gray-300 font-medium"
                                            value={editingSettings[setting.id] ?? setting.value}
                                            onChange={(e) => setEditingSettings({ ...editingSettings, [setting.id]: e.target.value })}
                                            dir="ltr"
                                        />
                                        {editingSettings[setting.id] !== undefined && editingSettings[setting.id] !== setting.value && (
                                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white font-bold shadow-sm" onClick={() => updateSetting(setting.id)}>
                                                {t('admin.settings.save_changes', 'Save Changes')}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
