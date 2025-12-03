import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Settings, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

import AdminSidebar from '../components/admin/AdminSidebar';
import { LanguageProvider, useLanguage } from '../components/admin/LanguageContext';

const defaultSettings = {
  new_user_credits: { value: '10', type: 'number', label: 'New User Credits', description: 'Credits given to new users upon registration' },
  maintenance_mode: { value: 'false', type: 'boolean', label: 'Maintenance Mode', description: 'Enable to show maintenance message to users' },
  max_messages_per_conversation: { value: '100', type: 'number', label: 'Max Messages/Conversation', description: 'Maximum messages allowed per conversation' },
  enable_free_tier: { value: 'true', type: 'boolean', label: 'Enable Free Tier', description: 'Allow users to use limited features without credits' },
  free_tier_messages: { value: '5', type: 'number', label: 'Free Tier Messages', description: 'Number of free messages per day' },
  site_name: { value: 'AI Chat Platform', type: 'string', label: 'Site Name', description: 'The name displayed across the platform' },
  support_email: { value: 'support@example.com', type: 'string', label: 'Support Email', description: 'Email for user support inquiries' },
};

function AdminSettingsContent() {
  const { t } = useLanguage();
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState({});
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        if (userData.role !== 'admin') {
          window.location.href = '/';
          return;
        }
        setUser(userData);
      } catch (e) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  const { data: savedSettings = [], isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => base44.entities.SystemSettings.list(),
    enabled: !!user,
  });

  useEffect(() => {
    const mergedSettings = { ...defaultSettings };
    savedSettings.forEach(s => {
      if (mergedSettings[s.setting_key]) {
        mergedSettings[s.setting_key] = {
          ...mergedSettings[s.setting_key],
          value: s.setting_value,
          id: s.id,
        };
      }
    });
    setSettings(mergedSettings);
  }, [savedSettings]);

  const saveSettingMutation = useMutation({
    mutationFn: async ({ key, value, id }) => {
      if (id) {
        return base44.entities.SystemSettings.update(id, { setting_value: value });
      } else {
        return base44.entities.SystemSettings.create({
          setting_key: key,
          setting_value: value,
          setting_type: defaultSettings[key]?.type || 'string',
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries(['admin-settings']),
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const promises = Object.entries(settings).map(([key, data]) => 
        saveSettingMutation.mutateAsync({ key, value: data.value, id: data.id })
      );
      await Promise.all(promises);
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: { ...prev[key], value }
    }));
  };

  const renderSettingInput = (key, data) => {
    if (data.type === 'boolean') {
      return (
        <Switch
          checked={data.value === 'true'}
          onCheckedChange={(checked) => updateSetting(key, checked.toString())}
        />
      );
    }
    if (data.type === 'number') {
      return (
        <Input
          type="number"
          value={data.value}
          onChange={(e) => updateSetting(key, e.target.value)}
          className="max-w-xs"
        />
      );
    }
    return (
      <Input
        value={data.value}
        onChange={(e) => updateSetting(key, e.target.value)}
        className="max-w-md"
      />
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar currentPage="AdminSettings" />
      
      <div className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{t('settingsTitle')}</h1>
            <p className="text-slate-500 mt-1">{t('settingsSubtitle')}</p>
          </div>
          <Button 
            onClick={handleSave}
            disabled={saving}
            className="bg-violet-600 hover:bg-violet-700 gap-2"
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? t('saving') : t('saveSettings')}
          </Button>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList>
            <TabsTrigger value="general">{t('general')}</TabsTrigger>
            <TabsTrigger value="credits">{t('creditsSettings')}</TabsTrigger>
            <TabsTrigger value="features">{t('features')}</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Basic platform configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {['site_name', 'support_email', 'maintenance_mode'].map(key => {
                  const data = settings[key];
                  if (!data) return null;
                  return (
                    <div key={key} className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0">
                      <div>
                        <Label className="text-base">{data.label}</Label>
                        <p className="text-sm text-slate-500 mt-1">{data.description}</p>
                      </div>
                      {renderSettingInput(key, data)}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="credits">
            <Card>
              <CardHeader>
                <CardTitle>Credit Settings</CardTitle>
                <CardDescription>Configure credit system defaults</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {['new_user_credits'].map(key => {
                  const data = settings[key];
                  if (!data) return null;
                  return (
                    <div key={key} className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0">
                      <div>
                        <Label className="text-base">{data.label}</Label>
                        <p className="text-sm text-slate-500 mt-1">{data.description}</p>
                      </div>
                      {renderSettingInput(key, data)}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features">
            <Card>
              <CardHeader>
                <CardTitle>Feature Settings</CardTitle>
                <CardDescription>Enable or disable platform features</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {['enable_free_tier', 'free_tier_messages', 'max_messages_per_conversation'].map(key => {
                  const data = settings[key];
                  if (!data) return null;
                  return (
                    <div key={key} className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0">
                      <div>
                        <Label className="text-base">{data.label}</Label>
                        <p className="text-sm text-slate-500 mt-1">{data.description}</p>
                      </div>
                      {renderSettingInput(key, data)}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function AdminSettings() {
  return (
    <LanguageProvider>
      <AdminSettingsContent />
    </LanguageProvider>
  );
}