import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Users, Gift, TrendingUp, AlertTriangle, CheckCircle, 
  Clock, Search, RefreshCw, ShieldAlert, BarChart3
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';

import AdminSidebar from '../components/admin/AdminSidebar';
import { LanguageProvider } from '../components/admin/LanguageContext';

function AdminInvitationsContent() {
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

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

  // 获取所有邀请记录
  const { data: invitations = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-invitations'],
    queryFn: () => base44.entities.InvitationRecord.list('-created_date', 500),
    enabled: !!user,
  });

  // 计算统计数据
  const stats = {
    total: invitations.length,
    rewarded: invitations.filter(i => i.status === 'rewarded').length,
    rejected: invitations.filter(i => i.status === 'rejected').length,
    pending: invitations.filter(i => i.status === 'pending' || i.status === 'registered').length,
    highRisk: invitations.filter(i => i.risk_level === 'high').length,
    totalRewards: invitations.reduce((sum, i) => sum + (i.inviter_reward || 0), 0),
  };

  // 过去7天的邀请趋势
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayInvitations = invitations.filter(inv => 
      format(new Date(inv.created_date), 'yyyy-MM-dd') === dateStr
    );
    return {
      date: format(date, 'MM/dd'),
      count: dayInvitations.length,
      rewarded: dayInvitations.filter(i => i.status === 'rewarded').length,
      rejected: dayInvitations.filter(i => i.status === 'rejected').length,
    };
  });

  // 风险分布
  const riskDistribution = [
    { name: '低风险', value: invitations.filter(i => i.risk_level === 'low').length, color: '#10b981' },
    { name: '中风险', value: invitations.filter(i => i.risk_level === 'medium').length, color: '#f59e0b' },
    { name: '高风险', value: invitations.filter(i => i.risk_level === 'high').length, color: '#ef4444' },
  ];

  // 筛选邀请记录
  const filteredInvitations = invitations.filter(inv => {
    const matchesSearch = !searchTerm || 
      inv.inviter_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.invitee_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.invite_code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || inv.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar currentPage="AdminInvitations" />
      
      <div className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">邀请管理</h1>
            <p className="text-slate-500 mt-1">监控邀请数据和风控情况</p>
          </div>
          <Button onClick={() => refetch()} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            刷新数据
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <div className="text-sm text-slate-500">总邀请</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.rewarded}</div>
                  <div className="text-sm text-slate-500">已发放</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.pending}</div>
                  <div className="text-sm text-slate-500">待处理</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.rejected}</div>
                  <div className="text-sm text-slate-500">已拒绝</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <ShieldAlert className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.highRisk}</div>
                  <div className="text-sm text-slate-500">高风险</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Gift className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.totalRewards}</div>
                  <div className="text-sm text-slate-500">发放积分</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 图表 */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                近7天邀请趋势
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={last7Days}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#6366f1" name="总邀请" strokeWidth={2} />
                  <Line type="monotone" dataKey="rewarded" stroke="#10b981" name="已发放" strokeWidth={2} />
                  <Line type="monotone" dataKey="rejected" stroke="#ef4444" name="已拒绝" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                风险分布
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={riskDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#6366f1" name="数量" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* 邀请记录列表 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>邀请记录</CardTitle>
                <CardDescription>所有邀请记录详情</CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="搜索邮箱或邀请码..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="h-10 px-3 rounded-md border border-slate-200 text-sm"
                >
                  <option value="all">全部状态</option>
                  <option value="rewarded">已发放</option>
                  <option value="registered">待发放</option>
                  <option value="pending">待注册</option>
                  <option value="rejected">已拒绝</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-slate-400" />
              </div>
            ) : filteredInvitations.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                暂无邀请记录
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">邀请人</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">被邀请人</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">邀请码</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">状态</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">风险</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">奖励</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvitations.slice(0, 100).map((inv) => (
                      <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="py-3 px-4 text-sm">{inv.inviter_email}</td>
                        <td className="py-3 px-4 text-sm">{inv.invitee_email || '-'}</td>
                        <td className="py-3 px-4 text-sm font-mono">{inv.invite_code}</td>
                        <td className="py-3 px-4">
                          <Badge className={
                            inv.status === 'rewarded' ? 'bg-green-100 text-green-700 border-0' :
                            inv.status === 'rejected' ? 'bg-red-100 text-red-700 border-0' :
                            inv.status === 'registered' ? 'bg-blue-100 text-blue-700 border-0' :
                            'bg-slate-100 text-slate-700 border-0'
                          }>
                            {inv.status === 'rewarded' ? '已发放' :
                             inv.status === 'rejected' ? '已拒绝' :
                             inv.status === 'registered' ? '待发放' : '待注册'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={
                            inv.risk_level === 'high' ? 'bg-red-100 text-red-700 border-0' :
                            inv.risk_level === 'medium' ? 'bg-amber-100 text-amber-700 border-0' :
                            'bg-green-100 text-green-700 border-0'
                          }>
                            {inv.risk_level === 'high' ? '高' :
                             inv.risk_level === 'medium' ? '中' : '低'}
                          </Badge>
                          {inv.block_reason && (
                            <span className="ml-2 text-xs text-red-500">{inv.block_reason}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {inv.inviter_reward > 0 ? `+${inv.inviter_reward}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-500">
                          {format(new Date(inv.created_date), 'MM/dd HH:mm', { locale: zhCN })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AdminInvitations() {
  return (
    <LanguageProvider>
      <AdminInvitationsContent />
    </LanguageProvider>
  );
}