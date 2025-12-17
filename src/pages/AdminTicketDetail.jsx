import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, AlertCircle, Clock, CheckCircle, XCircle, User, Shield, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

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

export default function AdminTicketDetail() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [replyMessage, setReplyMessage] = useState('');

  const ticketId = new URLSearchParams(location.search).get('id');

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: () => base44.entities.Ticket.get(ticketId),
    enabled: !!ticketId && user?.role === 'admin',
  });

  const { data: replies = [] } = useQuery({
    queryKey: ['ticket-replies', ticketId],
    queryFn: () => base44.entities.TicketReply.filter({ ticket_id: ticketId }, '-created_date'),
    enabled: !!ticketId && user?.role === 'admin',
  });

  const updateTicketMutation = useMutation({
    mutationFn: (data) => base44.entities.Ticket.update(ticketId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['ticket', ticketId]);
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

      // Update ticket status to in_progress and update timestamp
      await base44.entities.Ticket.update(ticketId, {
        status: ticket.status === 'pending' ? 'in_progress' : ticket.status,
        updated_date: new Date().toISOString()
      });

      return reply;
    },
    onSuccess: () => {
      setReplyMessage('');
      queryClient.invalidateQueries(['ticket-replies', ticketId]);
      queryClient.invalidateQueries(['ticket', ticketId]);
      toast.success('回复已发送');
    }
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">工单不存在</p>
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

  const StatusIcon = statusMap[ticket.status].icon;

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('AdminTickets'))}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回工单列表
          </Button>
        </div>

        {/* Ticket Info & Controls */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
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
              <h1 className="text-2xl font-bold text-slate-900 mb-2">{ticket.title}</h1>
              <div className="flex items-center gap-4 text-sm text-slate-500">
                <span>用户：{ticket.user_email}</span>
                <span>•</span>
                <span>{categoryMap[ticket.category]}</span>
                <span>•</span>
                <span>创建于 {new Date(ticket.created_date).toLocaleString('zh-CN')}</span>
              </div>
            </div>
          </div>

          {/* Admin Controls */}
          <div className="border-t border-slate-200 pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">更改状态</label>
              <Select
                value={ticket.status}
                onValueChange={(value) => updateTicketMutation.mutate({ status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">待处理</SelectItem>
                  <SelectItem value="in_progress">处理中</SelectItem>
                  <SelectItem value="resolved">已解决</SelectItem>
                  <SelectItem value="closed">已关闭</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">更改优先级</label>
              <Select
                value={ticket.priority}
                onValueChange={(value) => updateTicketMutation.mutate({ priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">低</SelectItem>
                  <SelectItem value="medium">中</SelectItem>
                  <SelectItem value="high">高</SelectItem>
                  <SelectItem value="urgent">紧急</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">分配给</label>
              <Select
                value={ticket.assigned_to || 'unassigned'}
                onValueChange={(value) => updateTicketMutation.mutate({ 
                  assigned_to: value === 'unassigned' ? null : value 
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="未分配" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">未分配</SelectItem>
                  <SelectItem value="simonni@grayscalegroup.cn">simonni@grayscalegroup.cn</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 mt-4">
            <h3 className="text-sm font-medium text-slate-700 mb-2">问题描述</h3>
            <p className="text-slate-600 whitespace-pre-wrap">{ticket.description}</p>
          </div>
        </div>

        {/* Replies */}
        <div className="space-y-4 mb-6">
          <h2 className="text-lg font-semibold text-slate-900">回复记录</h2>
          
          {replies.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
              <p className="text-slate-500">暂无回复</p>
            </div>
          ) : (
            <div className="space-y-4">
              {replies.map((reply) => (
                <div
                  key={reply.id}
                  className={cn(
                    "bg-white rounded-lg border p-4",
                    reply.is_admin_reply ? "border-blue-200 bg-blue-50/50" : "border-slate-200"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      reply.is_admin_reply ? "bg-blue-100" : "bg-slate-100"
                    )}>
                      {reply.is_admin_reply ? (
                        <Shield className="h-5 w-5 text-blue-600" />
                      ) : (
                        <User className="h-5 w-5 text-slate-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-slate-900">
                          {reply.is_admin_reply ? '管理员' : '用户'}
                        </span>
                        <span className="text-xs text-slate-500">{reply.user_email}</span>
                        <span className="text-xs text-slate-500">
                          {new Date(reply.created_date).toLocaleString('zh-CN')}
                        </span>
                      </div>
                      <p className="text-slate-700 whitespace-pre-wrap">{reply.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Admin Reply Form */}
        {ticket.status !== 'closed' && (
          <form onSubmit={handleReplySubmit} className="bg-blue-50 rounded-lg border border-blue-200 p-4">
            <h3 className="text-sm font-medium text-slate-900 mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-600" />
              管理员回复
            </h3>
            <Textarea
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              placeholder="输入您的回复..."
              className="mb-3 min-h-[120px] bg-white"
              maxLength={1000}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">{replyMessage.length}/1000</span>
              <Button
                type="submit"
                disabled={addReplyMutation.isPending || !replyMessage.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {addReplyMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                发送回复
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}