import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Filter, Search, AlertCircle, Clock, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const statusMap = {
  pending: { label: '待处理', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
  in_progress: { label: '处理中', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: AlertCircle },
  resolved: { label: '已解决', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
  closed: { label: '已关闭', color: 'bg-slate-100 text-slate-800 border-slate-200', icon: XCircle }
};

const priorityMap = {
  low: { label: '低', color: 'text-slate-500' },
  medium: { label: '中', color: 'text-blue-600' },
  high: { label: '高', color: 'text-orange-600' },
  urgent: { label: '紧急', color: 'text-red-600' }
};

const categoryMap = {
  technical_support: '技术支持',
  feature_request: '功能建议',
  bug_report: 'Bug反馈',
  account_issue: '账户问题',
  other: '其他'
};

export default function AdminTickets() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allTickets = [], isLoading } = useQuery({
    queryKey: ['admin-tickets'],
    queryFn: () => base44.entities.Ticket.list('-created_date'),
    enabled: user?.role === 'admin',
  });

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-slate-600">无权访问此页面</p>
        </div>
      </div>
    );
  }

  // Filter tickets
  const filteredTickets = allTickets.filter((ticket) => {
    if (statusFilter !== 'all' && ticket.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && ticket.priority !== priorityFilter) return false;
    if (categoryFilter !== 'all' && ticket.category !== categoryFilter) return false;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        ticket.ticket_number.toLowerCase().includes(query) ||
        ticket.title.toLowerCase().includes(query) ||
        ticket.user_email.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">工单管理</h1>
          <p className="text-slate-500 mt-1">查看和管理所有用户工单</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6 space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-600">筛选：</span>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="pending">待处理</SelectItem>
                <SelectItem value="in_progress">处理中</SelectItem>
                <SelectItem value="resolved">已解决</SelectItem>
                <SelectItem value="closed">已关闭</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="优先级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部优先级</SelectItem>
                <SelectItem value="low">低</SelectItem>
                <SelectItem value="medium">中</SelectItem>
                <SelectItem value="high">高</SelectItem>
                <SelectItem value="urgent">紧急</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分类</SelectItem>
                <SelectItem value="technical_support">技术支持</SelectItem>
                <SelectItem value="feature_request">功能建议</SelectItem>
                <SelectItem value="bug_report">Bug反馈</SelectItem>
                <SelectItem value="account_issue">账户问题</SelectItem>
                <SelectItem value="other">其他</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索工单编号、标题或用户邮箱..."
              className="pl-10"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-2xl font-bold text-slate-900">{allTickets.length}</div>
            <div className="text-sm text-slate-500">总工单数</div>
          </div>
          <div className="bg-white rounded-lg border border-yellow-200 p-4">
            <div className="text-2xl font-bold text-yellow-700">
              {allTickets.filter(t => t.status === 'pending').length}
            </div>
            <div className="text-sm text-slate-500">待处理</div>
          </div>
          <div className="bg-white rounded-lg border border-blue-200 p-4">
            <div className="text-2xl font-bold text-blue-700">
              {allTickets.filter(t => t.status === 'in_progress').length}
            </div>
            <div className="text-sm text-slate-500">处理中</div>
          </div>
          <div className="bg-white rounded-lg border border-green-200 p-4">
            <div className="text-2xl font-bold text-green-700">
              {allTickets.filter(t => t.status === 'resolved').length}
            </div>
            <div className="text-sm text-slate-500">已解决</div>
          </div>
        </div>

        {/* Tickets Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">未找到工单</h3>
            <p className="text-slate-500">调整筛选条件或搜索关键词</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">工单编号</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">标题</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">用户</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">分类</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">状态</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">优先级</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">创建时间</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredTickets.map((ticket) => {
                    const StatusIcon = statusMap[ticket.status].icon;
                    return (
                      <tr key={ticket.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <span className="font-mono text-sm text-slate-600">{ticket.ticket_number}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-slate-900 font-medium">{ticket.title}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-slate-600">{ticket.user_email}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-slate-600">{categoryMap[ticket.category]}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium border inline-flex items-center gap-1",
                            statusMap[ticket.status].color
                          )}>
                            <StatusIcon className="h-3 w-3" />
                            {statusMap[ticket.status].label}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={cn("text-sm font-medium", priorityMap[ticket.priority].color)}>
                            {priorityMap[ticket.priority].label}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-slate-600">
                            {new Date(ticket.created_date).toLocaleDateString('zh-CN')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Link to={createPageUrl('AdminTicketDetail') + `?id=${ticket.id}`}>
                            <Button variant="ghost" size="sm">
                              查看详情
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}