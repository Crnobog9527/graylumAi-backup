import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, MessageSquare, Pencil, ChevronDown, Paperclip, Send, Loader2, Copy, RefreshCw, ThumbsUp, ThumbsDown, Bot, Trash2, CheckSquare, Square, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { format, isToday, isYesterday, differenceInDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function Chat() {
  const [user, setUser] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const queryClient = useQueryClient();
  const location = useLocation();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  const { data: models = [] } = useQuery({
    queryKey: ['models'],
    queryFn: () => base44.entities.AIModel.filter({ is_active: true }),
  });

  const { data: promptModules = [] } = useQuery({
    queryKey: ['promptModules'],
    queryFn: () => base44.entities.PromptModule.filter({ is_active: true }, 'sort_order'),
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations', user?.email],
    queryFn: () => base44.entities.Conversation.filter(
      { created_by: user?.email, is_archived: false },
      '-updated_date'
    ),
    enabled: !!user?.email,
  });

  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      setSelectedModel(models[0]);
    }
  }, [models]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [inputMessage]);

  const createConversationMutation = useMutation({
    mutationFn: (data) => base44.entities.Conversation.create(data),
    onSuccess: () => queryClient.invalidateQueries(['conversations']),
  });

  const updateConversationMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Conversation.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['conversations']),
  });

  const updateUserMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: (data) => setUser(prev => ({ ...prev, ...data })),
  });

  const createTransactionMutation = useMutation({
    mutationFn: (data) => base44.entities.CreditTransaction.create(data),
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const moduleId = params.get('module_id');
    const autoStart = params.get('auto_start') === 'true';
    
    if (moduleId && promptModules.length > 0 && models.length > 0 && user) {
      const module = promptModules.find(m => m.id === moduleId);
      if (module) {
        handleStartNewChat(module);
        window.history.replaceState({}, '', createPageUrl('Chat'));
        
        // 如果设置了自动开始，自动发送初始消息触发系统提示词
        if (autoStart && module.user_prompt_template) {
          // 延迟执行，确保状态已更新
          setTimeout(() => {
            setInputMessage(module.user_prompt_template);
            // 再延迟一点触发发送
            setTimeout(() => {
              document.querySelector('[data-send-button]')?.click();
            }, 100);
          }, 100);
        } else if (autoStart) {
          // 如果没有用户提示模板，发送默认消息
          setTimeout(() => {
            setInputMessage('请开始');
            setTimeout(() => {
              document.querySelector('[data-send-button]')?.click();
            }, 100);
          }, 100);
        }
      }
    }
  }, [location.search, promptModules, models, user]);

  const handleStartNewChat = (module = null) => {
    setCurrentConversation(null);
    setMessages([]);
    setSelectedModule(module);
    
    // 如果模块指定了专用模型，自动切换
    if (module?.model_id && models.length > 0) {
      const moduleModel = models.find(m => m.id === module.model_id);
      if (moduleModel) {
        setSelectedModel(moduleModel);
      }
    }
  };

  const handleSelectConversation = async (conv) => {
    setCurrentConversation(conv);
    setMessages(conv.messages || []);
    if (conv.model_id) {
      const model = models.find(m => m.id === conv.model_id);
      if (model) setSelectedModel(model);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedModel || !user || isStreaming) return;

    const creditsNeeded = selectedModel.credits_per_message * (selectedModule?.credits_multiplier || 1);
    const currentCredits = user.credits || 0;

    if (currentCredits < creditsNeeded) {
      alert('积分不足，请充值后继续使用。');
      return;
    }

    const userMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputMessage('');
    setIsStreaming(true);

    try {
      let systemPrompt = '';
      if (selectedModule) {
        systemPrompt = `【重要约束】你现在是"${selectedModule.title}"专用助手。
${selectedModule.system_prompt}

【行为规范】
1. 你必须严格遵循上述角色定位和功能约束
2. 如果用户的问题超出此模块范围，请礼貌引导用户使用正确的功能模块
3. 保持专业、专注，不要偏离主题`;
      }

      // 调用后端函数，使用配置的API
      const { data: result } = await base44.functions.invoke('callAIModel', {
        model_id: selectedModel.id,
        messages: [...newMessages],
        system_prompt: systemPrompt || undefined
      });

      if (result.error) {
        throw new Error(result.error);
      }
      const response = result.response;

      const assistantMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
        credits_used: creditsNeeded,
      };

      const updatedMessages = [...newMessages, assistantMessage];
      setMessages(updatedMessages);

      const newBalance = currentCredits - creditsNeeded;
      await updateUserMutation.mutateAsync({
        credits: newBalance,
        total_credits_used: (user.total_credits_used || 0) + creditsNeeded,
      });

      await createTransactionMutation.mutateAsync({
        user_email: user.email,
        type: 'usage',
        amount: -creditsNeeded,
        balance_after: newBalance,
        description: `对话消耗 - ${selectedModel.name}${selectedModule ? ` - ${selectedModule.title}` : ''}`,
        model_used: selectedModel.name,
        prompt_module_used: selectedModule?.title,
      });

      const title = inputMessage.slice(0, 30) + (inputMessage.length > 30 ? '...' : '');

      if (currentConversation) {
        await updateConversationMutation.mutateAsync({
          id: currentConversation.id,
          data: {
            messages: updatedMessages,
            total_credits_used: (currentConversation.total_credits_used || 0) + creditsNeeded,
          }
        });
      } else {
        const newConv = await createConversationMutation.mutateAsync({
          title,
          model_id: selectedModel.id,
          prompt_module_id: selectedModule?.id,
          system_prompt: systemPrompt,
          messages: updatedMessages,
          total_credits_used: creditsNeeded,
        });
        setCurrentConversation(newConv);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Group conversations by date
  const groupedConversations = React.useMemo(() => {
    const groups = { today: [], yesterday: [], thisWeek: [], older: [] };
    conversations.forEach(conv => {
      const date = new Date(conv.updated_date || conv.created_date);
      if (isToday(date)) {
        groups.today.push(conv);
      } else if (isYesterday(date)) {
        groups.yesterday.push(conv);
      } else if (differenceInDays(new Date(), date) <= 7) {
        groups.thisWeek.push(conv);
      } else {
        groups.older.push(conv);
      }
    });
    return groups;
  }, [conversations]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-slate-100">
      {/* Left Sidebar - Conversation List */}
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col">
        {/* New Chat Button */}
        <div className="p-4">
          <Button
            onClick={() => handleStartNewChat()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2 h-11 rounded-lg font-medium"
          >
            <Plus className="h-5 w-5" />
            新建对话
          </Button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="px-3 pb-4">
              {/* All Conversations Header */}
              <div className="flex items-center justify-between px-2 py-2 text-sm text-slate-500">
                <span>全部对话</span>
                <ChevronDown className="h-4 w-4" />
              </div>

              {/* Today */}
              {groupedConversations.today.length > 0 && (
                <div className="mb-3">
                  <div className="px-2 py-1 text-xs text-slate-400">今天</div>
                  {groupedConversations.today.map(conv => (
                    <ConversationItem
                      key={conv.id}
                      conversation={conv}
                      isActive={currentConversation?.id === conv.id}
                      onClick={() => handleSelectConversation(conv)}
                    />
                  ))}
                </div>
              )}

              {/* Yesterday */}
              {groupedConversations.yesterday.length > 0 && (
                <div className="mb-3">
                  <div className="px-2 py-1 text-xs text-slate-400">昨天</div>
                  {groupedConversations.yesterday.map(conv => (
                    <ConversationItem
                      key={conv.id}
                      conversation={conv}
                      isActive={currentConversation?.id === conv.id}
                      onClick={() => handleSelectConversation(conv)}
                    />
                  ))}
                </div>
              )}

              {/* This Week */}
              {groupedConversations.thisWeek.length > 0 && (
                <div className="mb-3">
                  <div className="px-2 py-1 text-xs text-slate-400">本周</div>
                  {groupedConversations.thisWeek.map(conv => (
                    <ConversationItem
                      key={conv.id}
                      conversation={conv}
                      isActive={currentConversation?.id === conv.id}
                      onClick={() => handleSelectConversation(conv)}
                    />
                  ))}
                </div>
              )}

              {/* Older */}
              {groupedConversations.older.length > 0 && (
                <div className="mb-3">
                  <div className="px-2 py-1 text-xs text-slate-400">更早</div>
                  {groupedConversations.older.map(conv => (
                    <ConversationItem
                      key={conv.id}
                      conversation={conv}
                      isActive={currentConversation?.id === conv.id}
                      onClick={() => handleSelectConversation(conv)}
                    />
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Chat Header */}
        <div className="h-14 border-b border-slate-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-medium text-slate-800">
              {currentConversation?.title || '新对话'}
            </h1>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
              <Pencil className="h-4 w-4" />
            </Button>
          </div>

          {/* Model Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 h-9 px-3 border-slate-200">
                <Bot className="h-4 w-4 text-blue-600" />
                <span className="text-sm">{selectedModel?.name || '选择模型'}</span>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {models.map(model => (
                <DropdownMenuItem
                  key={model.id}
                  onClick={() => setSelectedModel(model)}
                  className="gap-2"
                >
                  <Bot className="h-4 w-4" />
                  {model.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="max-w-3xl mx-auto py-6 px-4">
              {messages.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="h-8 w-8 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-medium text-slate-800 mb-2">开始新对话</h2>
                  <p className="text-slate-500">请输入您的问题，AI将为您解答</p>
                </div>
              ) : (
                messages.map((message, index) => (
                  <ChatMessageItem
                    key={index}
                    message={message}
                    isStreaming={isStreaming && index === messages.length - 1 && message.role === 'assistant'}
                    user={user}
                  />
                ))
              )}
              {isStreaming && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex gap-4 py-4">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <Bot className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="flex gap-1">
                      <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                    <span className="text-sm">AI正在思考中...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </div>

        {/* Input Area */}
        <div className="border-t border-slate-200 p-4 bg-slate-50">
          <div className="max-w-3xl mx-auto">
            {/* Credits Info */}
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500 mb-3">
              <span>上一条消息消耗了 {messages[messages.length - 1]?.credits_used || 0} 积分，</span>
              <span>您还剩 <span className="text-blue-600 font-medium">{user.credits?.toLocaleString() || 0}</span> 积分</span>
            </div>

            {/* Input Box */}
            <div className="relative bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-end p-3">
                <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-slate-600 shrink-0">
                  <Paperclip className="h-5 w-5" />
                </Button>
                <Textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="请输入您的问题..."
                  disabled={isStreaming}
                  className="flex-1 min-h-[44px] max-h-[120px] resize-none border-0 focus-visible:ring-0 py-2 px-2 text-base placeholder:text-slate-400 bg-transparent"
                  rows={1}
                />
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-slate-400">{inputMessage.length}/2000</span>
                  <Button
                    data-send-button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isStreaming}
                    className="bg-blue-600 hover:bg-blue-700 h-9 px-4 gap-2"
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

            {/* Estimated Cost */}
            <div className="text-center mt-2">
              <span className="text-xs text-blue-600">⚡ 预计消耗 {selectedModel?.credits_per_message || 0}-{(selectedModel?.credits_per_message || 0) * 2} 积分</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Conversation Item Component
function ConversationItem({ conversation, isActive, onClick }) {
  const date = new Date(conversation.updated_date || conversation.created_date);
  const timeStr = format(date, 'HH:mm', { locale: zhCN });

  return (
    <div
      onClick={onClick}
      className={cn(
        "group flex items-start gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors",
        isActive ? "bg-blue-50" : "hover:bg-slate-50"
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={cn(
            "text-sm truncate",
            isActive ? "text-blue-700 font-medium" : "text-slate-700"
          )}>
            {conversation.title || '新对话'}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          >
            <Pencil className="h-3 w-3 text-slate-400" />
          </Button>
        </div>
        <span className="text-xs text-slate-400">{timeStr}</span>
      </div>
    </div>
  );
}

// 过滤掉AI思考过程的函数
function filterThinkingContent(content) {
  if (!content) return content;
  
  // 移除 [思考过程] 或 【思考过程】 及其后面的代码块
  let filtered = content.replace(/\[思考过程\][\s\S]*?```[\s\S]*?```/g, '');
  filtered = filtered.replace(/【思考过程】[\s\S]*?```[\s\S]*?```/g, '');
  
  // 移除 <think>...</think> 标签及内容
  filtered = filtered.replace(/<think>[\s\S]*?<\/think>/gi, '');
  
  // 移除 <thinking>...</thinking> 标签及内容
  filtered = filtered.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
  
  // 移除独立的 [思考过程] 段落（没有代码块的情况）
  filtered = filtered.replace(/\[思考过程\][^\[]*(?=\n\n|\n[^（\(]|$)/g, '');
  filtered = filtered.replace(/【思考过程】[^【]*(?=\n\n|\n[^（\(]|$)/g, '');
  
  // 清理多余的空行
  filtered = filtered.replace(/\n{3,}/g, '\n\n').trim();
  
  return filtered;
}

// Chat Message Item Component
function ChatMessageItem({ message, isStreaming, user }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const time = message.timestamp ? format(new Date(message.timestamp), 'HH:mm') : '';
  
  // 过滤AI回复中的思考过程
  const displayContent = isUser ? message.content : filterThinkingContent(message.content);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(displayContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div className="flex justify-end py-4">
        <div className="max-w-[80%]">
          <div className="bg-blue-600 text-white rounded-2xl rounded-tr-md px-4 py-3">
            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
          </div>
          <div className="text-xs text-slate-400 text-right mt-1">{time}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 py-4">
      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
        <Bot className="h-5 w-5 text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="prose prose-slate prose-sm max-w-none">
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed text-slate-700">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-4 mb-3 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-4 mb-3 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="leading-relaxed text-slate-700">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold text-slate-800">{children}</strong>,
              code: ({ inline, children }) =>
                inline ? (
                  <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono text-blue-600">{children}</code>
                ) : (
                  <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto my-3">
                    <code className="text-sm font-mono">{children}</code>
                  </pre>
                ),
              h1: ({ children }) => <h1 className="text-xl font-bold mb-3 mt-4 first:mt-0 text-slate-800">{children}</h1>,
              h2: ({ children }) => <h2 className="text-lg font-semibold mb-2 mt-3 first:mt-0 text-slate-800">{children}</h2>,
              h3: ({ children }) => <h3 className="text-base font-semibold mb-2 mt-3 first:mt-0 text-slate-800">{children}</h3>,
            }}
          >
            {displayContent}
          </ReactMarkdown>
          {isStreaming && (
            <span className="inline-block w-2 h-5 bg-blue-400 animate-pulse ml-1 rounded-sm" />
          )}
        </div>

        {/* Message Footer */}
        <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
          <span>{time}</span>
          {message.credits_used && <span>消耗 {message.credits_used} 积分</span>}
          <div className="flex items-center gap-1 ml-auto">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400 hover:text-slate-600"
              onClick={handleCopy}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-600">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-600">
              <ThumbsUp className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-600">
              <ThumbsDown className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}