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
import MembershipPermissionsCard from '@/components/admin/MembershipPermissionsCard';

const defaultSettings = {
  // General
  site_name: { value: 'AI Chat Platform', type: 'string', label: '平台名称', description: '显示在全站的平台名称' },
  support_email: { value: 'support@example.com', type: 'string', label: '客服邮箱', description: '用户支持咨询邮箱' },
  maintenance_mode: { value: 'false', type: 'boolean', label: '维护模式', description: '开启后向用户显示维护信息' },
  
  // Credits & Billing
  new_user_credits: { value: '100', type: 'number', label: '新用户赠送积分', description: '新用户注册时赠送的积分数量' },
  input_credits_per_1k: { value: '1', type: 'number', label: '输入Token积分单价', description: '每1000个输入Token消耗的积分数' },
  output_credits_per_1k: { value: '5', type: 'number', label: '输出Token积分单价', description: '每1000个输出Token消耗的积分数' },
  web_search_credits: { value: '5', type: 'number', label: '联网搜索积分', description: '每次启用联网搜索额外消耗的积分数' },
  
  // Features
  max_messages_per_conversation: { value: '100', type: 'number', label: '单对话最大消息数', description: '每个对话允许的最大消息数' },
  max_input_characters: { value: '2000', type: 'number', label: '输入框字符上限', description: '用户单次输入的最大字符数' },
  enable_free_tier: { value: 'false', type: 'boolean', label: '启用免费体验', description: '允许用户在无积分时使用有限功能' },
  free_tier_messages: { value: '5', type: 'number', label: '免费消息数/天', description: '每天免费消息数量' },
  long_text_warning_threshold: { value: '5000', type: 'number', label: '长文本预警阈值(tokens)', description: '输入token超过此值时弹窗提示用户确认' },
  enable_long_text_warning: { value: 'true', type: 'boolean', label: '启用长文本预警', description: '开启后，超长文本会提示预计消耗积分' },
  show_token_usage_stats: { value: 'true', type: 'boolean', label: '显示Token使用统计', description: '在聊天页面显示本次请求和累计的Token使用情况及预估成本' },
  chat_show_model_selector: { value: 'true', type: 'boolean', label: '显示模型选择器', description: '在聊天界面显示AI模型选择下拉框' },
  chat_billing_hint: { value: '⚡ 按实际Token消耗计费：输入 {input}积分/1K tokens，输出 {output}积分/1K tokens', type: 'string', label: '计费提示文案', description: '聊天页面底部显示的计费说明，{input}和{output}会被替换为实际值' },
  
  // Checkin
  checkin_day1: { value: '5', type: 'number', label: '签到第1天', description: '第1天签到奖励积分' },
  checkin_day2: { value: '10', type: 'number', label: '签到第2天', description: '第2天签到奖励积分' },
  checkin_day3: { value: '15', type: 'number', label: '签到第3天', description: '第3天签到奖励积分' },
  checkin_day4: { value: '20', type: 'number', label: '签到第4天', description: '第4天签到奖励积分' },
  checkin_day5: { value: '25', type: 'number', label: '签到第5天', description: '第5天签到奖励积分（之后重置）' },
  checkin_monthly_bonus: { value: '50', type: 'number', label: '月度全勤奖', description: '当月签到满30天额外奖励' },
  
  // Referral / Invite
  invite_inviter_reward: { value: '50', type: 'number', label: '邀请人奖励', description: '成功邀请1人注册，邀请人获得的积分' },
  invite_invitee_reward: { value: '30', type: 'number', label: '被邀请人奖励', description: '被邀请人注册额外获得的积分' },
  invite_rebate_percent: { value: '5', type: 'number', label: '消费返利比例%', description: '被邀请人30天内消费，邀请人获得的返利比例' },
  invite_binding_days: { value: '30', type: 'number', label: '双向绑定期(天)', description: '被邀请人消费返利的有效期' },
  invite_daily_reward_limit: { value: '1000', type: 'number', label: '每日奖励上限', description: '单用户每日邀请奖励积分上限' },
  invite_monthly_count_limit: { value: '50', type: 'number', label: '每月邀请上限', description: '单用户每月有效邀请人数上限' },
  invite_total_reward_limit: { value: '50000', type: 'number', label: '总奖励封顶', description: '单用户邀请奖励总积分上限' },
  invite_same_ip_hour_limit: { value: '3', type: 'number', label: '同IP小时限制', description: '同一IP每小时最多注册账号数' },
  invite_same_ip_day_limit: { value: '5', type: 'number', label: '同IP日限制', description: '同一IP每天最多注册账号数' },
  invite_risk_auto_reject: { value: 'true', type: 'boolean', label: '高风险自动拒绝', description: '高风险邀请自动拒绝发放奖励' },
  
  // First Purchase
  first_purchase_bonus_percent: { value: '20', type: 'number', label: '首充赠送%', description: '首次购买额外赠送积分百分比' },
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
      toast.success('设置保存成功');
    } catch (error) {
      toast.error('保存设置失败');
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
            <TabsTrigger value="billing">积分计费</TabsTrigger>
            <TabsTrigger value="checkin">签到福利</TabsTrigger>
            <TabsTrigger value="referral">邀请奖励</TabsTrigger>
            <TabsTrigger value="features">{t('features')}</TabsTrigger>
            <TabsTrigger value="membership">会员权限</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>基础设置</CardTitle>
                <CardDescription>平台基本配置</CardDescription>
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

          <TabsContent value="billing">
            <Card>
              <CardHeader>
                <CardTitle>积分计费设置</CardTitle>
                <CardDescription>配置Token到积分的换算规则（1积分 = 1000 tokens）</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>默认规则：</strong>输入Token消耗 1积分/1K tokens，输出Token消耗 5积分/1K tokens
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    示例：输入2000 tokens → 2积分，输出1000 tokens → 5积分，总计7积分
                  </p>
                </div>
                {['new_user_credits', 'input_credits_per_1k', 'output_credits_per_1k', 'web_search_credits', 'first_purchase_bonus_percent'].map(key => {
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

          <TabsContent value="checkin">
            <Card>
              <CardHeader>
                <CardTitle>签到系统</CardTitle>
                <CardDescription>配置每日签到奖励（5天一循环）</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {['checkin_day1', 'checkin_day2', 'checkin_day3', 'checkin_day4', 'checkin_day5', 'checkin_monthly_bonus'].map(key => {
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

          <TabsContent value="referral">
            <Card>
              <CardHeader>
                <CardTitle>邀请奖励设置</CardTitle>
                <CardDescription>配置邀请注册奖励、消费返利和防刷限制</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-green-50 rounded-lg border border-green-100 mb-4">
                  <p className="text-sm text-green-800">
                    <strong>邀请规则：</strong>用户通过邀请码邀请好友注册，双方都能获得积分奖励
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    被邀请人在绑定期内的消费，邀请人可获得一定比例返利
                  </p>
                </div>
                {['invite_inviter_reward', 'invite_invitee_reward', 'invite_rebate_percent', 'invite_binding_days', 'invite_daily_reward_limit', 'invite_monthly_count_limit', 'invite_total_reward_limit', 'invite_same_ip_hour_limit', 'invite_same_ip_day_limit', 'invite_risk_auto_reject'].map(key => {
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
                <CardTitle>功能设置</CardTitle>
                <CardDescription>启用或禁用平台功能</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {['enable_free_tier', 'free_tier_messages', 'max_messages_per_conversation', 'max_input_characters', 'enable_long_text_warning', 'long_text_warning_threshold', 'show_token_usage_stats', 'chat_show_model_selector', 'chat_billing_hint'].map(key => {
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

          <TabsContent value="membership">
            <MembershipPermissionsCard />
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