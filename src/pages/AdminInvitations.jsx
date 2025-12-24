import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  ArrowLeft, Users, Gift, TrendingUp, AlertTriangle, 
  Search, RefreshCw, CheckCircle, XCircle, Clock,
  BarChart3, Shield, Settings
} from 'lucide-react';
import { format, subDays, startOfMonth, isAfter } from 'date-fns';

export default function AdminInvitations() {
  const [activeTab, setActiveTab] = useState('overview');
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ['admin-invitations'],
    queryFn: () => base44.entities.Invitation.list('-created_date'),
  });

  const { data: systemSettings = [] } = useQuery({
    queryKey: ['system-settings'],
    queryFn: () => base44.entities.SystemSettings.list(),
  });

  const updateInvitationMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Invitation.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['admin-invitations']),
  });

  const getSettingValue = (key, defaultValue) => {
    const setting = systemSettings.find(s => s.setting_key === key);
    return setting ? setting.setting_value : defaultValue;
  };

  // 如果不是管理员，显示无权限
  if (user && user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-700">无访问权限</h2>
        </div>
      </div>
    );
  }

  // 统计数据
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const last7Days = subDays(today, 7);
  const monthStart = startOfMonth(today);

  const todayInvitations = invitations.filter(i => 
    format(new Date(i.created_date), 'yyyy-MM-dd') === todayStr
  );
  const weekInvitations = invitations.filter(i => 
    isAfter(new Date(i.created_date), last7Days)
  );
  const monthInvitations = invitations.filter(i => 
    isAfter(new Date(i.created_date), monthStart)
  );

  const rewardedCount = invitations.filter(i => i.status === 'rewarded').length;
  const rejectedCount = invitations.filter(i => i.status === 'rejected').length;
  const highRiskCount = invitations.filter(i => i.risk_level === 'high').length;
  const totalRewardsGiven = invitations
    .filter(i => i.status === 'rewarded')
    .reduce((sum, i) => sum + (i.inviter_reward || 0) + (i.invitee_reward || 0), 0);

  // 过滤邀请记录
  const filteredInvitations = invitations.filter(inv => {
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
    if (riskFilter !== 'all' && inv.risk_level !== riskFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!inv.inviter_email?.toLowerCase().includes(term) && 
          !inv.invitee_email?.toLowerCase().includes(term) &&
          !inv.invite_code?.toLowerCase().includes(term)) {
        return false;
      }
    }
    return true;
  });

  const handleApprove = async (inv) => {
    await updateInvitationMutation.mutateAsync({
      id: inv.id,
      data: { status: 'rewarded' }
    });
  };

  const handleReject = async (inv) => {
    await updateInvitationMutation.mutateAsync({
      id: inv.id,
      data: { status: 'rejected', reject_reason: '管理员手动拒绝' }
    });
  };

  const statusBadge = (status) => {
    const config = {
      pending: { label: '待完成', className: 'bg-slate-100 text-slate-700' },
      completed: { label: '待审核', className: 'bg-amber-100 text-amber-700' },
      rewarded: { label: '已发放', className: 'bg-green-100 text-green-700' },
      rejected: { label: '已拒绝', className: 'bg-red-100 text-red-700' },
    };
    const c = config[status] || config.pending;
    return <Badge className={c.className}>{c.label}</Badge>;
  };

  const riskBadge = (level) => {
    const config = {
      low: { label: '低风险', className: 'bg-green-100 text-green-700' },
      medium: { label: '中风险', className: 'bg-amber-100 text-amber-700' },
      high: { label: '高风险', className: 'bg-red-100 text-red-700' },
    };
    const c = config[level] || config.low;
    return <Badge className={c.className}>{c.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('AdminDashboard')}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-slate-800">邀请管理</h1>
              <p className="text-sm text-slate-500">管理邀请记录、查看数据统计</p>
            </div>
          </div>
          <Link to={createPageUrl('AdminSettings')}>
            <Button variant="outline" className="gap-2">
              <Settings className="h-4 w-4" />
              邀请设置
            </Button>
          </Link>
        </div>
      </div>

      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              数据概览
            </TabsTrigger>
            <TabsTrigger value="records" className="gap-2">
              <Users className="h-4 w-4" />
              邀请记录
            </TabsTrigger>
            <TabsTrigger value="risk" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              风险监控
            </TabsTrigger>
          </TabsList>

          {/* 数据概览 */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-slate-800">{todayInvitations.length}</div>
                      <div className="text-sm text-slate-500">今日邀请</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-slate-800">{monthInvitations.length}</div>
                      <div className="text-sm text-slate-500">本月邀请</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                      <Gift className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-slate-800">{totalRewardsGiven.toLocaleString()}</div>
                      <div className="text-sm text-slate-500">累计发放积分</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                      <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-slate-800">{highRiskCount}</div>
                      <div className="text-sm text-slate-500">高风险邀请</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 转化漏斗 */}
            <Card>
              <CardHeader>
                <CardTitle>邀请转化漏斗</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 text-center p-4 bg-blue-50 rounded-xl">
                    <div className="text-3xl font-bold text-blue-600">{invitations.length}</div>
                    <div className="text-sm text-slate-500">总邀请数</div>
                  </div>
                  <div className="text-slate-300">→</div>
                  <div className="flex-1 text-center p-4 bg-amber-50 rounded-xl">
                    <div className="text-3xl font-bold text-amber-600">
                      {invitations.filter(i => i.status !== 'pending').length}
                    </div>
                    <div className="text-sm text-slate-500">完成注册</div>
                  </div>
                  <div className="text-slate-300">→</div>
                  <div className="flex-1 text-center p-4 bg-green-50 rounded-xl">
                    <div className="text-3xl font-bold text-green-600">{rewardedCount}</div>
                    <div className="text-sm text-slate-500">成功发放</div>
                  </div>
                  <div className="text-slate-300">→</div>
                  <div className="flex-1 text-center p-4 bg-red-50 rounded-xl">
                    <div className="text-3xl font-bold text-red-600">{rejectedCount}</div>
                    <div className="text-sm text-slate-500">拒绝发放</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 邀请记录 */}
          <TabsContent value="records">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>邀请记录</CardTitle>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="搜索邮箱或邀请码..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 w-64"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部状态</SelectItem>
                        <SelectItem value="pending">待完成</SelectItem>
                        <SelectItem value="completed">待审核</SelectItem>
                        <SelectItem value="rewarded">已发放</SelectItem>
                        <SelectItem value="rejected">已拒绝</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => queryClient.invalidateQueries(['admin-invitations'])}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>邀请人</TableHead>
                      <TableHead>被邀请人</TableHead>
                      <TableHead>邀请码</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>风险</TableHead>
                      <TableHead>奖励</TableHead>
                      <TableHead>时间</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvitations.slice(0, 50).map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-sm">{inv.inviter_email}</TableCell>
                        <TableCell className="font-mono text-sm">{inv.invitee_email}</TableCell>
                        <TableCell className="font-mono">{inv.invite_code}</TableCell>
                        <TableCell>{statusBadge(inv.status)}</TableCell>
                        <TableCell>{riskBadge(inv.risk_level)}</TableCell>
                        <TableCell>
                          {inv.status === 'rewarded' && (
                            <span className="text-green-600 font-medium">
                              +{(inv.inviter_reward || 0) + (inv.invitee_reward || 0)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {format(new Date(inv.created_date), 'MM-dd HH:mm')}
                        </TableCell>
                        <TableCell>
                          {inv.status === 'completed' && (
                            <div className="flex gap-1">
                              <Button 
                                size="sm" 
                                variant="ghost"
                                className="h-7 text-green-600 hover:text-green-700"
                                onClick={() => handleApprove(inv)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                className="h-7 text-red-600 hover:text-red-700"
                                onClick={() => handleReject(inv)}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredInvitations.length === 0 && (
                  <div className="text-center py-8 text-slate-400">暂无邀请记录</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 风险监控 */}
          <TabsContent value="risk">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    高风险邀请
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {invitations.filter(i => i.risk_level === 'high').length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>暂无高风险邀请</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>邀请人</TableHead>
                          <TableHead>被邀请人</TableHead>
                          <TableHead>风险原因</TableHead>
                          <TableHead>IP地址</TableHead>
                          <TableHead>状态</TableHead>
                          <TableHead>操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invitations.filter(i => i.risk_level === 'high').map((inv) => (
                          <TableRow key={inv.id}>
                            <TableCell className="font-mono text-sm">{inv.inviter_email}</TableCell>
                            <TableCell className="font-mono text-sm">{inv.invitee_email}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {(inv.risk_reasons || []).map((reason, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {reason}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{inv.ip_address || '-'}</TableCell>
                            <TableCell>{statusBadge(inv.status)}</TableCell>
                            <TableCell>
                              {inv.status !== 'rejected' && (
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  className="h-7"
                                  onClick={() => handleReject(inv)}
                                >
                                  拒绝
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}