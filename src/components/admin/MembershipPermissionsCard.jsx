import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Crown, History, Download, Save, Loader2, Play, Trash2 } from 'lucide-react';

export default function MembershipPermissionsCard() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [localPlans, setLocalPlans] = useState({});

  const { data: membershipPlans = [], isLoading } = useQuery({
    queryKey: ['membership-plans-admin'],
    queryFn: () => base44.entities.MembershipPlan.filter({ is_active: true }, 'sort_order'),
  });

  // 初始化本地状态
  React.useEffect(() => {
    const plans = {};
    membershipPlans.forEach(plan => {
      plans[plan.id] = {
        history_retention_days: plan.history_retention_days ?? getDefaultRetentionDays(plan.level),
        can_export_conversations: plan.can_export_conversations ?? false
      };
    });
    setLocalPlans(plans);
  }, [membershipPlans]);

  const getDefaultRetentionDays = (level) => {
    switch (level) {
      case 'free': return 5;
      case 'pro': return 30;
      case 'gold': return 30;
      default: return 7;
    }
  };

  const getLevelLabel = (level) => {
    switch (level) {
      case 'free': return '免费用户';
      case 'pro': return '进阶会员';
      case 'gold': return '黄金会员';
      default: return level;
    }
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'free': return 'bg-slate-100 text-slate-600';
      case 'pro': return 'bg-blue-100 text-blue-600';
      case 'gold': return 'bg-amber-100 text-amber-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const updateLocalPlan = (planId, field, value) => {
    setLocalPlans(prev => ({
      ...prev,
      [planId]: {
        ...prev[planId],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const promises = Object.entries(localPlans).map(([planId, data]) =>
        base44.entities.MembershipPlan.update(planId, data)
      );
      await Promise.all(promises);
      queryClient.invalidateQueries(['membership-plans-admin']);
      toast.success('会员权限设置已保存');
    } catch (error) {
      toast.error('保存失败: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCleanup = async () => {
    if (!confirm('确定要执行对话历史清理吗？此操作将删除所有用户的过期对话记录，不可恢复。')) {
      return;
    }
    setCleaning(true);
    try {
      const { data } = await base44.functions.invoke('cleanupConversationHistory', {});
      toast.success(data.message);
    } catch (error) {
      toast.error('清理失败: ' + error.message);
    } finally {
      setCleaning(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            会员权限配置
          </CardTitle>
          <CardDescription>
            配置不同会员等级的对话历史保存时间和导出权限
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {membershipPlans.map(plan => (
            <div
              key={plan.id}
              className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-4"
            >
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getLevelColor(plan.level)}`}>
                  {getLevelLabel(plan.level)}
                </span>
                <span className="text-slate-500 text-sm">{plan.name}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 对话历史保存天数 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-slate-500" />
                    <Label>对话历史保存天数</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      max="365"
                      value={localPlans[plan.id]?.history_retention_days || ''}
                      onChange={(e) => updateLocalPlan(plan.id, 'history_retention_days', parseInt(e.target.value) || 0)}
                      className="w-24"
                    />
                    <span className="text-sm text-slate-500">天</span>
                  </div>
                  <p className="text-xs text-slate-400">超过此天数的对话将被自动清理</p>
                </div>

                {/* 导出权限 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4 text-slate-500" />
                    <Label>批量导出对话</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={localPlans[plan.id]?.can_export_conversations || false}
                      onCheckedChange={(checked) => updateLocalPlan(plan.id, 'can_export_conversations', checked)}
                    />
                    <span className="text-sm text-slate-500">
                      {localPlans[plan.id]?.can_export_conversations ? '允许' : '禁止'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">是否允许该等级用户批量导出对话记录</p>
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-violet-600 hover:bg-violet-700 gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              保存设置
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-500" />
            对话历史清理
          </CardTitle>
          <CardDescription>
            手动执行一次对话历史清理，删除所有用户的过期对话记录
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-red-50 rounded-lg border border-red-100 mb-4">
            <p className="text-sm text-red-800">
              <strong>注意：</strong>此操作将根据上方配置的保存天数，删除所有用户的过期对话记录。此操作不可恢复，请谨慎执行。
            </p>
            <p className="text-xs text-red-600 mt-1">
              建议设置定时任务自动执行清理，而非手动操作。
            </p>
          </div>
          <Button
            onClick={handleCleanup}
            disabled={cleaning}
            variant="destructive"
            className="gap-2"
          >
            {cleaning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            立即执行清理
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}