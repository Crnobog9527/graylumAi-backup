import React from 'react';
import { User, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TicketReplyList({ replies, isAdmin = false }) {
  if (replies.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
        <p className="text-slate-500">暂无回复</p>
      </div>
    );
  }

  return (
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
              "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
              reply.is_admin_reply ? "bg-blue-100" : "bg-slate-100"
            )}>
              {reply.is_admin_reply ? (
                <Shield className="h-5 w-5 text-blue-600" />
              ) : (
                <User className="h-5 w-5 text-slate-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="font-medium text-slate-900">
                  {reply.is_admin_reply ? (isAdmin ? '管理员' : '客服') : (isAdmin ? '用户' : '我')}
                </span>
                {reply.is_admin_reply && !isAdmin && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                    官方回复
                  </span>
                )}
                {isAdmin && (
                  <span className="text-xs text-slate-500">{reply.user_email}</span>
                )}
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
  );
}
