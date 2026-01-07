import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { startOfDay, subDays, isAfter, isSameDay } from 'date-fns';

// Token 估算
const estimateTokens = (text) => Math.ceil((text || '').length / 4);

export function useChatState() {
  // 基础状态
  const [user, setUser] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  
  // 选择模式
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedConversations, setSelectedConversations] = useState([]);
  
  // 长文本警告
  const [longTextWarning, setLongTextWarning] = useState({
    open: false,
    estimatedTokens: 0,
    estimatedCredits: 0
  });
  
  // 文件上传
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [fileContents, setFileContents] = useState([]);
  
  // 标题编辑
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitleValue, setEditingTitleValue] = useState('');
  
  // 调试面板
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [debugInfo, setDebugInfo] = useState([]);
  
  // 导出
  const [isExporting, setIsExporting] = useState(false);
  const [canExport, setCanExport] = useState(false);
  
  // Refs
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);
  
  const queryClient = useQueryClient();
  
  // 加载用户
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        
        // 检查导出权限
        const membership = userData.membership_level || 'free';
        setCanExport(membership !== 'free');
      } catch (e) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);
  
  // 加载对话列表
  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => base44.entities.Conversation.list('-updated_date', 100),
    enabled: !!user,
    staleTime: 30000
  });
  
  // 加载系统设置
  const { data: systemSettings = [] } = useQuery({
    queryKey: ['system-settings'],
    queryFn: () => base44.entities.SystemSettings.list(),
    enabled: !!user
  });
  
  // 加载模型列表
  const { data: models = [] } = useQuery({
    queryKey: ['ai-models'],
    queryFn: () => base44.entities.AIModel.filter({ is_active: true }),
    enabled: !!user
  });
  
  // 解析设置
  const settings = useMemo(() => {
    const getSettingValue = (key, defaultValue) => {
      const setting = systemSettings.find(s => s.setting_key === key);
      return setting ? setting.setting_value : defaultValue;
    };
    
    return {
      maxInputCharacters: parseInt(getSettingValue('max_input_characters', '2000')) || 2000,
      longTextWarningThreshold: parseInt(getSettingValue('long_text_warning_threshold', '5000')) || 5000,
      enableLongTextWarning: getSettingValue('enable_long_text_warning', 'true') === 'true',
      showTokenUsageStats: getSettingValue('show_token_usage_stats', 'true') === 'true',
      chatBillingHint: getSettingValue('chat_billing_hint', ''),
      inputCreditsPerK: parseFloat(getSettingValue('input_credits_per_1k', '1')) || 1,
      outputCreditsPerK: parseFloat(getSettingValue('output_credits_per_1k', '5')) || 5
    };
  }, [systemSettings]);
  
  // 分组对话
  const groupedConversations = useMemo(() => {
    const today = moment().startOf('day');
    const yesterday = moment().subtract(1, 'day').startOf('day');
    const weekAgo = moment().subtract(7, 'days').startOf('day');
    
    const groups = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: []
    };
    
    conversations.forEach(conv => {
      const date = moment(conv.updated_date || conv.created_date);
      if (date.isSameOrAfter(today)) {
        groups.today.push(conv);
      } else if (date.isSameOrAfter(yesterday)) {
        groups.yesterday.push(conv);
      } else if (date.isSameOrAfter(weekAgo)) {
        groups.thisWeek.push(conv);
      } else {
        groups.older.push(conv);
      }
    });
    
    return groups;
  }, [conversations]);
  
  // 设置默认模型
  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      const defaultModel = models.find(m => m.is_default) || models[0];
      setSelectedModel(defaultModel);
    }
  }, [models, selectedModel]);
  
  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);
  
  // 开始新对话
  const handleStartNewChat = useCallback(() => {
    setCurrentConversation(null);
    setMessages([]);
    setInputMessage('');
    setUploadedFiles([]);
    setFileContents([]);
  }, []);
  
  // 选择对话
  const handleSelectConversation = useCallback(async (conv) => {
    setCurrentConversation(conv);
    setMessages(conv.messages || []);
    setEditingTitleValue(conv.title || '');
    
    // 设置对话使用的模型
    if (conv.model_id && models.length > 0) {
      const convModel = models.find(m => m.id === conv.model_id);
      if (convModel) setSelectedModel(convModel);
    }
  }, [models]);
  
  // 删除对话
  const handleDeleteConversation = useCallback(async (convId) => {
    try {
      await base44.entities.Conversation.delete(convId);
      queryClient.invalidateQueries(['conversations']);
      
      if (currentConversation?.id === convId) {
        handleStartNewChat();
      }
      toast.success('对话已删除');
    } catch (e) {
      toast.error('删除失败');
    }
  }, [currentConversation, queryClient, handleStartNewChat]);
  
  // 批量删除
  const handleBatchDelete = useCallback(async () => {
    try {
      await Promise.all(selectedConversations.map(id => base44.entities.Conversation.delete(id)));
      queryClient.invalidateQueries(['conversations']);
      setSelectedConversations([]);
      setIsSelectMode(false);
      
      if (selectedConversations.includes(currentConversation?.id)) {
        handleStartNewChat();
      }
      toast.success(`已删除 ${selectedConversations.length} 个对话`);
    } catch (e) {
      toast.error('批量删除失败');
    }
  }, [selectedConversations, currentConversation, queryClient, handleStartNewChat]);
  
  // 切换选择
  const toggleSelectConversation = useCallback((convId) => {
    setSelectedConversations(prev => 
      prev.includes(convId) 
        ? prev.filter(id => id !== convId)
        : [...prev, convId]
    );
  }, []);
  
  // 全选/取消全选
  const toggleSelectAll = useCallback(() => {
    if (selectedConversations.length === conversations.length) {
      setSelectedConversations([]);
    } else {
      setSelectedConversations(conversations.map(c => c.id));
    }
  }, [selectedConversations, conversations]);
  
  // 保存标题
  const handleSaveTitle = useCallback(async () => {
    if (!currentConversation || !editingTitleValue.trim()) return;
    
    try {
      await base44.entities.Conversation.update(currentConversation.id, {
        title: editingTitleValue.trim()
      });
      queryClient.invalidateQueries(['conversations']);
      setCurrentConversation(prev => ({ ...prev, title: editingTitleValue.trim() }));
      setIsEditingTitle(false);
    } catch (e) {
      toast.error('保存失败');
    }
  }, [currentConversation, editingTitleValue, queryClient]);
  
  // ========== 流式发送消息 ==========
  const handleSendMessage = useCallback(async (skipWarning = false) => {
    const messageText = inputMessage.trim();
    if (!messageText && fileContents.length === 0) return;
    
    // 长文本预警检查
    const estimatedInputTokens = estimateTokens(messageText);
    if (!skipWarning && settings.enableLongTextWarning && estimatedInputTokens > settings.longTextWarningThreshold) {
      const estimatedCredits = Math.ceil(estimatedInputTokens / 1000 * settings.inputCreditsPerK);
      setLongTextWarning({
        open: true,
        estimatedTokens: estimatedInputTokens,
        estimatedCredits
      });
      return;
    }
    
    // 构建完整消息
    let fullMessage = messageText;
    if (fileContents.length > 0) {
      const fileText = fileContents.map(f => `[文件: ${f.name}]\n${f.content}`).join('\n\n');
      fullMessage = fileText + (messageText ? `\n\n${messageText}` : '');
    }
    
    // 添加用户消息到界面
    const userMessage = {
      role: 'user',
      content: messageText,
      text: messageText,
      timestamp: new Date().toISOString(),
      attachments: uploadedFiles.map(f => ({ name: f.name, type: f.type }))
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setUploadedFiles([]);
    setFileContents([]);
    setIsStreaming(true);
    
    // 添加空的助手消息用于流式更新
    const assistantMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, assistantMessage]);
    
    try {
      // 获取系统提示词（如果有活跃的模块）
      let systemPrompt = '';
      const urlParams = new URLSearchParams(window.location.search);
      const moduleId = urlParams.get('module');
      if (moduleId) {
        try {
          const modules = await base44.entities.PromptModule.filter({ id: moduleId });
          if (modules.length > 0 && modules[0].system_prompt) {
            systemPrompt = modules[0].system_prompt;
          }
        } catch (e) {
          console.log('Module not found');
        }
      }
      
      // 调用后端函数（使用 SDK invoke）
      const result = await base44.functions.invoke('smartChatWithSearch', {
        conversation_id: currentConversation?.id,
        message: fullMessage,
        system_prompt: systemPrompt
      });
      
      if (result.data?.error) {
        throw new Error(result.data.error);
      }
      
      const responseData = result.data;
      
      // 更新助手消息
      setMessages(prev => {
        const newMessages = [...prev];
        const lastIdx = newMessages.length - 1;
        if (newMessages[lastIdx]?.role === 'assistant') {
          newMessages[lastIdx] = {
            ...newMessages[lastIdx],
            content: responseData.response,
            input_tokens: responseData.input_tokens,
            output_tokens: responseData.output_tokens,
            credits_used: responseData.credits_used
          };
        }
        return newMessages;
      });
      
      // 更新对话ID
      if (responseData.conversation_id && !currentConversation) {
        setCurrentConversation({ id: responseData.conversation_id });
      }
      
      queryClient.invalidateQueries(['conversations']);
      
    } catch (error) {
      console.error('Send message error:', error);
      toast.error(error.message || '发送失败');
      
      // 移除失败的助手消息
      setMessages(prev => {
        const newMessages = [...prev];
        if (newMessages[newMessages.length - 1]?.role === 'assistant' && !newMessages[newMessages.length - 1]?.content) {
          newMessages.pop();
        }
        return newMessages;
      });
    } finally {
      setIsStreaming(false);
    }
  }, [inputMessage, fileContents, uploadedFiles, currentConversation, settings, queryClient]);
  
  // 确认长文本
  const handleConfirmLongText = useCallback(() => {
    setLongTextWarning({ open: false, estimatedTokens: 0, estimatedCredits: 0 });
    handleSendMessage(true);
  }, [handleSendMessage]);
  
  // 键盘事件
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(false);
    }
  }, [handleSendMessage]);
  
  // 文件选择
  const handleFileSelect = useCallback(async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    setIsUploading(true);
    
    for (const file of files) {
      const fileEntry = {
        name: file.name,
        type: file.type,
        size: file.size,
        status: 'extracting'
      };
      setUploadedFiles(prev => [...prev, fileEntry]);
      
      try {
        // 上传文件
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        // 提取内容
        if (file.type.startsWith('image/')) {
          // 图片直接保存 URL
          setFileContents(prev => [...prev, { name: file.name, content: `[图片: ${file_url}]`, url: file_url }]);
        } else {
          // 文本/文档提取内容
          const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
            file_url,
            json_schema: { type: 'object', properties: { content: { type: 'string' } } }
          });
          
          if (extractResult.status === 'success') {
            setFileContents(prev => [...prev, { 
              name: file.name, 
              content: extractResult.output?.content || '无法提取内容' 
            }]);
          }
        }
        
        setUploadedFiles(prev => prev.map(f => 
          f.name === file.name ? { ...f, status: 'ready' } : f
        ));
      } catch (error) {
        setUploadedFiles(prev => prev.map(f => 
          f.name === file.name ? { ...f, status: 'error', error: error.message } : f
        ));
      }
    }
    
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);
  
  // 移除文件
  const removeUploadedFile = useCallback((index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setFileContents(prev => prev.filter((_, i) => i !== index));
  }, []);
  
  // 导出对话
  const handleExportConversation = useCallback(async () => {
    if (!currentConversation || !canExport) return;
    
    setIsExporting(true);
    try {
      const result = await base44.functions.invoke('exportConversations', {
        conversation_ids: [currentConversation.id],
        format: 'markdown'
      });
      
      if (result.data?.download_url) {
        window.open(result.data.download_url, '_blank');
      }
      toast.success('导出成功');
    } catch (e) {
      toast.error('导出失败');
    } finally {
      setIsExporting(false);
    }
  }, [currentConversation, canExport]);
  
  return {
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
    handleExportConversation
  };
}