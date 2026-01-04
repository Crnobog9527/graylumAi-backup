import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { 
  User, CreditCard, History, Shield, LogOut, 
  Crown, Zap, Clock, ChevronRight, ChevronLeft,
  CheckCircle2, RefreshCw, Settings, Wallet, Package, Mail, Lock, Loader2, Headphones, X
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner';

export function ProfileSidebar({ activeTab, onTabChange, onLogout }) {
  const navigate = useNavigate();
  const menuItems = [
    { id: 'profile', label: '个人资料', icon: User },
    { id: 'subscription', label: '订阅管理', icon: Crown },
    { id: 'credits', label: '积分记录', icon: Wallet },
    { id: 'history', label: '使用历史', icon: History },
    { id: 'security', label: '账户安全', icon: Shield },
    { id: 'tickets', label: '工单记录', icon: Headphones, isLink: true, path: 'Tickets' },
  ];

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  return (
    <div className="w-56 shrink-0 hidden md:block bg-[#0a0a0a] rounded-xl p-4 border border-[#1a1a1a] h-fit">
      <div className="mb-6">
        <h2 className="text-base font-bold text-white px-2 mb-4">个人中心</h2>
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            if (item.isLink) {
              return (
                <Link key={item.id} to={createPageUrl(item.path)}>
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors text-[#a3a3a3] hover:bg-[#1a1a1a] hover:text-white">
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                </Link>
              );
            }
            
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
                  isActive 
                    ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" 
                    : "text-[#a3a3a3] hover:bg-[#1a1a1a] hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
      
      <div className="pt-4 border-t border-[#1a1a1a]">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-[#666666] hover:text-red-400 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          退出登录
        </button>
      </div>
    </div>
  );
}

export function SubscriptionCard({ user }) {
  const { data: membershipPlans = [] } = useQuery({
    queryKey: ['membership-plans'],
    queryFn: () => base44.entities.MembershipPlan.filter({ is_active: true }, 'sort_order'),
  });

  const subscriptionTier = user?.subscription_tier || 'free';
  const tierLabels = {
    free: '免费用户',
    basic: '基础会员',
    pro: '专业会员',
    enterprise: '企业会员'
  };

  const isFreeTier = subscriptionTier === 'free';

  return (
    <div className="bg-[#0a0a0a] rounded-xl p-6 md:p-8 border border-[#1a1a1a] mb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <Crown className="h-5 w-5 text-amber-500" />
          </div>
          <h3 className="text-xl font-bold text-white">当前订阅</h3>
        </div>
        <div className={cn(
          "flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border",
          isFreeTier ? "bg-[#1a1a1a] text-[#666666] border-[#2a2a2a]" : "bg-green-500/10 text-green-400 border-green-500/20"
        )}>
          <span className={cn("w-2 h-2 rounded-full", isFreeTier ? "bg-[#444444]" : "bg-green-500")}></span>
          {isFreeTier ? '未订阅' : '订阅中'}
        </div>
      </div>

      {isFreeTier ? (
        <div className="text-center py-8">
          <div className="text-[#666666] mb-6">您当前是免费用户，升级会员享受更多权益</div>
          <Link to={createPageUrl('Credits')}>
            <Button className="bg-amber-500 hover:bg-amber-600 text-black">
              <Crown className="h-4 w-4 mr-2" />
              升级会员
            </Button>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-2">{tierLabels[subscriptionTier]}</h2>
            <p className="text-[#666666] text-sm mb-6">感谢您的支持！</p>
            <div className="space-y-3">
              {["更多积分配额", "所有核心功能", "优先响应速度", "专属客服"].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-[#a3a3a3]">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="lg:w-80 flex flex-col gap-4">
            <Link to={createPageUrl('Credits')}>
              <Button className="w-full bg-amber-500 hover:bg-amber-600 text-black h-11">
                <RefreshCw className="h-4 w-4 mr-2" />
                立即续费
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export function CreditStatsCard({ user }) {
  const credits = user?.credits || 0;
  const userEmail = user?.email;
  
  const { data: transactions = [] } = useQuery({
    queryKey: ['user-transactions', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      return base44.entities.CreditTransaction.filter({ user_email: userEmail }, '-created_date', 100);
    },
    enabled: !!userEmail,
  });

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  
  const monthlyUsed = transactions
    .filter(t => {
      const date = new Date(t.created_date);
      return date >= monthStart && date <= monthEnd && t.type === 'usage';
    })
    .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

  return (
    <div className="bg-[#0a0a0a] rounded-xl p-6 md:p-8 border border-[#1a1a1a] mb-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white">积分概览</h3>
        <Zap className="h-5 w-5 text-amber-500" />
      </div>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="text-sm font-medium text-[#666666] mb-1">积分余额</div>
            <div className="text-3xl font-bold text-amber-500">{credits.toLocaleString()}</div>
          </div>
          <div className="border-l border-[#1a1a1a] pl-8 hidden md:block">
            <div className="text-sm font-medium text-[#666666] mb-1">本月消耗</div>
            <div className="text-2xl font-bold text-white">{Math.round(monthlyUsed).toLocaleString()}</div>
          </div>
          <div className="border-l border-[#1a1a1a] pl-8 hidden md:block">
            <div className="text-sm font-medium text-[#666666] mb-1">累计消耗</div>
            <div className="text-2xl font-bold text-white">{(user?.total_credits_used || 0).toLocaleString()}</div>
          </div>
        </div>
        <Link to={createPageUrl('Credits')}>
          <Button className="bg-amber-500 hover:bg-amber-600 text-black rounded-full px-6">
            <Zap className="h-4 w-4 mr-2" />
            购买加油包
          </Button>
        </Link>
      </div>

      <div className="mt-6 pt-6 border-t border-[#1a1a1a]">
        <h4 className="text-sm font-medium text-white mb-4">最近积分变动</h4>
        <div className="space-y-3">
          {transactions.slice(0, 5).map((tx) => (
            <div key={tx.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border",
                  tx.amount > 0 ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"
                )}>
                  <Zap className={cn("h-4 w-4", tx.amount > 0 ? "text-green-400" : "text-red-400")} />
                </div>
                <div>
                  <div className="text-white">{tx.description?.slice(0, 30) || tx.type}</div>
                  <div className="text-xs text-[#444444]">{format(new Date(tx.created_date), 'MM-dd HH:mm')}</div>
                </div>
              </div>
              <div className={cn("font-medium", tx.amount > 0 ? "text-green-400" : "text-red-400")}>
                {tx.amount > 0 ? '+' : ''}{tx.amount}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function OrderHistory({ user }) {
  const userEmail = user?.email;
  
  const { data: transactions = [] } = useQuery({
    queryKey: ['all-transactions', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      return base44.entities.CreditTransaction.filter({ user_email: userEmail }, '-created_date', 50);
    },
    enabled: !!userEmail,
  });

  const typeLabels = {
    purchase: '购买积分', usage: '积分消耗', bonus: '积分奖励',
    refund: '积分退款', admin_adjustment: '管理员调整', membership: '会员权益', checkin: '签到奖励'
  };

  if (transactions.length === 0) {
    return (
      <div className="bg-[#0a0a0a] rounded-xl border border-[#1a1a1a] p-6">
        <h3 className="text-lg font-bold text-white mb-6">交易记录</h3>
        <div className="text-center py-12 text-[#666666]">暂无交易记录</div>
      </div>
    );
  }

  return (
    <div className="bg-[#0a0a0a] rounded-xl border border-[#1a1a1a] p-6">
      <h3 className="text-lg font-bold text-white mb-6">交易记录</h3>
      <div className="space-y-4">
        {transactions.map((tx) => (
          <div key={tx.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-[#111111] transition-colors border border-[#1a1a1a]">
            <div className="flex items-start gap-4">
              <div className={cn(
                "p-3 rounded-xl border",
                tx.amount > 0 ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"
              )}>
                <Zap className={cn("h-5 w-5", tx.amount > 0 ? "text-green-400" : "text-red-400")} />
              </div>
              <div>
                <div className="font-medium text-white mb-1">{typeLabels[tx.type] || tx.type}</div>
                <div className="text-xs text-[#666666]">{tx.description || '-'}</div>
              </div>
            </div>
            <div className="text-right">
              <div className={cn("font-bold", tx.amount > 0 ? "text-green-400" : "text-red-400")}>
                {tx.amount > 0 ? '+' : ''}{tx.amount} 积分
              </div>
              <div className="text-xs text-[#444444]">{format(new Date(tx.created_date), 'MM-dd HH:mm')}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function UsageHistoryCard({ user }) {
  const userEmail = user?.email;
  
  const { data: conversations = [] } = useQuery({
    queryKey: ['user-conversations', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      return base44.entities.Conversation.filter({ created_by: userEmail }, '-created_date', 20);
    },
    enabled: !!userEmail,
  });

  if (conversations.length === 0) {
    return (
      <div className="bg-[#0a0a0a] rounded-xl border border-[#1a1a1a] p-6">
        <h3 className="text-lg font-bold text-white mb-6">使用历史</h3>
        <div className="text-center py-12 text-[#666666]">暂无使用记录</div>
      </div>
    );
  }

  return (
    <div className="bg-[#0a0a0a] rounded-xl border border-[#1a1a1a] p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white">使用历史</h3>
        <Link to={createPageUrl('Chat')}>
          <Button variant="outline" size="sm" className="bg-[#1a1a1a] border-[#2a2a2a] text-white hover:bg-[#2a2a2a]">
            查看全部对话
          </Button>
        </Link>
      </div>
      <div className="space-y-3">
        {conversations.map((conv) => (
          <div key={conv.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-[#111111] transition-colors border border-[#1a1a1a]">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <History className="h-4 w-4 text-blue-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-white truncate">{conv.title || '新对话'}</div>
                <div className="text-xs text-[#666666]">{conv.messages?.length || 0} 条消息 · 消耗 {conv.total_credits_used || 0} 积分</div>
              </div>
            </div>
            <div className="text-xs text-[#444444]">{format(new Date(conv.created_date), 'MM-dd HH:mm')}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SecuritySettingsCard({ user }) {
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });

  const handleSendVerificationEmail = async () => {
    setVerifyLoading(true);
    try {
      const { data } = await base44.functions.invoke('sendVerificationEmail');
      if (data.success) {
        toast.success(data.message);
        setShowVerifyDialog(true);
      } else {
        toast.error(data.error || '发送失败');
      }
    } catch (error) {
      toast.error('发送失败，请稍后重试');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('请输入6位验证码');
      return;
    }
    setVerifyLoading(true);
    try {
      const { data } = await base44.functions.invoke('verifyEmail', { verification_code: verificationCode });
      if (data.success) {
        toast.success(data.message);
        setShowVerifyDialog(false);
        window.location.reload();
      } else {
        toast.error(data.error || '验证失败');
      }
    } catch (error) {
      toast.error('验证失败，请稍后重试');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password) {
      toast.error('请填写完整信息');
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('两次输入的新密码不一致');
      return;
    }
    if (passwordForm.new_password.length < 8) {
      toast.error('新密码长度至少为8位');
      return;
    }
    setPasswordLoading(true);
    try {
      const { data } = await base44.functions.invoke('changePassword', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      if (data.success) {
        toast.success(data.message);
        setShowPasswordDialog(false);
        setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      } else {
        toast.error(data.error || '修改失败');
      }
    } catch (error) {
      toast.error('修改失败，请稍后重试');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <>
      <div className="bg-[#0a0a0a] rounded-xl border border-[#1a1a1a] p-6">
        <h3 className="text-lg font-bold text-white mb-6">账户安全</h3>
        <div className="space-y-4">
          <div className="p-4 border border-[#1a1a1a] rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium text-white">登录方式</div>
              <span className="text-sm px-3 py-1 bg-[#1a1a1a] text-[#a3a3a3] rounded-full border border-[#2a2a2a]">邮箱密码</span>
            </div>
            <div className="text-sm text-[#666666]">{user?.email}</div>
          </div>

          <div className="p-4 border border-[#1a1a1a] rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-white">邮箱验证</div>
                <div className="text-sm text-[#666666] mt-1">{user?.email_verified ? '已验证' : '未验证'}</div>
              </div>
              {user?.email_verified ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <Button variant="outline" size="sm" onClick={handleSendVerificationEmail} disabled={verifyLoading}
                  className="bg-[#1a1a1a] border-[#2a2a2a] text-white hover:bg-[#2a2a2a]">
                  {verifyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : '验证邮箱'}
                </Button>
              )}
            </div>
          </div>

          <div className="p-4 border border-[#1a1a1a] rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-white">修改密码</div>
                <div className="text-sm text-[#666666] mt-1">定期更新密码以保障账户安全</div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowPasswordDialog(true)}
                className="bg-[#1a1a1a] border-[#2a2a2a] text-white hover:bg-[#2a2a2a]">
                修改
              </Button>
            </div>
          </div>

          <div className="p-4 border border-[#1a1a1a] rounded-xl">
            <div className="flex items-center justify-between">
              <div className="font-medium text-white">注册时间</div>
              <span className="text-sm text-[#666666]">
                {user?.created_date ? format(new Date(user.created_date), 'yyyy年MM月dd日') : '-'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent className="sm:max-w-md bg-[#0a0a0a] border-[#1a1a1a]">
          <DialogHeader>
            <DialogTitle className="text-white">邮箱验证</DialogTitle>
            <DialogDescription className="text-[#666666]">验证码已发送至 {user?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code" className="text-[#a3a3a3]">验证码</Label>
              <Input id="code" placeholder="请输入6位验证码" value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="bg-[#1a1a1a] border-[#2a2a2a] text-white" maxLength={6} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVerifyDialog(false)}
              className="bg-[#1a1a1a] border-[#2a2a2a] text-white hover:bg-[#2a2a2a]">取消</Button>
            <Button onClick={handleVerifyEmail} disabled={verifyLoading || verificationCode.length !== 6}
              className="bg-amber-500 hover:bg-amber-600 text-black">
              {verifyLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}确认验证
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md bg-[#0a0a0a] border-[#1a1a1a]">
          <DialogHeader>
            <DialogTitle className="text-white">修改密码</DialogTitle>
            <DialogDescription className="text-[#666666]">请输入当前密码和新密码</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[#a3a3a3]">当前密码</Label>
              <Input type="password" placeholder="请输入当前密码" value={passwordForm.current_password}
                onChange={(e) => setPasswordForm({...passwordForm, current_password: e.target.value})}
                className="bg-[#1a1a1a] border-[#2a2a2a] text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-[#a3a3a3]">新密码</Label>
              <Input type="password" placeholder="至少8位字符" value={passwordForm.new_password}
                onChange={(e) => setPasswordForm({...passwordForm, new_password: e.target.value})}
                className="bg-[#1a1a1a] border-[#2a2a2a] text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-[#a3a3a3]">确认新密码</Label>
              <Input type="password" placeholder="再次输入新密码" value={passwordForm.confirm_password}
                onChange={(e) => setPasswordForm({...passwordForm, confirm_password: e.target.value})}
                className="bg-[#1a1a1a] border-[#2a2a2a] text-white" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}
              className="bg-[#1a1a1a] border-[#2a2a2a] text-white hover:bg-[#2a2a2a]">取消</Button>
            <Button onClick={handleChangePassword} disabled={passwordLoading}
              className="bg-amber-500 hover:bg-amber-600 text-black">
              {passwordLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}确认修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}