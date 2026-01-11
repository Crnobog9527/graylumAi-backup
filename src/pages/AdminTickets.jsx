import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Filter, Search, AlertCircle, Inbox, Archive, X, Send, Loader2, ChevronRight, Clock, CheckCircle, MessageSquare } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { format } from 'date-fns';
import AdminSidebar from '../components/admin/AdminSidebar';
import { LanguageProvider, useLanguage } from '../components/admin/LanguageContext';

const categoryOptions = [
  { value: 'technical_support', label: '技术支持' },
  { value: 'feature_request', label: '功能建议' },
  { value: 'bug_report', label: 'Bug反馈' },
  { value: 'account_issue', label: '账户问题' },
  { value: 'other', label: '其他' },
];

const statusOptions = [
  { value: 'pending', label: '待处理' },
  { value: 'in_progress', label: '处理中' },
  { value: 'resolved', label: '已解决' },
  { value: 'closed', label: '已关闭' },
];

const categoryMap = {
  technical_support: '技术支持',
  feature_request: '功能建议',
  bug_report: 'Bug反馈',
  account_issue: '账户问题',
  other: '其他'
};

const statusConfig = {
  pending: { label: '待处理', bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
  in_progress: { label: '处理中', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  resolved: { label: '已解决', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  closed: { label: '已关闭', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' }
};

function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.pending;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text} border ${config.border}`}>
      {config.label}
    </span>
  );
}

function AdminTicketsContent() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('active');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');

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

  const { data: replies = [], refetch: refetchReplies } = useQuery({
    queryKey: ['ticket-replies', selectedTicket?.id],
    queryFn: () => base44.entities.TicketReply.filter({ ticket_id: selectedTicket.id }, 'created_date'),
    enabled: !!selectedTicket?.id,
  });

  const updateTicketMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Ticket.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
      toast.success('工单已更新');
    }
  });

  const addReplyMutation = useMutation({
    mutationFn: async (message) => {
      await base44.entities.TicketReply.create({
        ticket_id: selectedTicket.id,
        user_email: user.email,
        message,
        is_admin_reply: true
      });
      if (selectedTicket.status === 'pending') {
        await base44.entities.Ticket.update(selectedTicket.id, { status: 'in_progress' });
      }
    },
    onSuccess: () => {
      setReplyMessage('');
      refetchReplies();
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
      toast.success('回复已发送');
    }
  });

  const handleTicketClick = (ticket) => {
    setSelectedTicket(ticket);
    setSheetOpen(true);
  };

  const handleStatusChange = (ticketId, newStatus) => {
    updateTicketMutation.mutate({ id: ticketId, data: { status: newStatus } });
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket(prev => ({ ...prev, status: newStatus }));
    }
  };

  const handleReplySubmit = (e) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;
    addReplyMutation.mutate(replyMessage);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
      </div>
    );
  }

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
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">{t('tickets')}</h1>
          <p className="text-slate-500 text-sm mt-1">查看和管理所有用户工单</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <TabsList className="bg-white border border-slate-200 p-1">
              <TabsTrigger value="active" className="gap-2 data-[state=active]:bg-violet-500 data-[state=active]:text-white">
                <Inbox className="h-4 w-4" />
                现有工单
                {activeTickets.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-violet-100 text-violet-600 data-[state=active]:bg-white/20 data-[state=active]:text-white">
                    {activeTickets.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="closed" className="gap-2 data-[state=active]:bg-violet-500 data-[state=active]:text-white">
                <Archive className="h-4 w-4" />
                已关闭
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-3">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[130px] bg-white">
                  <SelectValue placeholder="分类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部分类</SelectItem>
                  {categoryOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索..."
                  className="pl-9 w-[200px] bg-white"
                />
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <div className="text-2xl font-bold text-slate-900">{activeTickets.length}</div>
              <div className="text-xs text-slate-500">现有工单</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-600">{activeTickets.filter(t => t.status === 'pending').length}</div>
              <div className="text-xs text-slate-500">待处理</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">{activeTickets.filter(t => t.status === 'in_progress').length}</div>
              <div className="text-xs text-slate-500">处理中</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="text-2xl font-bold text-green-600">{activeTickets.filter(t => t.status === 'resolved').length}</div>
              <div className="text-xs text-slate-500">已解决</div>
            </div>
          </div>

          <TabsContent value="active" className="mt-0">
            <TicketList 
              tickets={filteredActiveTickets} 
              isLoading={isLoading} 
              onTicketClick={handleTicketClick}
              onStatusChange={handleStatusChange}
              emptyIcon={<AlertCircle className="h-12 w-12 text-slate-300" />}
              emptyTitle="未找到工单"
              emptyDesc="调整筛选条件或等待新工单"
            />
          </TabsContent>

          <TabsContent value="closed" className="mt-0">
            <TicketList 
              tickets={filteredClosedTickets} 
              isLoading={isLoading} 
              onTicketClick={handleTicketClick}
              onStatusChange={handleStatusChange}
              emptyIcon={<Archive className="h-12 w-12 text-slate-300" />}
              emptyTitle="暂无已关闭工单"
              emptyDesc="关闭的工单会显示在这里"
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Ticket Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedTicket && (
            <div className="space-y-6">
              <SheetHeader>
                <div className="flex items-center justify-between">
                  <SheetTitle className="text-lg">{selectedTicket.title}</SheetTitle>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span className="font-mono">{selectedTicket.ticket_number}</span>
                  <span>•</span>
                  <span>{categoryMap[selectedTicket.category]}</span>
                </div>
              </SheetHeader>

              {/* Status Control */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-600">状态：</span>
                <Select
                  value={selectedTicket.status}
                  onValueChange={(value) => handleStatusChange(selectedTicket.id, value)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* User Info */}
              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <div className="text-sm">
                  <span className="text-slate-500">提交用户：</span>
                  <span className="text-slate-900">{selectedTicket.user_email}</span>
                </div>
                <div className="text-sm">
                  <span className="text-slate-500">创建时间：</span>
                  <span className="text-slate-900">{format(new Date(selectedTicket.created_date), 'yyyy-MM-dd HH:mm')}</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">问题描述</h4>
                <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap">
                  {selectedTicket.description}
                </div>
              </div>

              {/* Attachments */}
              {selectedTicket.attachments?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-2">附件</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedTicket.attachments.map((att, idx) => (
                      <a key={idx} href={att.url} target="_blank" rel="noopener noreferrer">
                        <img src={att.url} alt={att.name} loading="lazy" className="w-full h-24 object-cover rounded-lg border" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Replies */}
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-3">回复记录 ({replies.length})</h4>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {replies.length === 0 ? (
                    <div className="text-center py-6 text-sm text-slate-400">暂无回复</div>
                  ) : (
                    replies.map((reply) => (
                      <div 
                        key={reply.id} 
                        className={`p-3 rounded-lg text-sm ${reply.is_admin_reply ? 'bg-violet-50 border border-violet-100' : 'bg-slate-50'}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${reply.is_admin_reply ? 'bg-violet-100 text-violet-700' : 'bg-slate-200 text-slate-600'}`}>
                            {reply.is_admin_reply ? '管理员' : '用户'}
                          </span>
                          <span className="text-xs text-slate-400">{format(new Date(reply.created_date), 'MM-dd HH:mm')}</span>
                        </div>
                        <p className="text-slate-700 whitespace-pre-wrap">{reply.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Reply Form */}
              {selectedTicket.status !== 'closed' && (
                <form onSubmit={handleReplySubmit} className="pt-4 border-t">
                  <Textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="输入回复内容..."
                    className="mb-3 min-h-[100px]"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange(selectedTicket.id, 'resolved')}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      标记已解决
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={addReplyMutation.isPending || !replyMessage.trim()}
                      className="bg-violet-500 hover:bg-violet-600"
                    >
                      {addReplyMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-1" />
                          发送回复
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}

              {selectedTicket.status === 'closed' && (
                <div className="text-center py-4 bg-slate-50 rounded-lg text-sm text-slate-500">
                  此工单已关闭
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function TicketList({ tickets, isLoading, onTicketClick, onStatusChange, emptyIcon, emptyTitle, emptyDesc }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
        {emptyIcon}
        <h3 className="text-lg font-medium mt-4 mb-2 text-slate-800">{emptyTitle}</h3>
        <p className="text-slate-500">{emptyDesc}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table className="w-full">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">工单</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">用户</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">分类</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">状态</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">时间</th>
            <th className="py-3 px-4"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tickets.map((ticket) => (
            <tr 
              key={ticket.id} 
              className="hover:bg-slate-50 cursor-pointer transition-colors"
              onClick={() => onTicketClick(ticket)}
            >
              <td className="py-3 px-4">
                <div className="font-medium text-sm text-slate-900">{ticket.title}</div>
                <div className="text-xs text-slate-400 font-mono">{ticket.ticket_number}</div>
              </td>
              <td className="py-3 px-4">
                <span className="text-sm text-slate-600">{ticket.user_email}</span>
              </td>
              <td className="py-3 px-4">
                <span className="text-sm text-slate-600">{categoryMap[ticket.category]}</span>
              </td>
              <td className="py-3 px-4">
                <StatusBadge status={ticket.status} />
              </td>
              <td className="py-3 px-4">
                <span className="text-sm text-slate-500">{format(new Date(ticket.created_date), 'MM-dd HH:mm')}</span>
              </td>
              <td className="py-3 px-4">
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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