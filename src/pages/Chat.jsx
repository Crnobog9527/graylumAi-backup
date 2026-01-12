import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// 引入自定义 Hook 和组件
import { useChatState } from '@/components/hooks/useChatState.jsx';
import ChatSidebar from '@/components/chat/ChatSidebar';
import ChatHeader from '@/components/chat/ChatHeader';
import ChatMessages from '@/components/chat/ChatMessages';
import ChatInputArea from '@/components/chat/ChatInputArea';
import ChatDebugPanel from '@/components/chat/ChatDebugPanel';
import TokenUsageStats from '@/components/chat/TokenUsageStats';

export default function Chat() {
  const {
    // 状态
    user,
    selectedModel,
    currentConversation,
    messages,
    isStreaming,
    inputMessage,
    setInputMessage,
    isSelectMode,
    setIsSelectMode,
    selectedConversations,
    setSelectedConversations,
    longTextWarning,
    setLongTextWarning,
    uploadedFiles,
    isUploading,
    fileContents,
    isEditingTitle,
    setIsEditingTitle,
    editingTitleValue,
    setEditingTitleValue,
    showDebugPanel,
    setShowDebugPanel,
    debugInfo,
    setDebugInfo,
    isExporting,
    canExport,
    conversationKey,  // 【新增】用于强制重新渲染消息列表

    // Refs
    messagesEndRef,
    textareaRef,
    fileInputRef,

    // 数据
    conversations,
    groupedConversations,
    settings,

    // 操作函数
    handleStartNewChat,
    handleSelectConversation,
    handleDeleteConversation,
    handleBatchDelete,
    toggleSelectConversation,
    toggleSelectAll,
    handleSaveTitle,
    handleSendMessage,
    handleKeyDown,
    handleConfirmLongText,
    handleFileSelect,
    removeUploadedFile,
    handleExportConversation,
  } = useChatState();

  // 加载状态
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--color-primary)' }}></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex" style={{ background: 'var(--bg-primary)' }}>
      {/* 精简动画样式 */}
      <style>{`
        .chat-input-box:focus-within {
          border-color: rgba(255, 215, 0, 0.5) !important;
        }
        .conversation-item:hover {
          background: rgba(255, 215, 0, 0.05) !important;
        }
      `}</style>

      {/* 左侧边栏 - 对话列表 */}
      <ChatSidebar
        groupedConversations={groupedConversations}
        conversations={conversations}
        currentConversation={currentConversation}
        isSelectMode={isSelectMode}
        setIsSelectMode={setIsSelectMode}
        selectedConversations={selectedConversations}
        setSelectedConversations={setSelectedConversations}
        onStartNewChat={handleStartNewChat}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        onBatchDelete={handleBatchDelete}
        toggleSelectConversation={toggleSelectConversation}
        toggleSelectAll={toggleSelectAll}
      />

      {/* 主聊天区域 */}
      <div
        className={cn("flex-1 flex flex-col relative overflow-hidden", showDebugPanel && "mr-80")}
        style={{ background: 'var(--bg-primary)' }}
      >
        {/* 静态背景光晕 */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0, contain: 'layout paint' }}>
          <div
            className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 rounded-full opacity-[0.08] blur-[100px]"
            style={{ background: 'var(--color-primary)' }}
          />
          <div
            className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 rounded-full opacity-[0.15] blur-[120px]"
            style={{ background: 'var(--color-secondary)' }}
          />
        </div>

        {/* 顶部标题栏 */}
        <ChatHeader
          currentConversation={currentConversation}
          isEditingTitle={isEditingTitle}
          setIsEditingTitle={setIsEditingTitle}
          editingTitleValue={editingTitleValue}
          setEditingTitleValue={setEditingTitleValue}
          onSaveTitle={handleSaveTitle}
          canExport={canExport}
          isExporting={isExporting}
          onExport={handleExportConversation}
          showDebugPanel={showDebugPanel}
          setShowDebugPanel={setShowDebugPanel}
          isAdmin={user.role === 'admin'}
        />

        {/* 消息区域 */}
        <ChatMessages
          key={`messages-${conversationKey}`}  // 【关键修复】使用 key 强制重新渲染
          messages={messages}
          isStreaming={isStreaming}
          user={user}
          messagesEndRef={messagesEndRef}
        />

        {/* Token 使用统计 */}
        {settings.showTokenUsageStats && messages.length > 0 && (
          <TokenUsageStats messages={messages} currentModel={selectedModel} />
        )}

        {/* 输入区域 */}
        <ChatInputArea
          inputMessage={inputMessage}
          setInputMessage={setInputMessage}
          isStreaming={isStreaming}
          isUploading={isUploading}
          uploadedFiles={uploadedFiles}
          fileContents={fileContents}
          maxInputCharacters={settings.maxInputCharacters}
          chatBillingHint={settings.chatBillingHint}
          textareaRef={textareaRef}
          fileInputRef={fileInputRef}
          onSendMessage={handleSendMessage}
          onKeyDown={handleKeyDown}
          onFileSelect={handleFileSelect}
          onRemoveFile={removeUploadedFile}
        />
      </div>

      {/* 长文本警告对话框 */}
      <AlertDialog
        open={longTextWarning.open}
        onOpenChange={(open) => setLongTextWarning(prev => ({ ...prev, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              检测到长文本
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                您的输入内容较长（约 {longTextWarning.estimatedTokens.toLocaleString()} tokens），
                本次处理预计消耗约 <span className="font-semibold text-amber-600">{longTextWarning.estimatedCredits}</span> 积分。
              </p>
              <p className="text-slate-500">是否继续发送？</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmLongText} className="bg-blue-600 hover:bg-blue-700">
              继续发送
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 调试面板 (仅管理员) */}
      {user.role === 'admin' && showDebugPanel && (
        <ChatDebugPanel
          debugInfo={debugInfo}
          onClear={() => setDebugInfo([])}
        />
      )}
    </div>
  );
}