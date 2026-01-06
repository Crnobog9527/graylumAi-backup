import React from 'react';
import { XCircle } from 'lucide-react';

export default function TicketClosedNotice() {
  return (
    <div className="bg-slate-100 rounded-lg border border-slate-200 p-4 text-center">
      <XCircle className="h-8 w-8 text-slate-400 mx-auto mb-2" />
      <p className="text-slate-600">此工单已关闭，无法继续回复</p>
    </div>
  );
}
