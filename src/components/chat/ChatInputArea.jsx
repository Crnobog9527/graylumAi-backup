import React, { memo } from 'react';
import { Paperclip, Send, Loader2, X, FileText, Image } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// 文件预览列表
const FilePreviewList = memo(function FilePreviewList({
  uploadedFiles,
  fileContents,
  onRemoveFile
}) {
  if (uploadedFiles.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-2">
      {uploadedFiles.map((file, index) => (
        <div
          key={index}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm"
          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)' }}
        >
          {file.type?.startsWith('image/') ? (
            <Image className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
          ) : (
            <FileText className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
          )}
          <span className="max-w-[150px] truncate" style={{ color: 'var(--text-secondary)' }}>
            {file.name}
          </span>
          {file.status === 'extracting' && (
            <Loader2 className="h-3 w-3 animate-spin" style={{ color: 'var(--color-primary)' }} />
          )}
          {file.status === 'ready' && (
            <span className="text-xs" style={{ color: 'var(--success)' }}>✓</span>
          )}
          {file.status === 'error' && (
            <span className="text-xs" style={{ color: 'var(--error)' }} title={file.error}>⚠</span>
          )}
          <button
            onClick={() => onRemoveFile(index)}
            className="hover:opacity-80"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
});

// 主输入区组件
const ChatInputArea = memo(function ChatInputArea({
  inputMessage,
  setInputMessage,
  isStreaming,
  isUploading,
  uploadedFiles,
  fileContents,
  maxInputCharacters,
  chatBillingHint,
  textareaRef,
  fileInputRef,
  onSendMessage,
  onKeyDown,
  onFileSelect,
  onRemoveFile
}) {
  return (
    <div
      className="p-4 relative"
      style={{ borderTop: '1px solid var(--border-primary)', background: 'var(--bg-secondary)', zIndex: 1 }}
    >
      <div className="max-w-3xl mx-auto">
        {/* 已上传文件预览 */}
        <FilePreviewList
          uploadedFiles={uploadedFiles}
          fileContents={fileContents}
          onRemoveFile={onRemoveFile}
        />

        {/* 输入框 */}
        <div
          className="relative rounded-2xl chat-input-box"
          style={{
            background: 'var(--bg-primary)',
            border: '1px solid rgba(255, 215, 0, 0.15)',
          }}
        >
          <div className="flex items-end p-3">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt,.csv"
              onChange={onFileSelect}
              className="hidden"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 hover:opacity-80"
              style={{ color: 'var(--text-tertiary)' }}
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Paperclip className="h-5 w-5" />
              )}
            </Button>
            <Textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="请输入您的问题..."
              disabled={isStreaming}
              className="flex-1 min-h-[44px] max-h-[120px] resize-none border-0 focus-visible:ring-0 py-2 px-2 text-base bg-transparent"
              style={{ color: 'var(--text-primary)', '--tw-placeholder-opacity': 1 }}
              rows={1}
            />
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs" style={{ color: 'var(--text-disabled)' }}>
                {inputMessage.length}/{maxInputCharacters}
              </span>
              <Button
                data-send-button
                onClick={() => onSendMessage(false)}
                disabled={(!inputMessage.trim() && fileContents.length === 0) || isStreaming || uploadedFiles.some(f => f.status === 'extracting')}
                className="h-9 px-5 gap-2 rounded-xl font-medium"
                style={{
                  background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
                  color: 'var(--bg-primary)',
                }}
              >
                {isStreaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    发送
                    <Send className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* 聊天提示文案 */}
        {chatBillingHint && (
          <div
            className="mt-3 px-4 py-3 text-sm leading-relaxed text-center whitespace-pre-line"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {chatBillingHint}
          </div>
        )}
      </div>
    </div>
  );
});

export default ChatInputArea;
