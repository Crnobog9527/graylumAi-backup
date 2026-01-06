import React from 'react';
import { Paperclip } from 'lucide-react';
import { categoryMap } from '@/constants/ticketConstants';
import TicketStatusBadge from './TicketStatusBadge';
import TicketPriorityBadge from './TicketPriorityBadge';

export default function TicketInfo({ ticket, showUserEmail = false, children }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <span className="text-sm font-mono text-slate-500">{ticket.ticket_number}</span>
            <TicketStatusBadge status={ticket.status} />
            <TicketPriorityBadge priority={ticket.priority} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{ticket.title}</h1>
          <div className="flex items-center gap-4 text-sm text-slate-500 flex-wrap">
            {showUserEmail && (
              <>
                <span>用户：{ticket.user_email}</span>
                <span>•</span>
              </>
            )}
            <span>{categoryMap[ticket.category]}</span>
            <span>•</span>
            <span>创建于 {new Date(ticket.created_date).toLocaleString('zh-CN')}</span>
          </div>
        </div>
        {children}
      </div>

      <div className="border-t border-slate-200 pt-4">
        <h3 className="text-sm font-medium text-slate-700 mb-2">问题描述</h3>
        <p className="text-slate-600 whitespace-pre-wrap">{ticket.description}</p>
      </div>

      {ticket.attachments && ticket.attachments.length > 0 && (
        <div className="border-t border-slate-200 pt-4 mt-4">
          <h3 className="text-sm font-medium text-slate-700 mb-2">附件</h3>
          <div className="space-y-2">
            {ticket.attachments.map((file, index) => (
              <a
                key={index}
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 bg-slate-50 rounded hover:bg-slate-100 transition-colors"
              >
                <Paperclip className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-blue-600">{file.name}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
