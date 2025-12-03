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
  // 通用设置
  site_name: { value: 'AI Chat Platform', type: 'string', label: '平台名称', description: '平台显示名称', category: 'general' },
  support_email: { value: 'support@example.com', type: 'string', label: '客服邮箱', description: '用户支持邮箱', category: 'general' },
  maintenance_mode: { value: 'false', type: 'boolean', label: '维护模式', description: '开启后用户将看到维护提示', category: 'general' },
  
  // 积分设置
  new_user_credits: { value: '100', type: 'number', label: '注册赠送积分', description: '新用户注册赠送积分(一次性)', category: 'credits' },
  input_credits_per_1k: { value: '1', type: 'number', label: 'Input Token 单价', description: '每1K Input Tokens 消耗积分', category: 'credits' },
  output_credits_per_1k: { value: '5', type: 'number', label: 'Output Token 单价', description: '每1K Output Tokens 消耗积分', category: 'credits' },
  
  // 会员设置
  advanced_monthly_credits: { value: '1500', type: 'number', label: '进阶会员月度积分', description: '进阶会员每月获得积分', category: 'membership' },
  advanced_monthly_price: { value: '9.9', type: 'number', label: '进阶会员月费($)', description: '进阶会员月付价格', category: 'membership' },
  advanced_yearly_price: { value: '99', type: 'number', label: '进阶会员年费($)', description: '进阶会员年付价格', category: 'membership' },
  advanced_yearly_credits: { value: '20000', type: 'number', label: '进阶会员年付积分', description: '进阶会员年付总积分', category: 'membership' },
  advanced_discount: { value: '0.95', type: 'number', label: '进阶会员加油包折扣', description: '进阶会员购买加油包折扣(0.95=95折)', category: 'membership' },
  
  gold_monthly_credits: { value: '5500', type: 'number', label: '黄金会员月度积分', description: '黄金会员每月获得积分', category: 'membership' },
  gold_monthly_price: { value: '29.9', type: 'number', label: '黄金会员月费($)', description: '黄金会员月付价格', category: 'membership' },
  gold_yearly_price: { value: '299', type: 'number', label: '黄金会员年费($)', description: '黄金会员年付价格', category: 'membership' },
  gold_yearly_credits: { value: '72000', type: 'number', label: '黄金会员年付积分', description: '黄金会员年付总积分', category: 'membership' },
  gold_monthly_bonus: { value: '500', type: 'number', label: '黄金会员月度赠送', description: '黄金会员每月赠送加油包积分', category: 'membership' },
  gold_discount: { value: '0.9', type: 'number', label: '黄金会员加油包折扣', description: '黄金会员购买加油包折扣(0.9=9折)', category: 'membership' },
  
  // 邀请奖励
  referral_reward: { value: '50', type: 'number', label: '邀请奖励', description: '成功邀请1人注册获得积分', category: 'credits' },
  referral_bonus: { value: '50', type: 'number', label: '被邀请人奖励', description: '被邀请人额外获得积分', category: 'credits' },
  referral_commission: { value: '0.1', type: 'number', label: '邀请返利比例', description: '被邀请人购买会员返利比例(0.1=10%)', category: 'credits' },
  
  // 签到设置
  sign_in_day1: { value: '5', type: 'number', label: '签到第1天', description: '连续签到第1天奖励', category: 'credits' },
  sign_in_day2: { value: '10', type: 'number', label: '签到第2天', description: '连续签到第2天奖励', category: 'credits' },
  sign_in_day3: { value: '15', type: 'number', label: '签到第3天', description: '连续签到第3天奖励', category: 'credits' },
  sign_in_day4: { value: '20', type: 'number', label: '签到第4天', description: '连续签到第4天奖励', category: 'credits' },
  sign_in_day5: { value: '25', type: 'number', label: '签到第5天', description: '连续签到第5天奖励(然后重置)', category: 'credits' },
  monthly_full_attendance: { value: '50', type: 'number', label: '月度全勤奖', description: '当月签到满30天额外奖励', category: 'credits' },
  
  // 首充优惠
  first_purchase_bonus: { value: '0.2', type: 'number', label: '首充奖励比例', description: '首次购买额外赠送比例(0.2=20%)', category: 'credits' },
  
  // 功能设置
  max_messages_per_conversation: { value: '200', type: 'number', label: '单对话消息上限', description: '每个对话最大消息数', category: 'features' },
  daily_conversation_limit: { value: '200', type: 'number', label: '每日对话上限', description: '单用户每日对话数上限', category: 'features' },
  hourly_request_limit: { value: '100', type: 'number', label: '每小时请求上限', description: '单IP每小时请求上限', category: 'features' },
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
            <TabsTrigger value="general">通用设置</TabsTrigger>
            <TabsTrigger value="credits">积分设置</TabsTrigger>
            <TabsTrigger value="membership">会员设置</TabsTrigger>
            <TabsTrigger value="features">功能限制</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>通用设置</CardTitle>
                <CardDescription>平台基础配置</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.entries(settings).filter(([key, data]) => data.category === 'general').map(([key, data]) => (
                  <div key={key} className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0">
                    <div>
                      <Label className="text-base">{data.label}</Label>
                      <p className="text-sm text-slate-500 mt-1">{data.description}</p>
                    </div>
                    {renderSettingInput(key, data)}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="credits">
            <Card>
              <CardHeader>
                <CardTitle>积分设置</CardTitle>
                <CardDescription>配置积分计费规则、签到奖励、邀请奖励等</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>积分换算规则:</strong> 1 积分 = 1,000 tokens<br/>
                    <strong>默认计费:</strong> Input 1积分/1K tokens, Output 5积分/1K tokens
                  </p>
                </div>
                {Object.entries(settings).filter(([key, data]) => data.category === 'credits').map(([key, data]) => (
                  <div key={key} className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0">
                    <div>
                      <Label className="text-base">{data.label}</Label>
                      <p className="text-sm text-slate-500 mt-1">{data.description}</p>
                    </div>
                    {renderSettingInput(key, data)}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="membership">
            <Card>
              <CardHeader>
                <CardTitle>会员设置</CardTitle>
                <CardDescription>配置进阶会员和黄金会员权益</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  {/* 进阶会员 */}
                  <div className="p-4 bg-violet-50 rounded-lg border border-violet-100">
                    <h3 className="font-semibold text-violet-800 mb-3">⭐ 进阶会员</h3>
                    {Object.entries(settings).filter(([key]) => key.startsWith('advanced_')).map(([key, data]) => (
                      <div key={key} className="flex items-center justify-between py-2">
                        <Label className="text-sm">{data.label}</Label>
                        {renderSettingInput(key, data)}
                      </div>
                    ))}
                  </div>
                  
                  {/* 黄金会员 */}
                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                    <h3 className="font-semibold text-amber-800 mb-3">👑 黄金会员</h3>
                    {Object.entries(settings).filter(([key]) => key.startsWith('gold_')).map(([key, data]) => (
                      <div key={key} className="flex items-center justify-between py-2">
                        <Label className="text-sm">{data.label}</Label>
                        {renderSettingInput(key, data)}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features">
            <Card>
              <CardHeader>
                <CardTitle>功能限制</CardTitle>
                <CardDescription>配置防滥用限制</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.entries(settings).filter(([key, data]) => data.category === 'features').map(([key, data]) => (
                  <div key={key} className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0">
                    <div>
                      <Label className="text-base">{data.label}</Label>
                      <p className="text-sm text-slate-500 mt-1">{data.description}</p>
                    </div>
                    {renderSettingInput(key, data)}
                  </div>
                ))}
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