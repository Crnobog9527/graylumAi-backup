import React, { useState } from 'react';
import { FileText, Image as ImageIcon, FileSpreadsheet, File, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const getFileIcon = (fileType) => {
  if (fileType?.startsWith('image/')) return ImageIcon;
  if (fileType?.includes('word') || fileType?.includes('docx')) return FileText;
  if (fileType?.includes('sheet') || fileType?.includes('csv')) return FileSpreadsheet;
  if (fileType === 'application/pdf') return FileText;
  return File;
};

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

export default function FileAttachmentCard({ attachment, className }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const Icon = getFileIcon(attachment.fileType);
  const isImage = attachment.contentType === 'image';

  return (
    <div className={cn("border border-slate-200 rounded-lg overflow-hidden bg-slate-50", className)}>
      {/* 文件卡片头部 */}
      <button
        onClick={() => !isImage && setIsExpanded(!isExpanded)}
        className={cn(
          "w-full p-3 flex items-center gap-3 text-left transition-colors",
          !isImage && "hover:bg-slate-100"
        )}
      >
        <div className="p-2 rounded-lg bg-white border border-slate-200">
          <Icon className="h-5 w-5 text-slate-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-800 truncate">{attachment.fileName}</p>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>{formatFileSize(attachment.fileSize)}</span>
            {attachment.truncated && <span className="text-amber-600">• 已截取</span>}
          </div>
        </div>
        {!isImage && (
          <div className="text-slate-400">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        )}
      </button>

      {/* 展开的内容 */}
      {isExpanded && !isImage && (
        <div className="border-t border-slate-200 p-3 bg-white max-h-[300px] overflow-y-auto">
          <pre className="text-xs text-slate-600 whitespace-pre-wrap font-mono">
            {attachment.preview || attachment.content?.slice(0, 1000)}
          </pre>
        </div>
      )}

      {/* 图片预览 */}
      {isImage && attachment.content && (
        <div className="border-t border-slate-200 p-3 bg-white">
          <img
            src={`data:${attachment.mediaType};base64,${attachment.content}`}
            alt={attachment.fileName}
            loading="lazy"
            className="max-w-full h-auto rounded"
          />
        </div>
      )}
    </div>
  );
}