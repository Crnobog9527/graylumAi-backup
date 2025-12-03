import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Megaphone, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

import AdminSidebar from '../components/admin/AdminSidebar';
import { LanguageProvider, useLanguage } from '../components/admin/LanguageContext';

const defaultSettings = {
  // 聊天页面
  chat_billing_hint: { value: '⚡ 按实际Token消耗计费：输入 {input}积分/1K tokens，输出 {output}积分/1K tokens', type: 'string', label: '计费提示文案', description: '聊天页面底部显示的计费说明，{input}和{output}会替换为实际值' },
  chat_show_model_selector: { value: 'true', type: 'boolean', label: '显示模型选择器', description: '是否在聊天页面顶部显示模型切换按钮' },
};

function AdminAnnouncementsContent() {
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
      toast.success('保存成功');
    } catch (error) {
      toast.error('保存失败');
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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar currentPage="AdminAnnouncements" />
      
      <div className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">公告管理</h1>
            <p className="text-slate-500 mt-1">管理平台公告和提示信息</p>
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
            {saving ? '保存中...' : '保存设置'}
          </Button>
        </div>

        <div className="space-y-6">
          {/* 聊天页面公告 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-violet-500" />
                聊天页面
              </CardTitle>
              <CardDescription>配置聊天页面显示的提示信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 模型选择器开关 */}
              <div className="flex items-center justify-between py-4 border-b border-slate-100">
                <div>
                  <Label className="text-base">{settings.chat_show_model_selector?.label}</Label>
                  <p className="text-sm text-slate-500 mt-1">{settings.chat_show_model_selector?.description}</p>
                </div>
                <Switch
                  checked={settings.chat_show_model_selector?.value === 'true'}
                  onCheckedChange={(checked) => updateSetting('chat_show_model_selector', checked.toString())}
                />
              </div>

              {/* 计费提示文案 */}
              <div className="space-y-3 pt-4">
                <div>
                  <Label className="text-base">{settings.chat_billing_hint?.label}</Label>
                  <p className="text-sm text-slate-500 mt-1">{settings.chat_billing_hint?.description}</p>
                </div>
                <Textarea
                  value={settings.chat_billing_hint?.value || ''}
                  onChange={(e) => updateSetting('chat_billing_hint', e.target.value)}
                  placeholder="输入计费提示文案..."
                  className="min-h-[80px]"
                />
                <div className="p-3 bg-slate-50 rounded-lg border">
                  <p className="text-xs text-slate-500 mb-1">预览效果：</p>
                  <p className="text-sm text-slate-600">
                    {(settings.chat_billing_hint?.value || '')
                      .replace('{input}', '1')
                      .replace('{output}', '5')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function AdminAnnouncements() {
  return (
    <LanguageProvider>
      <AdminAnnouncementsContent />
    </LanguageProvider>
  );
}