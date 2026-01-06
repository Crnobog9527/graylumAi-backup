import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  statusOptions,
  categoryMap
} from '@/constants/ticketConstants';
import {
  LoadingSpinner,
  TicketStatusBadge,
  TicketReplyList,
  TicketReplyForm
} from '@/components/tickets';
import AdminSidebar from '../components/admin/AdminSidebar';
import { LanguageProvider } from '../components/admin/LanguageContext';

function AdminTicketDetailContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [replyMessage, setReplyMessage] = useState('');
  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);

  const ticketId = new URLSearchParams(location.search).get('id');

  // 1. 首先获取用户数据 - 使用 useState 确保稳定
  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        setUser(null);
      } finally {
        setUserLoading(false);
      }
    };
    loadUser();
  }, []);

  // 2. 用户数据加载后再获取工单数据
  const { data: ticket, isLoading: ticketLoading, isError, error } = useQuery({
    queryKey: ['admin-ticket', ticketId],
    queryFn: async () => {
      console.log('=== 管理员端工单查询开始 ===');
      console.log('ticketId:', ticketId);
      console.log('user:', user);
      
      // 直接通过ID过滤获取工单
      const tickets = await base44.entities.Ticket.filter({ id: ticketId });
      console.log('查询返回结果:', tickets);
      console.log('结果数量:', tickets.length);
      
      if (tickets.length === 0) {
        console.log('未找到工单');
        return null;
      }
      
      console.log('找到工单:', tickets[0]);
      return tickets[0];
    },
    enabled: !!ticketId && !!user && user.role === 'admin',
    retry: false,
    staleTime: 1000 * 60 * 5, // 5分钟内不重新获取
    refetchOnWindowFocus: false, // 防止窗口聚焦时重新获取
  });

  // 3. 获取回复数据
  const { data: replies = [] } = useQuery({
    queryKey: ['ticket-replies', ticketId],
    queryFn: () => base44.entities.TicketReply.filter({ ticket_id: ticketId }, '-created_date'),
    enabled: !!ticketId && !!user && user.role === 'admin',
  });

  const updateTicketMutation = useMutation({
    mutationFn: (data) => base44.entities.Ticket.update(ticketId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-ticket', ticketId]);
      toast.success('工单已更新');
    }
  });

  const addReplyMutation = useMutation({
    mutationFn: async (message) => {
      const reply = await base44.entities.TicketReply.create({
        ticket_id: ticketId,
        user_email: user.email,
        message,
        is_admin_reply: true
      });

      await base44.entities.Ticket.update(ticketId, {
        status: ticket.status === 'pending' ? 'in_progress' : ticket.status,
        updated_date: new Date().toISOString()
      });

      return reply;
    },
    onSuccess: () => {
      setReplyMessage('');
      queryClient.invalidateQueries(['ticket-replies', ticketId]);
      queryClient.invalidateQueries(['admin-ticket', ticketId]);
      toast.success('回复已发送');
    }
  });

  // 等待用户数据加载
  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  // 检查权限
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <p className="text-slate-600">无权访问此页面</p>
        </div>
      </div>
    );
  }

  // 等待工单数据加载 - 包括初始 undefined 状态
  if (ticketLoading || ticket === undefined) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <AdminSidebar currentPage="AdminTickets" />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
        </div>
      </div>
    );
  }

  // 工单不存在 - 只有明确返回 null 时才显示
  if (ticket === null) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <AdminSidebar currentPage="AdminTickets" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-600">工单不存在</p>
            <Button
              variant="outline"
              onClick={() => navigate(createPageUrl('AdminTickets'))}
              className="mt-4"
            >
              返回工单列表
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleReplySubmit = (e) => {
    e.preventDefault();
    if (!replyMessage.trim()) {
      toast.error('请输入回复内容');
      return;
    }
    addReplyMutation.mutate(replyMessage);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar currentPage="AdminTickets" />
      
      <div className="flex-1 p-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('AdminTickets'))}
            className="mb-4 -ml-2 text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回工单列表
          </Button>
        </div>

        {/* Ticket Info & Controls */}
        <div className="bg-white rounded-xl p-6 mb-6 border border-slate-200">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <span className="text-sm font-mono text-slate-500">{ticket.ticket_number}</span>
                <TicketStatusBadge status={ticket.status} />
              </div>
              <h1 className="text-2xl font-bold mb-2 text-slate-900">{ticket.title}</h1>
              <div className="flex items-center gap-4 text-sm flex-wrap text-slate-500">
                <span>用户：{ticket.user_email}</span>
                <span>•</span>
                <span>{categoryMap[ticket.category]}</span>
                <span>•</span>
                <span>创建于 {new Date(ticket.created_date).toLocaleString('zh-CN')}</span>
              </div>
            </div>
          </div>

          {/* Admin Controls */}
          <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200">
            <div>
              <label className="text-sm font-medium mb-2 block text-slate-700">更改状态</label>
              <Select
                value={ticket.status}
                onValueChange={(value) => updateTicketMutation.mutate({ status: value })}
              >
                <SelectTrigger className="bg-white border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block text-slate-700">分配给</label>
              <Select
                value={ticket.assigned_to || 'unassigned'}
                onValueChange={(value) => updateTicketMutation.mutate({
                  assigned_to: value === 'unassigned' ? null : value
                })}
              >
                <SelectTrigger className="bg-white border-slate-200">
                  <SelectValue placeholder="未分配" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">未分配</SelectItem>
                  <SelectItem value={user.email}>{user.email}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-200">
            <h3 className="text-sm font-medium mb-2 text-slate-700">问题描述</h3>
            <p className="whitespace-pre-wrap text-slate-600">{ticket.description}</p>
          </div>
        </div>

        {/* Replies */}
        <div className="space-y-4 mb-6">
          <h2 className="text-lg font-semibold text-slate-900">回复记录</h2>
          <TicketReplyList replies={replies} isAdmin={true} />
        </div>

        {/* Admin Reply Form */}
        {ticket.status !== 'closed' && (
          <div>
            <TicketReplyForm
              replyMessage={replyMessage}
              setReplyMessage={setReplyMessage}
              onSubmit={handleReplySubmit}
              isPending={addReplyMutation.isPending}
              isAdmin={true}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminTicketDetail() {
  return (
    <LanguageProvider>
      <AdminTicketDetailContent />
    </LanguageProvider>
  );
}