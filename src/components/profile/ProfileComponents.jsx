import React, { useState } from 'react';
import { 
  User, CreditCard, History, Shield, LogOut, 
  Crown, Zap, Clock, ChevronRight, ChevronLeft,
  CheckCircle2, RefreshCw, FileText, Wallet, Receipt,
  Settings
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';

export function ProfileSidebar({ activeTab, onTabChange, onLogout }) {
  const menuItems = [
    { id: 'profile', label: '个人资料', icon: User },
    { id: 'subscription', label: '订阅管理', icon: Crown },
    { id: 'credits', label: '积分记录', icon: Wallet },
    { id: 'history', label: '使用历史', icon: History },
    { id: 'security', label: '账户安全', icon: Shield },
  ];

  return (
    <div className="w-64 shrink-0 hidden md:block">
      <div className="mb-8">
        <h2 className="text-lg font-bold text-slate-900 px-4 mb-4">个人中心</h2>
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                  isActive 
                    ? "bg-indigo-50 text-indigo-600" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
      
      <div className="px-4 pt-4 border-t border-slate-100">
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-0 py-3 text-sm font-medium text-slate-500 hover:text-red-600 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          退出登录
        </button>
      </div>
    </div>
  );
}

export function SubscriptionCard() {
  return (
    <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
            <Crown className="h-5 w-5" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">当前订阅</h3>
        </div>
        <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          订阅中
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Details */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-bold text-slate-900">高级会员</h2>
            <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded font-medium">Premium</span>
          </div>
          <p className="text-slate-500 text-sm mb-6">
            开始日期：2024-11-29 &nbsp;&nbsp; 到期日期：2024-12-29
          </p>

          <div className="mb-6">
            <div className="text-4xl font-bold text-indigo-600 mb-1">30 天</div>
            <p className="text-sm text-slate-400">距离到期还剩</p>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium text-slate-900 mb-2">套餐权益</div>
            {[
              "500 积分/月",
              "所有核心功能",
              "优先响应速度",
              "专属客服"
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Right Actions */}
        <div className="lg:w-80 flex flex-col gap-4">
          <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between mb-2">
            <div>
              <div className="font-medium text-slate-900">自动续费</div>
              <div className="text-xs text-slate-500">开启后，到期前自动扣费续订</div>
            </div>
            <Switch defaultChecked />
          </div>

          <Button className="w-full bg-indigo-600 hover:bg-indigo-700 h-11 text-base">
            <RefreshCw className="h-4 w-4 mr-2" />
            立即续费
          </Button>
          
          <Button variant="outline" className="w-full border-indigo-200 text-indigo-600 hover:bg-indigo-50 h-11">
            ↑ 升级套餐
          </Button>
          
          <Button variant="ghost" className="w-full text-slate-500 hover:text-slate-700">
            <Settings className="h-4 w-4 mr-2" />
            更改套餐
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CreditStatsCard({ credits }) {
  return (
    <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="text-sm font-medium text-slate-900 mb-1">积分余额</div>
            <div className="text-3xl font-bold text-indigo-600">
              {credits?.toLocaleString() || "1,250"}
            </div>
            <div className="text-xs text-slate-400 mt-1">当前积分余额</div>
          </div>
          
          <div className="border-l border-slate-100 pl-8 hidden md:block">
            <div className="text-sm font-medium text-slate-900 mb-1">250</div>
            <div className="text-xs text-slate-500">本月已消耗</div>
          </div>
          
          <div className="border-l border-slate-100 pl-8 hidden md:block">
            <div className="text-sm font-medium text-slate-900 mb-1">1,000</div>
            <div className="text-xs text-slate-500">本月剩余可用</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link to={createPageUrl('Credits')}>
             {/* Wait, I cannot use Link inside this component if I don't import it. I'll import Link or pass onClick */}
             <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-full px-6">
               <Zap className="h-4 w-4 mr-2" />
               购买加油包
             </Button>
          </Link>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between text-sm">
        <div className="text-slate-500">积分有效期：长期有效</div>
        <button className="text-indigo-600 hover:text-indigo-700 font-medium">查看积分记录</button>
      </div>
    </div>
  );
}

export function OrderHistory() {
  const orders = [
    {
      id: '2024112900001',
      title: '订阅高级会员',
      price: 49,
      date: '2024-11-29 10:30:45',
      status: 'completed',
      icon: Crown,
      iconBg: 'bg-indigo-100 text-indigo-600',
      method: '微信支付'
    },
    {
      id: '2024112800002',
      title: '购买积分加油包',
      price: 19,
      date: '2024-11-28 15:22:33',
      status: 'completed',
      icon: Zap,
      iconBg: 'bg-blue-100 text-blue-600',
      method: '支付宝'
    },
    {
      id: '2024112700003',
      title: '订阅专业版会员',
      price: 99,
      date: '2024-11-27 09:15:20',
      status: 'pending',
      icon: Clock,
      iconBg: 'bg-amber-100 text-amber-600',
      method: '微信支付'
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-900">订单历史</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8">全部时间</Button>
          <Button variant="outline" size="sm" className="h-8">全部类型</Button>
        </div>
      </div>

      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
            <div className="flex items-start gap-4 mb-4 md:mb-0">
              <div className={`p-3 rounded-xl ${order.iconBg}`}>
                <order.icon className="h-6 w-6" />
              </div>
              <div>
                <div className="font-bold text-slate-900 mb-1">{order.title}</div>
                <div className="text-xs text-slate-500 font-mono">订单号：{order.id}</div>
              </div>
            </div>

            <div className="flex flex-1 md:justify-end items-center gap-4 md:gap-8">
              <div className="text-right hidden md:block">
                <div className="font-bold text-slate-900">¥{order.price}</div>
                <div className="text-xs text-slate-500">{order.method}</div>
              </div>

              <div className="min-w-[80px] text-center">
                {order.status === 'completed' ? (
                  <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">已完成</span>
                ) : (
                  <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full font-medium">待支付</span>
                )}
              </div>

              <div className="text-right hidden lg:block min-w-[120px]">
                <div className="text-xs text-slate-900 font-medium">{order.date.split(' ')[0]}</div>
                <div className="text-xs text-slate-400">{order.date.split(' ')[1]}</div>
              </div>

              <div className="flex gap-2">
                 {order.status === 'pending' ? (
                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 h-8 text-xs">重新支付</Button>
                 ) : (
                    <>
                      <button className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">查看详情</button>
                      <button className="text-xs text-slate-400 hover:text-slate-600 ml-2">申请退款</button>
                    </>
                 )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-8 pt-4 border-t border-slate-50">
        <span className="text-sm text-slate-500">共 15 条订单</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" disabled>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" className="h-8 w-8 p-0 bg-indigo-600 hover:bg-indigo-700">1</Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">2</Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">3</Button>
          <Button variant="outline" size="icon" className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';