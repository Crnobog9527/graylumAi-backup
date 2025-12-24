import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Users, Gift, Copy, Check, Share2, QrCode, 
  TrendingUp, Award, Clock, AlertCircle, Loader2
} from 'lucide-react';
import { format } from 'date-fns';

// 生成6位邀请码
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function Invite() {
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: systemSettings = [] } = useQuery({
    queryKey: ['system-settings'],
    queryFn: () => base44.entities.SystemSettings.list(),
  });

  const { data: invitations = [] } = useQuery({
    queryKey: ['my-invitations', user?.email],
    queryFn: () => base44.entities.Invitation.filter({ inviter_email: user?.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const getSettingValue = (key, defaultValue) => {
    const setting = systemSettings.find(s => s.setting_key === key);
    return setting ? setting.setting_value : defaultValue;
  };

  const inviterReward = parseInt(getSettingValue('invite_inviter_reward', '50')) || 50;
  const inviteeReward = parseInt(getSettingValue('invite_invitee_reward', '30')) || 30;
  const dailyLimit = parseInt(getSettingValue('invite_daily_reward_limit', '1000')) || 1000;
  const monthlyLimit = parseInt(getSettingValue('invite_monthly_count_limit', '50')) || 50;
  const totalLimit = parseInt(getSettingValue('invite_total_reward_limit', '50000')) || 50000;

  const updateUserMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => queryClient.invalidateQueries(['user']),
  });

  // 自动生成邀请码
  useEffect(() => {
    if (user && !user.invite_code) {
      const newCode = generateInviteCode();
      updateUserMutation.mutate({ invite_code: newCode });
    }
  }, [user]);

  const inviteLink = user?.invite_code 
    ? `${window.location.origin}?invite=${user.invite_code}`
    : '';

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCode = async () => {
    if (!user?.invite_code) return;
    await navigator.clipboard.writeText(user.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 统计数据
  const completedInvitations = invitations.filter(i => i.status === 'rewarded');
  const pendingInvitations = invitations.filter(i => i.status === 'pending' || i.status === 'completed');
  const totalEarned = completedInvitations.reduce((sum, i) => sum + (i.inviter_reward || 0) + (i.rebate_earned || 0), 0);

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 页面标题 */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Users className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-slate-800 mb-2">邀请好友</h1>
        <p className="text-slate-500">邀请好友注册，双方都能获得积分奖励</p>
      </div>

      {/* 奖励规则 */}
      <Card className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-white rounded-xl">
              <Gift className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">+{inviterReward}</div>
              <div className="text-sm text-slate-500">您获得积分</div>
            </div>
            <div className="text-center p-4 bg-white rounded-xl">
              <Award className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">+{inviteeReward}</div>
              <div className="text-sm text-slate-500">好友获得积分</div>
            </div>
            <div className="text-center p-4 bg-white rounded-xl">
              <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-600">{totalEarned}</div>
              <div className="text-sm text-slate-500">累计获得积分</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 邀请链接 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-blue-600" />
            我的邀请链接
          </CardTitle>
          <CardDescription>复制链接分享给好友，好友通过链接注册即可获得奖励</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 邀请码 */}
            <div>
              <label className="text-sm text-slate-500 mb-1 block">我的邀请码</label>
              <div className="flex gap-2">
                <div className="flex-1 bg-slate-100 rounded-lg px-4 py-3 font-mono text-lg font-bold text-center tracking-widest">
                  {user?.invite_code || '生成中...'}
                </div>
                <Button onClick={handleCopyCode} variant="outline" className="px-4">
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* 邀请链接 */}
            <div>
              <label className="text-sm text-slate-500 mb-1 block">邀请链接</label>
              <div className="flex gap-2">
                <Input 
                  value={inviteLink} 
                  readOnly 
                  className="font-mono text-sm"
                />
                <Button onClick={handleCopyLink} className="bg-blue-600 hover:bg-blue-700 px-6">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4 mr-2" />}
                  {copied ? '已复制' : '复制'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 奖励限制说明 */}
      <Card className="mb-6 border-amber-200 bg-amber-50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">奖励规则说明</p>
              <ul className="space-y-1 text-amber-700">
                <li>• 每日邀请奖励上限：{dailyLimit} 积分</li>
                <li>• 每月有效邀请上限：{monthlyLimit} 人</li>
                <li>• 邀请奖励总上限：{totalLimit} 积分</li>
                <li>• 好友需完成邮箱验证后，奖励才会发放</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 邀请记录 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-slate-600" />
            邀请记录
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>暂无邀请记录</p>
              <p className="text-sm">快去分享邀请链接吧！</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invitations.slice(0, 10).map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <div className="font-medium text-slate-700">
                      {inv.invitee_email?.replace(/(.{3}).*(@.*)/, '$1***$2')}
                    </div>
                    <div className="text-xs text-slate-400">
                      {format(new Date(inv.created_date), 'yyyy-MM-dd HH:mm')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${
                      inv.status === 'rewarded' ? 'text-green-600' :
                      inv.status === 'rejected' ? 'text-red-600' :
                      'text-amber-600'
                    }`}>
                      {inv.status === 'rewarded' && `+${inv.inviter_reward} 积分`}
                      {inv.status === 'pending' && '待完成'}
                      {inv.status === 'completed' && '待发放'}
                      {inv.status === 'rejected' && '已拒绝'}
                    </div>
                    {inv.risk_level === 'high' && (
                      <div className="text-xs text-red-500">高风险</div>
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