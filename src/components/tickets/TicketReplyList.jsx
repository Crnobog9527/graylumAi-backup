import React from 'react';
import { User, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TicketReplyList({ replies, isAdmin = false }) {
  if (replies.length === 0) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)'
        }}
      >
        <p style={{ color: 'var(--text-tertiary)' }}>暂无回复</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {replies.map((reply) => (
        <div
          key={reply.id}
          className="rounded-xl p-4"
          style={{
            background: reply.is_admin_reply ? 'rgba(255, 215, 0, 0.05)' : 'var(--bg-secondary)',
            border: reply.is_admin_reply ? '1px solid rgba(255, 215, 0, 0.2)' : '1px solid var(--border-primary)'
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: reply.is_admin_reply ? 'rgba(255, 215, 0, 0.2)' : 'var(--bg-tertiary)'
              }}
            >
              {reply.is_admin_reply ? (
                <Shield className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
              ) : (
                <User className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                  {reply.is_admin_reply ? (isAdmin ? '管理员' : '客服') : (isAdmin ? '用户' : '我')}
                </span>
                {reply.is_admin_reply && !isAdmin && (
                  <span
                    className="px-2 py-0.5 text-xs rounded-full"
                    style={{
                      background: 'rgba(255, 215, 0, 0.2)',
                      color: 'var(--color-primary)'
                    }}
                  >
                    官方回复
                  </span>
                )}
                {isAdmin && (
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{reply.user_email}</span>
                )}
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {new Date(reply.created_date).toLocaleString('zh-CN')}
                </span>
              </div>
              <p className="whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{reply.message}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
