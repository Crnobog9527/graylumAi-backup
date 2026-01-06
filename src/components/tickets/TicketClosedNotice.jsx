import React from 'react';
import { XCircle } from 'lucide-react';

export default function TicketClosedNotice() {
  return (
    <div
      className="rounded-xl p-4 text-center"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-primary)'
      }}
    >
      <XCircle className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--text-tertiary)' }} />
      <p style={{ color: 'var(--text-secondary)' }}>此工单已关闭，无法继续回复</p>
    </div>
  );
}
