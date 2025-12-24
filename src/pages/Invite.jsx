import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Copy, Share2, Gift, Users, Coins, TrendingUp, 
  CheckCircle, Clock, AlertTriangle, QrCode, Link2
} from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// 生成6-8位邀请码
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const length = Math.floor(Math.random() * 3) + 6; // 6-8位
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function Invite() {
  const [user, setUser] = useState(null);
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        
        // 如果用户没有邀请码，自动生成一个
        if (!userData.invite_code) {
          const newCode = generateInviteCode();
          await base44.auth.updateMe({ invite_code: newCode });
          setUser({ ...userData, invite_code: newCode });
        }
      } catch (e) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  // 获取系统设置
  const { data: systemSettings = [] } = useQuery({
    queryKey: ['invite-settings'],
    queryFn: () => base44.entities.SystemSettings.list(),
    enabled: !!user,
  });

  // 获取邀请记录
  const { data: invitations = [] } = useQuery({
    queryKey: ['my-invitations', user?.email],
    queryFn: () => base44.entities.InvitationRecord.filter(
      { inviter_email: user.email },
      '-created_date'
    ),
    enabled: !!user?.email,
  });

  const getSettingValue = (key, defaultValue) => {
    const setting = systemSettings.find(s => s.setting_key === key);
    return setting ? setting.setting_value : defaultValue;
  };

  const referrerBonus = parseInt(getSettingValue('referrer_bonus', '50'));
  const refereeBonus = parseInt(getSettingValue('referee_bonus', '50'));
  const rebatePercent = parseInt(getSettingValue('referral_purchase_rebate', '10'));
  const bindingDays = parseInt(getSettingValue('referral_binding_days', '30'));
  const dailyRewardLimit = parseInt(getSettingValue('daily_invite_reward_limit', '1000'));
  const monthlyInviteLimit = parseInt(getSettingValue('monthly_invite_limit', '50'));

  const inviteUrl = user?.invite_code 
    ? `${window.location.origin}?invite=${user.invite_code}`
    : '';

  const handleCopy = async (text) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('已复制到剪贴板');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Graylum AI - 邀请你一起使用',
          text: `我在用 Graylum AI，超好用的AI助手！使用我的邀请链接注册，你我各得${refereeBonus}积分！`,
          url: inviteUrl,
        });
      } catch (e) {
        // 用户取消分享
      }
    } else {
      handleCopy(inviteUrl);
    }
  };

  // 统计数据
  const stats = {
    totalInvites: user?.total_invites || 0,
    totalRewards: user?.total_invite_rewards || 0,
    pendingCount: invitations.filter(i => i.status === 'pending').length,
    successCount: invitations.filter(i => i.status === 'rewarded').length,
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 邀请码卡片 */}
      <Card className="mb-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-0">
        <CardContent className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Gift className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">邀请好友</h1>
              <p className="text-white/80">分享给朋友，你和好友各得积分奖励</p>
            </div>
          </div>

          {/* 邀请码展示 */}
          <div className="bg-white/10 backdrop-blur rounded-xl p-6 mb-6">
            <div className="text-sm text-white/70 mb-2">我的专属邀请码</div>
            <div className="flex items-center gap-4">
              <div className="text-3xl font-mono font-bold tracking-wider">
                {user.invite_code || '生成中...'}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleCopy(user.invite_code)}
                className="bg-white/20 hover:bg-white/30 text-white border-0"
              >
                <Copy className="h-4 w-4 mr-1" />
                复制
              </Button>
            </div>
          </div>

          {/* 邀请链接 */}
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 mb-6">
            <div className="text-sm text-white/70 mb-2">邀请链接</div>
            <div className="flex items-center gap-2">
              <Input 
                value={inviteUrl}
                readOnly
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
              <Button
                onClick={() => handleCopy(inviteUrl)}
                className="bg-white text-indigo-600 hover:bg-white/90 shrink-0"
              >
                <Link2 className="h-4 w-4 mr-1" />
                复制链接
              </Button>
            </div>
          </div>

          {/* 分享按钮 */}
          <Button
            onClick={handleShare}
            size="lg"
            className="w-full bg-white text-indigo-600 hover:bg-white/90 h-12 text-lg font-semibold"
          >
            <Share2 className="h-5 w-5 mr-2" />
            立即分享给好友
          </Button>
        </CardContent>
      </Card>

      {/* 奖励规则 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-amber-500" />
            奖励规则
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
              <div className="text-amber-600 font-semibold mb-1">邀请奖励</div>
              <div className="text-2xl font-bold text-amber-700">+{referrerBonus}</div>
              <div className="text-sm text-amber-600/70">好友注册成功后获得</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-100">
              <div className="text-green-600 font-semibold mb-1">好友奖励</div>
              <div className="text-2xl font-bold text-green-700">+{refereeBonus}</div>
              <div className="text-sm text-green-600/70">好友额外获得积分</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <div className="text-blue-600 font-semibold mb-1">消费返利</div>
              <div className="text-2xl font-bold text-blue-700">{rebatePercent}%</div>
              <div className="text-sm text-blue-600/70">{bindingDays}天内消费返利</div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-slate-50 rounded-lg">
            <h4 className="font-medium text-slate-700 mb-2">规则说明</h4>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• 好友通过您的邀请链接注册并验证邮箱后，双方各获得积分奖励</li>
              <li>• 好友注册后{bindingDays}天内的消费，您可获得{rebatePercent}%的积分返利</li>
              <li>• 每日邀请奖励上限{dailyRewardLimit}积分，每月最多邀请{monthlyInviteLimit}人</li>
              <li>• 系统会自动检测异常邀请行为，违规账号将取消奖励资格</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* 邀请统计 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-500" />
            邀请统计
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-slate-50 rounded-xl">
              <div className="text-3xl font-bold text-slate-800">{stats.totalInvites}</div>
              <div className="text-sm text-slate-500">成功邀请</div>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-xl">
              <div className="text-3xl font-bold text-amber-600">{stats.totalRewards}</div>
              <div className="text-sm text-slate-500">累计获得积分</div>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-xl">
              <div className="text-3xl font-bold text-green-600">{stats.successCount}</div>
              <div className="text-sm text-slate-500">已发放奖励</div>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-xl">
              <div className="text-3xl font-bold text-blue-600">{stats.pendingCount}</div>
              <div className="text-sm text-slate-500">待注册</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 邀请记录 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-500" />
            邀请记录
          </CardTitle>
          <CardDescription>您邀请的好友列表</CardDescription>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>暂无邀请记录</p>
              <p className="text-sm">分享您的邀请链接，邀请好友一起使用吧</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invitations.map((inv) => (
                <div 
                  key={inv.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-800">
                        {inv.invitee_email || '等待注册...'}
                      </div>
                      <div className="text-sm text-slate-500">
                        {format(new Date(inv.created_date), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {inv.status === 'rewarded' && (
                      <Badge className="bg-green-100 text-green-700 border-0">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        +{inv.inviter_reward}积分
                      </Badge>
                    )}
                    {inv.status === 'registered' && (
                      <Badge className="bg-blue-100 text-blue-700 border-0">
                        <Clock className="h-3 w-3 mr-1" />
                        待发放
                      </Badge>
                    )}
                    {inv.status === 'pending' && (
                      <Badge variant="outline" className="text-slate-500">
                        <Clock className="h-3 w-3 mr-1" />
                        待注册
                      </Badge>
                    )}
                    {inv.status === 'rejected' && (
                      <Badge className="bg-red-100 text-red-700 border-0">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        已拒绝
                      </Badge>
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