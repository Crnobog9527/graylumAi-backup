import React from 'react';
import { Pencil, Crown, Coins, Plus, RefreshCw, Key, Link2, Users, Headphones, MessageCircle, Code, PenTool } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, differenceInDays } from 'date-fns';

export function UserProfileHeader({ user }) {
  const registerDate = user?.created_date ? format(new Date(user.created_date), 'yyyy年M月d日') : '2023年6月15日';
  
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 border-2 border-slate-100">
            <AvatarImage src={user?.avatar_url} />
            <AvatarFallback className="bg-blue-100 text-blue-600 text-2xl font-medium">
              {user?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-slate-900">{user?.full_name || '用户'}</h2>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="text-slate-500 text-sm mb-2">{user?.email}</p>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span>注册时间：{registerDate}</span>
              <div className="flex items-center gap-1 text-blue-600">
                <Crown className="h-4 w-4" />
                <span>高级会员</span>
              </div>
            </div>
          </div>
        </div>
        <Button variant="outline" className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50">
          <Pencil className="h-4 w-4" />
          编辑资料
        </Button>
      </div>
    </div>
  );
}

export function CreditsAndSubscriptionCards({ user }) {
  const credits = user?.credits || 1250;
  const usedPercent = 75; // Mock data
  const subscriptionEndDate = '2024-12-31';
  const daysRemaining = 98; // Mock data

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      {/* Credits Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">积分余额</h3>
          <Coins className="h-5 w-5 text-slate-400" />
        </div>
        <div className="text-4xl font-bold text-blue-600 mb-2">{credits.toLocaleString()}</div>
        <div className="text-sm text-slate-500 mb-4">积分使用趋势</div>
        <Progress value={usedPercent} className="h-2 mb-2" />
        <div className="text-xs text-slate-400 mb-4">本月已使用 {usedPercent}%</div>
        <Link to={createPageUrl('Credits')}>
          <Button className="w-full bg-blue-600 hover:bg-blue-700 gap-2">
            <Plus className="h-4 w-4" />
            购买加油包
          </Button>
        </Link>
      </div>

      {/* Subscription Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">订阅状态</h3>
          <Crown className="h-5 w-5 text-slate-400" />
        </div>
        <div className="text-2xl font-bold text-slate-900 mb-1">高级会员</div>
        <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
          <span>有效期至：</span>
          <span className="text-blue-600 font-medium">{subscriptionEndDate}</span>
        </div>
        <div className="text-sm text-slate-500 mb-4">剩余 {daysRemaining} 天</div>
        <Button className="w-full bg-blue-600 hover:bg-blue-700 gap-2">
          <RefreshCw className="h-4 w-4" />
          续费订阅
        </Button>
      </div>
    </div>
  );
}

export function UsageStatsCard({ user }) {
  const stats = [
    { label: '累计对话次数', value: '1,456' },
    { label: '累计使用功能', value: '892' },
    { label: '本月消耗积分', value: '356' },
    { label: '使用天数', value: '125' },
  ];

  const topFeatures = [
    { name: '智能对话', count: 459, icon: MessageCircle },
    { name: '智能写作', count: 267, icon: PenTool },
    { name: '代码生成', count: 166, icon: Code },
  ];

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 mb-6">
      <h3 className="font-semibold text-slate-900 mb-6">使用统计</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index}>
            <div className="text-sm text-slate-500 mb-1">{stat.label}</div>
            <div className="text-2xl font-bold text-blue-600">{stat.value}</div>
          </div>
        ))}
      </div>

      <h4 className="font-medium text-slate-900 mb-4">最常使用功能 Top 3</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {topFeatures.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <div key={index} className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <Icon className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <div className="font-medium text-slate-900">{feature.name}</div>
                <div className="text-sm text-slate-500">{feature.count}次</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function QuickActionsCard() {
  const actions = [
    {
      icon: Key,
      title: '修改密码',
      description: '更新账户登录密码，保障账户安全',
      linkText: '前往设置',
      linkUrl: '#',
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      icon: Link2,
      title: '绑定社交账号',
      description: '关联Google、微信账号，便捷登录',
      linkText: '立即绑定',
      linkUrl: '#',
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      showSocialIcons: true,
    },
    {
      icon: Users,
      title: '邀请好友',
      description: '邀请好友注册，获得积分奖励',
      linkText: '生成邀请码',
      linkUrl: '#',
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      showBadge: '+100积分',
    },
    {
      icon: Headphones,
      title: '联系客服',
      description: '遇到问题？我们随时为您提供帮助',
      linkText: '立即咨询',
      linkUrl: '#',
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      showOnline: true,
    },
  ];

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200">
      <h3 className="font-semibold text-slate-900 mb-6">快捷操作</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <div key={index} className="p-4 border border-slate-100 rounded-xl hover:border-blue-200 hover:bg-blue-50/30 transition-colors">
              <div className={`w-10 h-10 rounded-lg ${action.iconBg} flex items-center justify-center mb-3`}>
                <Icon className={`h-5 w-5 ${action.iconColor}`} />
              </div>
              <h4 className="font-medium text-slate-900 mb-1">{action.title}</h4>
              <p className="text-sm text-slate-500 mb-3 min-h-[40px]">{action.description}</p>
              
              {action.showSocialIcons && (
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-white border flex items-center justify-center">
                    <span className="text-xs">G</span>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <span className="text-xs text-white">微</span>
                  </div>
                </div>
              )}
              
              {action.showBadge && (
                <div className="inline-block bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded mb-3">
                  {action.showBadge}
                </div>
              )}
              
              {action.showOnline && (
                <div className="flex items-center gap-1 text-xs text-green-600 mb-3">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  在线客服
                </div>
              )}
              
              <a href={action.linkUrl} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                {action.linkText}
                <span>→</span>
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}