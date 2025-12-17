import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Plus, Filter, AlertCircle, Clock, CheckCircle, XCircle } from 'lucide-react';
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

export default function Tickets() {
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['tickets', user?.email, statusFilter],
    queryFn: async () => {
      if (!user?.email) return [];
      const filter = { user_email: user.email };
      if (statusFilter !== 'all') {
        filter.status = statusFilter;
      }
      return base44.entities.Ticket.filter(filter, '-created_date');
    },
    enabled: !!user?.email,
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">我的工单</h1>
            <p className="text-slate-500 mt-1">查看和管理您的支持工单</p>
          </div>
          <Link to={createPageUrl('CreateTicket')}>
            <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
              <Plus className="h-4 w-4" />
              创建工单
            </Button>
          </Link>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
          <div className="flex items-center gap-3">
            <Filter className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-600">筛选状态：</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="pending">待处理</SelectItem>
                <SelectItem value="in_progress">处理中</SelectItem>
                <SelectItem value="resolved">已解决</SelectItem>
                <SelectItem value="closed">已关闭</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tickets List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : tickets.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">暂无工单</h3>
            <p className="text-slate-500 mb-6">您还没有创建任何工单</p>
            <Link to={createPageUrl('CreateTicket')}>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                创建第一个工单
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {tickets.map((ticket) => {
              const StatusIcon = statusMap[ticket.status].icon;
              return (
                <Link key={ticket.id} to={createPageUrl('TicketDetail') + `?id=${ticket.id}`}>
                  <div className="bg-white rounded-lg border border-slate-200 p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-mono text-slate-500">{ticket.ticket_number}</span>
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-medium border inline-flex items-center gap-1.5",
                            statusMap[ticket.status].color
                          )}>
                            <StatusIcon className="h-3 w-3" />
                            {statusMap[ticket.status].label}
                          </span>
                          <span className={cn("text-sm font-medium", priorityMap[ticket.priority].color)}>
                            {priorityMap[ticket.priority].label}优先级
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-1">{ticket.title}</h3>
                        <p className="text-slate-600 text-sm line-clamp-2 mb-3">{ticket.description}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span>{categoryMap[ticket.category]}</span>
                          <span>创建于 {new Date(ticket.created_date).toLocaleDateString('zh-CN')}</span>
                          <span>更新于 {new Date(ticket.updated_date).toLocaleDateString('zh-CN')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}