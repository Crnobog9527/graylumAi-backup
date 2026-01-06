import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Filter, Search, AlertCircle, Inbox, Archive } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  priorityOptions,
  categoryOptions,
  categoryMap
} from '@/constants/ticketConstants';
import {
  LoadingSpinner,
  TicketStatusBadge,
  TicketPriorityBadge
} from '@/components/tickets';

export default function TicketManagement() {
  const [activeTab, setActiveTab] = useState('active');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: allTickets = [], isLoading } = useQuery({
    queryKey: ['admin-tickets'],
    queryFn: () => base44.entities.Ticket.list('-created_date'),
  });

  // 按状态分类工单
  const activeTickets = allTickets.filter(t => t.status !== 'closed');
  const closedTickets = allTickets.filter(t => t.status === 'closed');

  const filterTickets = (ticketList) => {
    return ticketList.filter((ticket) => {
      if (priorityFilter !== 'all' && ticket.priority !== priorityFilter) return false;
      if (categoryFilter !== 'all' && ticket.category !== categoryFilter) return false;

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          ticket.ticket_number?.toLowerCase().includes(query) ||
          ticket.title?.toLowerCase().includes(query) ||
          ticket.user_email?.toLowerCase().includes(query)
        );
      }

      return true;
    });
  };

  const filteredActiveTickets = filterTickets(activeTickets);
  const filteredClosedTickets = filterTickets(closedTickets);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">工单管理</h1>
        <p className="text-slate-400 mt-1">查看和管理所有用户工单</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800 border border-slate-700 p-1">
          <TabsTrigger 
            value="active" 
            className="gap-2 data-[state=active]:bg-violet-500 data-[state=active]:text-white text-slate-400"
          >
            <Inbox className="h-4 w-4" />
            现有工单
            {activeTickets.length > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-violet-500/20 text-violet-300">
                {activeTickets.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="closed" 
            className="gap-2 data-[state=active]:bg-violet-500 data-[state=active]:text-white text-slate-400"
          >
            <Archive className="h-4 w-4" />
            已关闭
            {closedTickets.length > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-slate-700 text-slate-400">
                {closedTickets.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Filters */}
        <div className="bg-slate-800/50 rounded-xl p-4 mt-6 space-y-4 border border-slate-700">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-500" />
              <span className="text-sm text-slate-400">筛选：</span>
            </div>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px] bg-slate-900 border-slate-700 text-white">
                <SelectValue placeholder="优先级" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                <SelectItem value="all" className="text-white">全部优先级</SelectItem>
                {priorityOptions.map(option => (
                  <SelectItem key={option.value} value={option.value} className="text-white">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[140px] bg-slate-900 border-slate-700 text-white">
                <SelectValue placeholder="分类" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                <SelectItem value="all" className="text-white">全部分类</SelectItem>
                {categoryOptions.map(option => (
                  <SelectItem key={option.value} value={option.value} className="text-white">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索工单编号、标题或用户邮箱..."
              className="pl-10 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="rounded-xl p-4 bg-slate-800/50 border border-slate-700">
            <div className="text-2xl font-bold text-white">{activeTab === 'active' ? activeTickets.length : closedTickets.length}</div>
            <div className="text-sm text-slate-400">{activeTab === 'active' ? '现有工单' : '已关闭'}</div>
          </div>
          <div className="rounded-xl p-4 bg-slate-800/50 border border-yellow-500/30">
            <div className="text-2xl font-bold text-yellow-400">
              {activeTickets.filter(t => t.status === 'pending').length}
            </div>
            <div className="text-sm text-slate-400">待处理</div>
          </div>
          <div className="rounded-xl p-4 bg-slate-800/50 border border-blue-500/30">
            <div className="text-2xl font-bold text-blue-400">
              {activeTickets.filter(t => t.status === 'in_progress').length}
            </div>
            <div className="text-sm text-slate-400">处理中</div>
          </div>
          <div className="rounded-xl p-4 bg-slate-800/50 border border-green-500/30">
            <div className="text-2xl font-bold text-green-400">
              {activeTickets.filter(t => t.status === 'resolved').length}
            </div>
            <div className="text-sm text-slate-400">已解决</div>
          </div>
        </div>

        <TabsContent value="active" className="mt-6">
          {isLoading ? (
            <LoadingSpinner className="py-20" />
          ) : filteredActiveTickets.length === 0 ? (
            <div className="rounded-xl p-12 text-center bg-slate-800/50 border border-slate-700">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-slate-500" />
              <h3 className="text-lg font-medium mb-2 text-white">未找到工单</h3>
              <p className="text-slate-400">调整筛选条件或搜索关键词</p>
            </div>
          ) : (
            <TicketTable tickets={filteredActiveTickets} />
          )}
        </TabsContent>

        <TabsContent value="closed" className="mt-6">
          {isLoading ? (
            <LoadingSpinner className="py-20" />
          ) : filteredClosedTickets.length === 0 ? (
            <div className="rounded-xl p-12 text-center bg-slate-800/50 border border-slate-700">
              <Archive className="h-12 w-12 mx-auto mb-4 text-slate-500" />
              <h3 className="text-lg font-medium mb-2 text-white">暂无已关闭工单</h3>
              <p className="text-slate-400">关闭的工单会显示在这里</p>
            </div>
          ) : (
            <TicketTable tickets={filteredClosedTickets} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// 工单表格组件
function TicketTable({ tickets }) {
  return (
    <div className="rounded-xl overflow-hidden bg-slate-800/50 border border-slate-700">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-900/50 border-b border-slate-700">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">工单编号</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">标题</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">用户</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">分类</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">状态</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">优先级</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">创建时间</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">操作</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr
                key={ticket.id}
                className="border-b border-slate-700/50 hover:bg-slate-800/80 transition-colors"
              >
                <td className="py-3 px-4">
                  <span className="font-mono text-sm text-slate-500">{ticket.ticket_number}</span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm font-medium text-white">{ticket.title}</span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm text-slate-400">{ticket.user_email}</span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm text-slate-400">{categoryMap[ticket.category]}</span>
                </td>
                <td className="py-3 px-4">
                  <TicketStatusBadge status={ticket.status} />
                </td>
                <td className="py-3 px-4">
                  <TicketPriorityBadge priority={ticket.priority} showLabel={false} />
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm text-slate-500">
                    {new Date(ticket.created_date).toLocaleDateString('zh-CN')}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <Link to={createPageUrl('AdminTicketDetail') + `?id=${ticket.id}`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/10"
                    >
                      查看详情
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}