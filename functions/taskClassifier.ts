import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// 任务类型定义
const TASK_TYPES = {
  // Haiku 适用任务 (低成本)
  SUMMARIZATION: 'summarization',
  INTENT_DETECTION: 'intent_detection',
  KEYWORD_EXTRACTION: 'keyword_extraction',
  SIMPLE_QA: 'simple_qa',
  CLASSIFICATION: 'classification',
  
  // Sonnet 适用任务 (中等成本，主力模型)
  CONTENT_CREATION: 'content_creation',
  CONTENT_EXPANSION: 'content_expansion',
  DIALOGUE: 'dialogue',
  EDITING: 'editing',
  TRANSLATION: 'translation',
  
  // Opus 适用任务 (高成本，复杂任务)
  COMPLEX_ANALYSIS: 'complex_analysis',
  PROFESSIONAL_WRITING: 'professional_writing',
  CODE_GENERATION: 'code_generation',
  RESEARCH: 'research'
};

// 模型选择规则
const MODEL_SELECTION_RULES = {
  'haiku': ['summarization', 'intent_detection', 'keyword_extraction', 'simple_qa', 'classification'],
  'sonnet': ['content_creation', 'content_expansion', 'dialogue', 'editing', 'translation'],
  'opus': ['complex_analysis', 'professional_writing', 'code_generation', 'research']
};

// 续写关键词列表
const CONTINUATION_KEYWORDS = [
  '继续', '接着写', '下一章', '下一段', '继续写', '往下写', '继续创作',
  '再写一段', '接下去', '下一部分', '接下来', '后续', '续写',
  'continue', 'keep going', 'go on', 'next chapter', 'next part',
  'keep writing', 'write more', 'continue writing'
];

// 创作类任务类型（需要记录到会话上下文）
const CREATIVE_TASK_TYPES = [
  'content_creation', 'content_expansion', 'professional_writing', 
  'code_generation', 'complex_analysis'
];

// 关键词匹配规则
const KEYWORD_PATTERNS = {
  summarization: ['总结', '摘要', '概括', '简述', 'summarize', 'summary'],
  intent_detection: ['意图', '想要', '目的', '需求', 'intent', 'purpose'],
  simple_qa: ['是什么', '什么是', '解释', '定义', 'what is', 'explain'],
  content_creation: ['写', '创作', '生成', '编写', '制作', '拍摄', '视频', '小说', '文章', '故事', '剧本', '脚本', 'write', 'create', 'generate', 'video', 'novel', 'story', 'script'],
  content_expansion: ['扩展', '详细', '展开', '补充', 'expand', 'elaborate', 'detail'],
  editing: ['修改', '优化', '改进', '润色', 'edit', 'improve', 'refine'],
  translation: ['翻译', '转换', 'translate', 'convert'],
  complex_analysis: ['分析', '研究', '评估', '深入', 'analyze', 'research', 'evaluate'],
  code_generation: ['代码', '编程', '函数', '算法', 'code', 'program', 'function', 'algorithm'],
  professional_writing: ['报告', '论文', '方案', '计划', 'report', 'proposal', 'plan']
};

// 简单的任务分类（基于关键词匹配）
const classifyTaskByKeywords = (message) => {
  const lowerMessage = message.toLowerCase();
  
  for (const [taskType, keywords] of Object.entries(KEYWORD_PATTERNS)) {
    if (keywords.some(kw => lowerMessage.includes(kw))) {
      return taskType;
    }
  }
  
  // 默认返回对话类型
  return 'dialogue';
};

// 根据任务类型选择模型
const selectModelForTask = (taskType) => {
  for (const [model, tasks] of Object.entries(MODEL_SELECTION_RULES)) {
    if (tasks.includes(taskType)) {
      return model;
    }
  }
  return 'sonnet'; // 默认使用 Sonnet
};

// 计算消息复杂度
const calculateComplexity = (message, conversationLength) => {
  let complexity = 0;
  
  // 消息长度因素（降低阈值，增加权重）
  if (message.length > 300) complexity += 1;
  if (message.length > 800) complexity += 2;
  if (message.length > 1500) complexity += 1;
  
  // 对话轮次因素
  if (conversationLength > 10) complexity += 1;
  
  // 特殊字符和结构因素
  if (message.match(/```[\s\S]*```/)) complexity += 2; // 代码块
  if (message.match(/[一二三四五六七八九十、]+[\s\S]*/)) complexity += 1; // 列表结构
  
  // 多个问题标记（表示复杂查询）
  const questionCount = (message.match(/[？?]/g) || []).length;
  if (questionCount >= 3) complexity += 2;
  if (questionCount >= 5) complexity += 1;
  
  // 关键词提示复杂度
  if (message.includes('专业') || message.includes('深入') || message.includes('详细')) complexity += 1;
  if (message.includes('全面') || message.includes('系统') || message.includes('完整')) complexity += 1;
  
  return complexity;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { message, conversation_id } = await req.json();
    
    if (!message) {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }
    
    // 获取会话上下文
    let conversationLength = 0;
    let sessionTaskType = null;
    let conversation = null;
    
    if (conversation_id) {
      const convs = await base44.asServiceRole.entities.Conversation.filter({ id: conversation_id });
      if (convs.length > 0) {
        conversation = convs[0];
        conversationLength = (conversation.messages || []).length / 2;
        sessionTaskType = conversation.session_task_type;
      }
    }
    
    // 检查是否是续写指令
    const lowerMessage = message.toLowerCase();
    const isContinuation = CONTINUATION_KEYWORDS.some(kw => 
      lowerMessage.includes(kw.toLowerCase())
    );
    
    console.log('[taskClassifier] isContinuation:', isContinuation, 'sessionTaskType:', sessionTaskType);
    
    // 【优化1】稳定性原则：多轮对话中尽量保持模型一致
    // 如果已有会话任务类型，优先继承（不仅限于续写指令）
    let taskType;
    let shouldUpdateSessionTaskType = false;
    let inheritedFromSession = false;
    
    // 判断是否应该继承会话任务类型
    // 条件：1. 是续写指令 2. 对话轮次>=3 且 有会话任务类型（保持上下文连贯）
    const shouldInheritTaskType = sessionTaskType && (
      isContinuation || 
      conversationLength >= 3  // 多轮对话中保持稳定
    );
    
    if (shouldInheritTaskType) {
      taskType = sessionTaskType;
      inheritedFromSession = true;
      console.log('[taskClassifier] 继承会话任务类型:', taskType, '(对话轮次:', conversationLength, ')');
    } else {
      // 否则正常判断任务类型
      taskType = classifyTaskByKeywords(message);
      
      // 如果是创作类任务，需要更新会话的 session_task_type
      if (CREATIVE_TASK_TYPES.includes(taskType)) {
        shouldUpdateSessionTaskType = true;
      }
    }
    
    // 步骤2：计算复杂度
    const complexity = calculateComplexity(message, conversationLength);
    
    // 步骤3：选择基础模型
    let recommendedModel = selectModelForTask(taskType);
    
    // 【优化2】降低模型切换的激进程度
    // 只在复杂度显著提升时才升级模型，避免频繁切换
    if (complexity >= 5 && recommendedModel === 'haiku') {
      recommendedModel = 'sonnet';
    } else if (complexity >= 7 && recommendedModel === 'sonnet') {
      recommendedModel = 'opus';
    }
    
    // 【优化3】如果是继承的任务类型，优先保持原模型级别
    // 这确保了复杂创作任务不会因为简单的续写指令而降级模型
    if (inheritedFromSession && conversationLength >= 3) {
      // 保持至少 sonnet 级别，确保复杂指令能被正确处理
      if (recommendedModel === 'haiku') {
        recommendedModel = 'sonnet';
        console.log('[taskClassifier] 保持模型稳定性，升级到 sonnet');
      }
    }
    
    // 步骤5：映射到实际模型ID
    const modelMap = {
      'haiku': 'claude-3-5-haiku-20241022',
      'sonnet': 'claude-sonnet-4-20250514',
      'opus': 'claude-opus-4-20250514'
    };
    
    return Response.json({
      task_type: taskType,
      complexity_score: complexity,
      recommended_model: recommendedModel,
      model_id: modelMap[recommendedModel],
      confidence: complexity >= 3 ? 0.7 : 0.9,
      reason: `任务类型: ${taskType}, 复杂度: ${complexity}, 对话轮次: ${conversationLength}${isContinuation ? ' (续写)' : ''}${inheritedFromSession ? ' (继承)' : ''}`,
      should_update_session_task_type: shouldUpdateSessionTaskType,
      is_continuation: isContinuation,
      inherited_from_session: inheritedFromSession
    });
    
  } catch (error) {
    console.error('Task classifier error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});