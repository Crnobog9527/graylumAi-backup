import React, { useState, useEffect } from 'react';
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
  categoryOptions,
  categoryMap
} from '@/constants/ticketConstants';
import {
  LoadingSpinner,
  TicketStatusBadge
} from '@/components/tickets';
import AdminSidebar from '../components/admin/AdminSidebar';
import { LanguageProvider, useLanguage } from '../components/admin/LanguageContext';

function AdminTicketsContent() {
  const { t } = useLanguage();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('active');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  const { data: allTickets = [], isLoading } = useQuery({
    queryKey: ['admin-tickets'],
    queryFn: () => base44.entities.Ticket.list('-created_date'),
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  // 按状态分类工单
  const activeTickets = allTickets.filter(t => t.status !== 'closed');
  const closedTickets = allTickets.filter(t => t.status === 'closed');

  const filterTickets = (ticketList) => {
    return ticketList.filter((ticket) => {
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
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar currentPage="AdminTickets" />
      
      <div className="flex-1 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">{t('tickets')}</h1>
          <p className="text-slate-500 mt-1">查看和管理所有用户工单</p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border border-slate-200 p-1 mb-6">
            <TabsTrigger 
              value="active" 
              className="gap-2 data-[state=active]:bg-violet-500 data-[state=active]:text-white"
            >
              <Inbox className="h-4 w-4" />
              现有工单
              {activeTickets.length > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-violet-100 text-violet-600">
                  {activeTickets.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="closed" 
              className="gap-2 data-[state=active]:bg-violet-500 data-[state=active]:text-white"
            >
              <Archive className="h-4 w-4" />
              已关闭
              {closedTickets.length > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600">
                  {closedTickets.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Filters */}
          <div className="bg-white rounded-xl p-4 mb-6 space-y-4 border border-slate-200">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-600">筛选：</span>
              </div>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="分类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部分类</SelectItem>
                  {categoryOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
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
            <div className="rounded-xl p-4 bg-white border border-slate-200">
              <div className="text-2xl font-bold text-slate-900">{activeTab === 'active' ? activeTickets.length : closedTickets.length}</div>
              <div className="text-sm text-slate-500">{activeTab === 'active' ? '现有工单' : '已关闭'}</div>
            </div>
            <div className="rounded-xl p-4 bg-white border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-600">
                {activeTickets.filter(t => t.status === 'pending').length}
              </div>
              <div className="text-sm text-slate-500">待处理</div>
            </div>
            <div className="rounded-xl p-4 bg-white border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">
                {activeTickets.filter(t => t.status === 'in_progress').length}
              </div>
              <div className="text-sm text-slate-500">处理中</div>
            </div>
            <div className="rounded-xl p-4 bg-white border border-green-200">
              <div className="text-2xl font-bold text-green-600">
                {activeTickets.filter(t => t.status === 'resolved').length}
              </div>
              <div className="text-sm text-slate-500">已解决</div>
            </div>
          </div>

          <TabsContent value="active">
            {isLoading ? (
              <LoadingSpinner className="py-20" />
            ) : filteredActiveTickets.length === 0 ? (
              <div className="rounded-xl p-12 text-center bg-white border border-slate-200">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <h3 className="text-lg font-medium mb-2 text-slate-800">未找到工单</h3>
                <p className="text-slate-500">调整筛选条件或搜索关键词</p>
              </div>
            ) : (
              <TicketTable tickets={filteredActiveTickets} />
            )}
          </TabsContent>

          <TabsContent value="closed">
            {isLoading ? (
              <LoadingSpinner className="py-20" />
            ) : filteredClosedTickets.length === 0 ? (
              <div className="rounded-xl p-12 text-center bg-white border border-slate-200">
                <Archive className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <h3 className="text-lg font-medium mb-2 text-slate-800">暂无已关闭工单</h3>
                <p className="text-slate-500">关闭的工单会显示在这里</p>
              </div>
            ) : (
              <TicketTable tickets={filteredClosedTickets} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function AdminTickets() {
  return (
    <LanguageProvider>
      <AdminTicketsContent />
    </LanguageProvider>
  );
}

// 工单表格组件
function TicketTable({ tickets }) {
  return (
    <div className="rounded-xl overflow-hidden bg-white border border-slate-200">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">工单编号</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">标题</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">用户</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">分类</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">状态</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">创建时间</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr
                key={ticket.id}
                className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <td className="py-3 px-4">
                  <span className="font-mono text-sm text-slate-500">{ticket.ticket_number}</span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm font-medium text-slate-800">{ticket.title}</span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm text-slate-600">{ticket.user_email}</span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm text-slate-600">{categoryMap[ticket.category]}</span>
                </td>
                <td className="py-3 px-4">
                  <TicketStatusBadge status={ticket.status} />
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
                      className="text-violet-600 hover:text-violet-700 hover:bg-violet-50"
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