import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, MessageSquare, Pencil, ChevronDown, Paperclip, Send, Loader2, Copy, RefreshCw, ThumbsUp, ThumbsDown, Bot, Trash2, CheckSquare, Square, Settings2, AlertTriangle, X, FileText, Image } from 'lucide-react';
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
import FileAttachmentCard from '../components/chat/FileAttachmentCard';
import TokenUsageStats from '../components/chat/TokenUsageStats';

// 估算token数量 (约4字符=1token)
function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export default function Chat() {
  const [user, setUser] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedConversations, setSelectedConversations] = useState([]);
  const [longTextWarning, setLongTextWarning] = useState({ open: false, estimatedCredits: 0, estimatedTokens: 0 });
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [fileContents, setFileContents] = useState([]);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitleValue, setEditingTitleValue] = useState('');
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [debugInfo, setDebugInfo] = useState([]);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();
  const location = useLocation();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        // 未登录用户由Layout处理重定向到Landing页面
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

  // 获取系统设置
  const { data: systemSettings = [] } = useQuery({
    queryKey: ['system-settings'],
    queryFn: () => base44.entities.SystemSettings.list(),
  });

  // 解析系统设置
  const getSettingValue = (key, defaultValue) => {
    const setting = systemSettings.find(s => s.setting_key === key);
    return setting ? setting.setting_value : defaultValue;
  };

  const longTextWarningEnabled = getSettingValue('enable_long_text_warning', 'true') === 'true';
  const longTextThreshold = parseInt(getSettingValue('long_text_warning_threshold', '5000')) || 5000;
  const inputCreditsPerK = parseInt(getSettingValue('input_credits_per_1k', '1')) || 1;
  const outputCreditsPerK = parseInt(getSettingValue('output_credits_per_1k', '5')) || 5;
  const chatBillingHint = getSettingValue('chat_billing_hint', '⚡ 按实际Token消耗计费：输入 {input}积分/1K tokens，输出 {output}积分/1K tokens')
    .replace('{input}', inputCreditsPerK)
    .replace('{output}', outputCreditsPerK);
  const showModelSelector = getSettingValue('chat_show_model_selector', 'true') === 'true';
  const maxInputCharacters = parseInt(getSettingValue('max_input_characters', '2000')) || 2000;
  const showTokenUsageStats = getSettingValue('show_token_usage_stats', 'true') === 'true';

  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      // 选择第一个激活的模型（智能路由将自动选择合适的模型）
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
    onSuccess: (newConv) => {
      // 创建后设置当前对话，并刷新列表
      setCurrentConversation(newConv);
      setMessages(newConv.messages || []);
      queryClient.invalidateQueries(['conversations']);
    },
  });

  const updateConversationMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Conversation.update(id, data),
    onSuccess: (updatedConv) => {
      // 更新后同步当前对话状态
      if (currentConversation?.id === updatedConv.id) {
        setCurrentConversation(updatedConv);
        setMessages(updatedConv.messages || []);
      }
      queryClient.invalidateQueries(['conversations']);
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: (id) => base44.entities.Conversation.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['conversations']),
  });

  // 删除单个对话
  const handleDeleteConversation = async (convId) => {
    if (currentConversation?.id === convId) {
      setCurrentConversation(null);
      setMessages([]);
    }
    await deleteConversationMutation.mutateAsync(convId);
  };

  // 批量删除对话
  const handleBatchDelete = async () => {
    for (const convId of selectedConversations) {
      if (currentConversation?.id === convId) {
        setCurrentConversation(null);
        setMessages([]);
      }
      await base44.entities.Conversation.delete(convId);
    }
    setSelectedConversations([]);
    setIsSelectMode(false);
    queryClient.invalidateQueries(['conversations']);
  };

  // 切换选择
  const toggleSelectConversation = (convId) => {
    setSelectedConversations(prev => 
      prev.includes(convId) 
        ? prev.filter(id => id !== convId)
        : [...prev, convId]
    );
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedConversations.length === conversations.length) {
      setSelectedConversations([]);
    } else {
      setSelectedConversations(conversations.map(c => c.id));
    }
  };

  const updateUserMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: (data) => setUser(prev => ({ ...prev, ...data })),
  });

  const createTransactionMutation = useMutation({
    mutationFn: (data) => base44.entities.CreditTransaction.create(data),
  });

  // 用于跟踪是否已处理过URL参数
  const processedModuleRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const moduleId = params.get('module_id');
    const autoStart = params.get('auto_start') === 'true';
    
    // 防止重复处理同一个模块
    if (moduleId && moduleId !== processedModuleRef.current && promptModules.length > 0 && models.length > 0 && user) {
      const module = promptModules.find(m => m.id === moduleId);
      if (module) {
        processedModuleRef.current = moduleId;
        handleStartNewChat(module);
        // 清除URL参数
        window.history.replaceState({}, '', createPageUrl('Chat'));
        
        if (autoStart && module.user_prompt_template) {
          setTimeout(() => {
            setInputMessage(module.user_prompt_template);
            setTimeout(() => {
              document.querySelector('[data-send-button]')?.click();
            }, 200);
          }, 200);
        } else if (autoStart) {
          setTimeout(() => {
            setInputMessage('请开始');
            setTimeout(() => {
              document.querySelector('[data-send-button]')?.click();
            }, 200);
          }, 200);
        }
      }
    }
  }, [location.search, promptModules, models, user]);

  const handleSaveTitle = async () => {
    if (!currentConversation || !editingTitleValue.trim()) {
      setIsEditingTitle(false);
      return;
    }
    await updateConversationMutation.mutateAsync({
      id: currentConversation.id,
      data: { title: editingTitleValue.trim() }
    });
    setIsEditingTitle(false);
  };

  const handleStartNewChat = (module = null) => {
    setCurrentConversation(null);
    setMessages([]);
    // 显式设置 selectedModule：只有传入 module 参数时才设置，否则必须为 null
    setSelectedModule(module ? module : null);
    setIsEditingTitle(false);
    
    if (module?.model_id && models.length > 0) {
      const moduleModel = models.find(m => m.id === module.model_id);
      if (moduleModel) {
        setSelectedModel(moduleModel);
      }
    }
  };

  const handleSelectConversation = async (conv) => {
    try {
      // 验证对话是否还存在
      const freshConv = await base44.entities.Conversation.get(conv.id);
      setCurrentConversation(freshConv);
      setMessages(freshConv.messages || []);
      // 切换对话时清空 selectedModule，确保不会意外加载系统提示词
      setSelectedModule(null);
      if (freshConv.model_id) {
        const model = models.find(m => m.id === freshConv.model_id);
        if (model) setSelectedModel(model);
      }
    } catch (e) {
      // 对话已被删除，刷新列表
      queryClient.invalidateQueries(['conversations']);
    }
  };

  const handleSendMessage = async (skipWarning = false) => {
    if ((!inputMessage.trim() && fileContents.length === 0) || !selectedModel || !user || isStreaming) return;

    const currentCredits = user.credits || 0;

    // 预估最低消耗（至少需要1积分）
    if (currentCredits < 1) {
      alert('积分不足，请充值后继续使用。');
      return;
    }

    // 构建系统提示词：只在使用提示词模块且是新对话的第一轮时使用
    // 严格检查：selectedModule 必须存在、是第一轮、且没有 currentConversation
    let systemPrompt = '';
    const isFirstTurn = messages.length === 0;
    const hasModule = selectedModule !== null && selectedModule !== undefined;
    const isNewConversation = !currentConversation;

    console.log('[Chat] ===== SYSTEM PROMPT DECISION =====');
    console.log('[Chat] isFirstTurn:', isFirstTurn, '(messages.length:', messages.length, ')');
    console.log('[Chat] hasModule:', hasModule, 'selectedModule:', selectedModule?.title || null);
    console.log('[Chat] isNewConversation:', isNewConversation, 'currentConversation:', currentConversation?.id || null);
    console.log('[Chat] Will use system prompt:', hasModule && isFirstTurn && isNewConversation);

    if (hasModule && isFirstTurn && isNewConversation) {
      systemPrompt = `【重要约束】你现在是"${selectedModule.title}"专用助手。
  ${selectedModule.system_prompt}

  【行为规范】
  1. 你必须严格遵循上述角色定位和功能约束
  2. 如果用户的问题超出此模块范围，请礼貌引导用户使用正确的功能模块
  3. 保持专业、专注，不要偏离主题`;
      console.log('[Chat] System prompt created, length:', systemPrompt.length, 'chars, ~', Math.ceil(systemPrompt.length / 4), 'tokens');
      console.log('[Chat] System prompt preview:', systemPrompt.slice(0, 200) + '...');
    } else {
      console.log('[Chat] No system prompt will be sent');
    }
    console.log('[Chat] ===================================');

    // 准备附件数据（包含文件大小信息）
    const attachments = await Promise.all(fileContents.map(async (f, idx) => {
      const file = uploadedFiles[idx];
      return {
        fileName: f.file_name,
        fileType: file?.type || f.media_type,
        fileSize: file?.size,
        contentType: f.content_type,
        content: f.content,
        mediaType: f.media_type,
        truncated: f.truncated,
        preview: f.content_type === 'text' ? f.content?.slice(0, 500) : null
      };
    }));

    // 长文本预警检查（包含系统提示词和附件内容）
    const fileTextContent = fileContents
      .filter(f => f.content_type === 'text')
      .map(f => f.content)
      .join('');
    const allContent = systemPrompt + messages.map(m => m.content || m.text).join('') + inputMessage + fileTextContent;
    const estimatedInputTokens = estimateTokens(allContent);

    if (!skipWarning && longTextWarningEnabled && estimatedInputTokens > longTextThreshold) {
      // 预估积分消耗 (输入 + 预估输出)
      const estimatedOutputTokens = Math.min(estimatedInputTokens * 0.5, 4000);
      const inputCost = Math.ceil(estimatedInputTokens / 1000) * inputCreditsPerK;
      const outputCost = Math.ceil(estimatedOutputTokens / 1000) * outputCreditsPerK;
      const totalEstimatedCredits = inputCost + outputCost;

      setLongTextWarning({
        open: true,
        estimatedCredits: totalEstimatedCredits,
        estimatedTokens: estimatedInputTokens
      });
      return;
    }

    // 构建用户消息（前端显示用，分开存储文字和附件）
    const userMessage = {
      role: 'user',
      text: inputMessage,
      attachments: attachments,
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputMessage('');
    setUploadedFiles([]);
    setFileContents([]);
    setIsStreaming(true);

    try {
      // 构建发送给API的消息内容（拼接文件内容）
      let messageToSend = inputMessage;
      const hasTextFiles = attachments.some(a => a.contentType === 'text');
      const hasImageFiles = attachments.some(a => a.contentType === 'image');
      
      if (hasTextFiles) {
        const textParts = attachments
          .filter(a => a.contentType === 'text')
          .map(a => `[用户上传的文件: ${a.fileName}]\n\n${a.content}${a.truncated ? '\n\n⚠️ 文件过大，已截取前半部分' : ''}`)
          .join('\n\n---\n\n');
        
        messageToSend = `${textParts}\n\n[用户的问题]\n${inputMessage}`;
      }
      
      let imageFiles = null;
      if (hasImageFiles) {
        imageFiles = attachments
          .filter(a => a.contentType === 'image')
          .map(a => ({
            file_name: a.fileName,
            media_type: a.mediaType,
            base64: a.content
          }));
      }
      
      // 使用智能搜索系统
      const { data: result } = await base44.functions.invoke('smartChatWithSearch', {
        conversation_id: currentConversation?.id,
        message: messageToSend,
        system_prompt: systemPrompt || undefined,
        image_files: imageFiles
      });

      if (result.error) {
        throw new Error(result.error);
      }
      const response = result.response;
      
      // 记录调试信息（仅管理员）
      if (user.role === 'admin') {
        setDebugInfo(prev => [...prev, {
          timestamp: new Date().toISOString(),
          message: inputMessage.slice(0, 50) + '...',
          model: result.model_used || selectedModel.name,
          task_type: result.task_classification?.task_type,
          model_tier: result.task_classification?.recommended_model_tier,
          input_tokens: result.input_tokens,
          output_tokens: result.output_tokens,
          compression_used: result.compression_used || false,
          total_messages: updatedMessages.length,
          context_type: result.context_type || '完整历史',
          compression_info: result.compression_info || null
        }]);
      }

      // 从API返回的实际token消耗计算积分
      const creditsUsed = result.credits_used || 1;
      const inputTokens = result.input_tokens || 0;
      const outputTokens = result.output_tokens || 0;
      const inputCredits = result.input_credits || 0;
      const outputCredits = result.output_credits || 0;

      // 检查积分是否足够
      if (currentCredits < creditsUsed) {
        alert(`积分不足！本次对话需要 ${creditsUsed} 积分，您当前只有 ${currentCredits} 积分。`);
        setMessages(messages); // 恢复消息
        return;
      }

      const assistantMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
        credits_used: creditsUsed,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
      };

      const updatedMessages = [...newMessages, assistantMessage];
      setMessages(updatedMessages);

      const newBalance = currentCredits - creditsUsed;
      await updateUserMutation.mutateAsync({
        credits: newBalance,
        total_credits_used: (user.total_credits_used || 0) + creditsUsed,
      });

      // 搜索信息（来自智能搜索系统）
      const searchInfo = result.search_info?.executed 
        ? ` [智能搜索${result.search_info.cache_hit ? '(缓存)' : ''}]` 
        : '';
      const webSearchUsed = result.search_info?.executed || false;
      
      await createTransactionMutation.mutateAsync({
        user_email: user.email,
        type: 'usage',
        amount: -creditsUsed,
        balance_after: newBalance,
        description: `对话消耗 - ${selectedModel.name}${selectedModule ? ` - ${selectedModule.title}` : ''} (输入:${inputTokens}tokens/${inputCredits}积分, 输出:${outputTokens}tokens/${outputCredits}积分)${searchInfo}`,
        model_used: selectedModel.name,
        prompt_module_used: selectedModule?.title,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        input_credits: inputCredits,
        output_credits: outputCredits,
        web_search_used: webSearchUsed,
      });

      const title = inputMessage.slice(0, 30) + (inputMessage.length > 30 ? '...' : '');

      if (currentConversation) {
        await updateConversationMutation.mutateAsync({
          id: currentConversation.id,
          data: {
            messages: updatedMessages,
            total_credits_used: (currentConversation.total_credits_used || 0) + creditsUsed,
          }
        });
      } else {
        // 创建新对话，onSuccess 回调会自动设置 currentConversation
        // 注意：不保存 system_prompt 到对话记录中，避免后续对话加载
        await createConversationMutation.mutateAsync({
          title,
          model_id: selectedModel.id,
          prompt_module_id: selectedModule?.id,
          messages: updatedMessages,
          total_credits_used: creditsUsed,
        });
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
      handleSendMessage(false);
    }
  };

  const handleConfirmLongText = () => {
    setLongTextWarning({ open: false, estimatedCredits: 0, estimatedTokens: 0 });
    handleSendMessage(true);
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setIsUploading(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        return { name: file.name, url: file_url, type: file.type, status: 'extracting' };
      });
      const uploaded = await Promise.all(uploadPromises);
      setUploadedFiles(prev => [...prev, ...uploaded]);
      
      // 提取文件内容
      const extractPromises = uploaded.map(async (file, idx) => {
        try {
          const { data } = await base44.functions.invoke('extractFileContent', {
            file_url: file.url,
            file_name: file.name,
            file_type: file.type
          });
          
          if (data.success) {
            // 更新状态为就绪
            setUploadedFiles(prev => prev.map((f, i) => 
              f.url === file.url ? { ...f, status: 'ready' } : f
            ));
            
            return {
              file_name: data.file_name,
              content_type: data.content_type,
              content: data.content,
              media_type: data.media_type,
              truncated: data.truncated
            };
          } else {
            throw new Error(data.error || 'Failed to extract content');
          }
        } catch (error) {
          console.error('文件内容提取失败:', error);
          setUploadedFiles(prev => prev.map((f, i) => 
            f.url === file.url ? { ...f, status: 'error', error: error.message } : f
          ));
          return null;
        }
      });
      
      const contents = await Promise.all(extractPromises);
      setFileContents(prev => [...prev, ...contents.filter(c => c !== null)]);
      
    } catch (error) {
      console.error('文件上传失败:', error);
      alert('文件上传失败，请重试');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeUploadedFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setFileContents(prev => prev.filter((_, i) => i !== index));
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
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
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

        {/* All Conversations Header with Manage Button - Outside ScrollArea */}
        <div className="flex items-center justify-between px-5 py-2 border-b border-slate-100">
          <span className="text-sm text-slate-500">全部对话</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsSelectMode(!isSelectMode);
              if (isSelectMode) {
                setSelectedConversations([]);
              }
            }}
            className="h-7 px-2 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            <Settings2 className="h-3.5 w-3.5 mr-1" />
            {isSelectMode ? '完成' : '管理'}
          </Button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="px-3 pb-4">
              
              {/* 批量操作栏 */}
              {isSelectMode && (
                <div className="flex items-center gap-2 px-2 py-2 mb-2 bg-slate-50 rounded-lg">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleSelectAll}
                    className="h-7 px-2 text-xs"
                  >
                    {selectedConversations.length === conversations.length ? '取消全选' : '全选'}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBatchDelete}
                    disabled={selectedConversations.length === 0}
                    className="h-7 w-7 p-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              {/* Today */}
              {groupedConversations.today.length > 0 && (
                <div className="mb-3">
                  <div className="px-2 py-1 text-xs text-slate-400">今天</div>
                  {groupedConversations.today.map(conv => (
                    <ConversationItem
                      key={conv.id}
                      conversation={conv}
                      isActive={currentConversation?.id === conv.id}
                      isSelectMode={isSelectMode}
                      isSelected={selectedConversations.includes(conv.id)}
                      onSelect={() => toggleSelectConversation(conv.id)}
                      onClick={() => !isSelectMode && handleSelectConversation(conv)}
                      onDelete={() => handleDeleteConversation(conv.id)}
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
                      isSelectMode={isSelectMode}
                      isSelected={selectedConversations.includes(conv.id)}
                      onSelect={() => toggleSelectConversation(conv.id)}
                      onClick={() => !isSelectMode && handleSelectConversation(conv)}
                      onDelete={() => handleDeleteConversation(conv.id)}
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
                      isSelectMode={isSelectMode}
                      isSelected={selectedConversations.includes(conv.id)}
                      onSelect={() => toggleSelectConversation(conv.id)}
                      onClick={() => !isSelectMode && handleSelectConversation(conv)}
                      onDelete={() => handleDeleteConversation(conv.id)}
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
                      isSelectMode={isSelectMode}
                      isSelected={selectedConversations.includes(conv.id)}
                      onSelect={() => toggleSelectConversation(conv.id)}
                      onClick={() => !isSelectMode && handleSelectConversation(conv)}
                      onDelete={() => handleDeleteConversation(conv.id)}
                    />
                  ))}
                </div>
              )}

              {/* Empty state */}
              {conversations.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm">
                  暂无对话记录
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={cn("flex-1 flex flex-col bg-white", showDebugPanel && "mr-80")}>
        {/* Chat Header */}
        <div className="h-14 border-b border-slate-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            {isEditingTitle && currentConversation ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editingTitleValue}
                  onChange={(e) => setEditingTitleValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveTitle();
                    } else if (e.key === 'Escape') {
                      setIsEditingTitle(false);
                    }
                  }}
                  autoFocus
                  className="text-lg font-medium text-slate-800 border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleSaveTitle}
                  className="text-blue-600 hover:text-blue-700"
                >
                  保存
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsEditingTitle(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  取消
                </Button>
              </div>
            ) : (
              <>
                <h1 className="text-lg font-medium text-slate-800">
                  {currentConversation?.title || '新对话'}
                </h1>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-slate-400 hover:text-slate-600"
                  onClick={() => {
                    if (currentConversation) {
                      setEditingTitleValue(currentConversation.title || '');
                      setIsEditingTitle(true);
                    }
                  }}
                  disabled={!currentConversation}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
              {/* Debug Panel Toggle (Admin Only) */}
              {user.role === 'admin' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDebugPanel(!showDebugPanel)}
                  className={cn(
                    "h-9 px-3 gap-2",
                    showDebugPanel && "bg-violet-50 border-violet-300 text-violet-700"
                  )}
                >
                  <Settings2 className="h-4 w-4" />
                  调试
                </Button>
              )}
            </div>
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
                  <MessageBubble
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

        {/* Token Usage Statistics */}
        {showTokenUsageStats && messages.length > 0 && (
          <TokenUsageStats messages={messages} currentModel={selectedModel} />
        )}

        {/* Input Area */}
        <div className="border-t border-slate-200 p-4 bg-slate-50">
          <div className="max-w-3xl mx-auto">
            {/* Credits Info */}
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500 mb-3">
              <span>上一条消息消耗了 {messages[messages.length - 1]?.credits_used || 0} 积分，</span>
              <span>您还剩 <span className="text-blue-600 font-medium">{user.credits?.toLocaleString() || 0}</span> 积分</span>
            </div>

            {/* Uploaded Files Preview */}
            {uploadedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {uploadedFiles.map((file, index) => {
                  const content = fileContents[index];
                  return (
                    <div key={index} className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-1.5 text-sm">
                      {file.type?.startsWith('image/') ? (
                        <Image className="h-4 w-4 text-blue-500" />
                      ) : (
                        <FileText className="h-4 w-4 text-blue-500" />
                      )}
                      <span className="text-slate-600 max-w-[150px] truncate">{file.name}</span>
                      {file.status === 'extracting' && (
                        <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />
                      )}
                      {file.status === 'ready' && (
                        <span className="text-xs text-green-600">✓</span>
                      )}
                      {file.status === 'error' && (
                        <span className="text-xs text-red-600" title={file.error}>⚠</span>
                      )}
                      <button
                        onClick={() => removeUploadedFile(index)}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Input Box */}
            <div className="relative bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-end p-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.txt,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 text-slate-400 hover:text-slate-600 shrink-0"
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
                  onKeyDown={handleKeyDown}
                  placeholder="请输入您的问题..."
                  disabled={isStreaming}
                  className="flex-1 min-h-[44px] max-h-[120px] resize-none border-0 focus-visible:ring-0 py-2 px-2 text-base placeholder:text-slate-400 bg-transparent"
                  rows={1}
                />
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-slate-400">{inputMessage.length}/{maxInputCharacters}</span>
                  <Button
                    data-send-button
                    onClick={() => handleSendMessage(false)}
                    disabled={(!inputMessage.trim() && fileContents.length === 0) || isStreaming || uploadedFiles.some(f => f.status === 'extracting')}
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

            {/* Token Billing Info */}
            <div className="text-center mt-2">
              <span className="text-xs text-slate-500 whitespace-pre-line">{chatBillingHint}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Long Text Warning Dialog */}
      <AlertDialog open={longTextWarning.open} onOpenChange={(open) => setLongTextWarning(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              检测到长文本
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>您的输入内容较长（约 {longTextWarning.estimatedTokens.toLocaleString()} tokens），本次处理预计消耗约 <span className="font-semibold text-amber-600">{longTextWarning.estimatedCredits}</span> 积分。</p>
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
      
      {/* Debug Panel (Admin Only) */}
      {user.role === 'admin' && showDebugPanel && (
        <div className="w-80 border-l border-slate-200 bg-slate-50 fixed right-0 top-16 bottom-0 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                开发者调试面板
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDebugInfo([])}
                className="h-7 w-7 text-slate-400"
                title="清空日志"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            
            {debugInfo.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">暂无调试信息</p>
            ) : (
              <div className="space-y-3">
                {debugInfo.slice().reverse().map((info, idx) => (
                  <div key={idx} className="bg-white rounded-lg p-3 border border-slate-200 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">
                        {format(new Date(info.timestamp), 'HH:mm:ss')}
                      </span>
                      <div className="flex items-center gap-1">
                        {info.compression_used && (
                          <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                            压缩
                          </span>
                        )}
                        <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                          {info.total_messages}条
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-slate-600 font-medium truncate">
                      {info.message}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-slate-400">模型:</span>
                        <div className="font-medium text-slate-700 mt-0.5">
                          {info.model_tier === 'haiku' && '⚡ Haiku'}
                          {info.model_tier === 'sonnet' && '🎯 Sonnet'}
                          {info.model_tier === 'opus' && '💎 Opus'}
                          {!info.model_tier && info.model}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400">任务类型:</span>
                        <div className="font-medium text-slate-700 mt-0.5 truncate" title={info.task_type}>
                          {info.task_type || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400">输入Tokens:</span>
                        <div className="font-medium text-slate-700 mt-0.5">
                          {info.input_tokens?.toLocaleString() || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400">输出Tokens:</span>
                        <div className="font-medium text-slate-700 mt-0.5">
                          {info.output_tokens?.toLocaleString() || 'N/A'}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400">上下文模式:</span>
                        <div className="font-medium text-slate-700 mt-0.5">
                          {info.context_type || '完整历史'}
                        </div>
                      </div>
                      
                      {/* 压缩信息 */}
                      {info.compression_info && (
                        <div className="col-span-2 pt-2 border-t border-slate-100">
                          <span className="text-slate-400">压缩详情:</span>
                          <div className="mt-1 space-y-0.5 text-green-700">
                            <div>压缩前: {info.compression_info.before_tokens.toLocaleString()} tokens</div>
                            <div>压缩后: {info.compression_info.after_tokens.toLocaleString()} tokens</div>
                            <div className="font-semibold">
                              节省: {info.compression_info.saved_tokens.toLocaleString()} tokens 
                              ({info.compression_info.compression_ratio}%)
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Conversation Item Component
function ConversationItem({ conversation, isActive, isSelectMode, isSelected, onSelect, onClick, onDelete }) {
  const date = new Date(conversation.updated_date || conversation.created_date);
  const timeStr = format(date, 'HH:mm', { locale: zhCN });

  return (
    <div
      onClick={() => isSelectMode ? onSelect() : onClick()}
      className={cn(
        "group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all",
        isActive && !isSelectMode ? "bg-blue-50 border border-blue-200" : "hover:bg-slate-50",
        isSelected && "bg-red-50 border border-red-200"
      )}
    >
      {/* Checkbox in select mode */}
      {isSelectMode && (
        <div className="shrink-0">
          {isSelected ? (
            <CheckSquare className="h-4 w-4 text-red-500" />
          ) : (
            <Square className="h-4 w-4 text-slate-300" />
          )}
        </div>
      )}
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={cn(
            "text-sm truncate block",
            isActive && !isSelectMode ? "text-blue-700 font-medium" : "text-slate-700"
          )}>
            {conversation.title || '新对话'}
          </span>
        </div>
        <span className="text-xs text-slate-400">{timeStr}</span>
      </div>

      {/* Delete button - always visible when not in select mode */}
      {!isSelectMode && (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => { 
            e.stopPropagation(); 
            onDelete(); 
          }}
          className="h-7 w-7 shrink-0 text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

// 过滤掉AI思考过程的函数
function filterThinkingContent(content) {
  if (!content) return content;
  
  let filtered = content;
  
  // 只过滤明确的思考标签
  filtered = filtered.replace(/<think>[\s\S]*?<\/think>/gi, '');
  filtered = filtered.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
  
  // 清理多余空行
  filtered = filtered.replace(/\n{3,}/g, '\n\n').trim();
  
  return filtered || content; // 如果过滤后为空，返回原内容
}

// Message Bubble Component
function MessageBubble({ message, isStreaming, user }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const time = message.timestamp ? format(new Date(message.timestamp), 'HH:mm') : '';
  
  const displayContent = isUser ? (message.text || message.content) : filterThinkingContent(message.content);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(displayContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div className="flex justify-end py-4">
        <div className="max-w-[80%] space-y-2">
          {/* 用户文字消息 */}
          {displayContent && (
            <div className="bg-blue-600 text-white rounded-2xl rounded-tr-md px-4 py-3">
              <p className="whitespace-pre-wrap leading-relaxed">{displayContent}</p>
            </div>
          )}
          
          {/* 附件卡片 */}
          {message.attachments?.length > 0 && (
            <div className="space-y-2">
              {message.attachments.map((attachment, idx) => (
                <FileAttachmentCard key={idx} attachment={attachment} />
              ))}
            </div>
          )}
          
          <div className="text-xs text-slate-400 text-right mt-1">{time}</div>
        </div>
      </div>
    );
  }

  // 如果没有内容，显示提示
  if (!displayContent) {
    return (
      <div className="flex gap-4 py-4">
        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
          <Bot className="h-5 w-5 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-slate-400 italic">AI 响应内容为空</div>
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
            <span>{time}</span>
          </div>
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
              pre: ({ children }) => (
                <pre className="bg-slate-100 text-slate-800 p-4 rounded-lg overflow-x-auto my-3 border border-slate-200 whitespace-pre-wrap">
                  {children}
                </pre>
              ),
              code: ({ inline, className, children, ...props }) => {
                // 如果是在 pre 标签内（代码块），使用简单样式
                if (!inline && className) {
                  return <code className="text-sm font-mono text-slate-800">{children}</code>;
                }
                // 行内代码
                return (
                  <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono text-blue-600">{children}</code>
                );
              },
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
          {message.credits_used && (
            <span title={message.input_tokens ? `输入: ${message.input_tokens} tokens, 输出: ${message.output_tokens} tokens` : ''}>
              消耗 {message.credits_used} 积分
              {message.input_tokens && <span className="text-slate-300 ml-1">({message.input_tokens}+{message.output_tokens} tokens)</span>}
            </span>
          )}
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