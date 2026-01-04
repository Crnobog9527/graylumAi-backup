import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Plus, Filter, AlertCircle, Clock, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const statusMap = {
  pending: { label: '待处理', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Clock },
  in_progress: { label: '处理中', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: AlertCircle },
  resolved: { label: '已解决', color: 'bg-green-500/10 text-green-400 border-green-500/20', icon: CheckCircle },
  closed: { label: '已关闭', color: 'bg-[#1a1a1a] text-[#666666] border-[#2a2a2a]', icon: XCircle }
};

const priorityMap = {
  low: { label: '低', color: 'text-[#666666]' },
  medium: { label: '中', color: 'text-blue-400' },
  high: { label: '高', color: 'text-orange-400' },
  urgent: { label: '紧急', color: 'text-red-400' }
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
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6"
        >
          <div>
            <h1 className="text-3xl font-bold text-white">我的工单</h1>
            <p className="text-[#666666] mt-1">查看和管理您的支持工单</p>
          </div>
          <Link to={createPageUrl('CreateTicket')}>
            <Button className="bg-amber-500 hover:bg-amber-600 text-black gap-2">
              <Plus className="h-4 w-4" />
              创建工单
            </Button>
          </Link>
        </motion.div>

        {/* Filter */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-[#0a0a0a] rounded-xl border border-[#1a1a1a] p-4 mb-6"
        >
          <div className="flex items-center gap-3">
            <Filter className="h-4 w-4 text-[#666666]" />
            <span className="text-sm text-[#666666]">筛选状态：</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] bg-[#1a1a1a] border-[#2a2a2a] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0a0a0a] border-[#1a1a1a]">
                <SelectItem value="all" className="text-[#a3a3a3] focus:bg-[#1a1a1a] focus:text-white">全部</SelectItem>
                <SelectItem value="pending" className="text-[#a3a3a3] focus:bg-[#1a1a1a] focus:text-white">待处理</SelectItem>
                <SelectItem value="in_progress" className="text-[#a3a3a3] focus:bg-[#1a1a1a] focus:text-white">处理中</SelectItem>
                <SelectItem value="resolved" className="text-[#a3a3a3] focus:bg-[#1a1a1a] focus:text-white">已解决</SelectItem>
                <SelectItem value="closed" className="text-[#a3a3a3] focus:bg-[#1a1a1a] focus:text-white">已关闭</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Tickets List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
          </div>
        ) : tickets.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-[#0a0a0a] rounded-xl border border-[#1a1a1a] p-12 text-center"
          >
            <AlertCircle className="h-12 w-12 text-[#333333] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">暂无工单</h3>
            <p className="text-[#666666] mb-6">您还没有创建任何工单</p>
            <Link to={createPageUrl('CreateTicket')}>
              <Button className="bg-amber-500 hover:bg-amber-600 text-black">
                <Plus className="h-4 w-4 mr-2" />
                创建第一个工单
              </Button>
            </Link>
          </motion.div>
        ) : (
          <div className="grid gap-4">
            {tickets.map((ticket, index) => {
              const StatusIcon = statusMap[ticket.status].icon;
              return (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
                >
                  <Link to={createPageUrl('TicketDetail') + `?id=${ticket.id}`}>
                    <div className="bg-[#0a0a0a] rounded-xl border border-[#1a1a1a] p-5 hover:border-[#2a2a2a] transition-all">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <span className="text-sm font-mono text-[#666666]">{ticket.ticket_number}</span>
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
                          <h3 className="text-lg font-semibold text-white mb-1">{ticket.title}</h3>
                          <p className="text-[#666666] text-sm line-clamp-2 mb-3">{ticket.description}</p>
                          <div className="flex items-center gap-4 text-xs text-[#444444]">
                            <span>{categoryMap[ticket.category]}</span>
                            <span>创建于 {new Date(ticket.created_date).toLocaleDateString('zh-CN')}</span>
                            <span>更新于 {new Date(ticket.updated_date).toLocaleDateString('zh-CN')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}