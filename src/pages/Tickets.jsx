import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Plus, Filter, AlertCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { statusOptions } from '@/constants/ticketConstants';
import { LoadingSpinner, TicketCard } from '@/components/tickets';

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
    return <LoadingSpinner />;
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
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tickets List */}
        {isLoading ? (
          <LoadingSpinner className="py-20" />
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
            {tickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} linkTo="TicketDetail" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
