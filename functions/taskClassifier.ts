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

// 关键词匹配规则
const KEYWORD_PATTERNS = {
  summarization: ['总结', '摘要', '概括', '简述', 'summarize', 'summary'],
  intent_detection: ['意图', '想要', '目的', '需求', 'intent', 'purpose'],
  simple_qa: ['是什么', '什么是', '解释', '定义', 'what is', 'explain'],
  content_creation: ['写', '创作', '生成', '编写', 'write', 'create', 'generate'],
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
  
  // 消息长度因素
  if (message.length > 500) complexity += 1;
  if (message.length > 1000) complexity += 1;
  
  // 对话轮次因素
  if (conversationLength > 10) complexity += 1;
  
  // 特殊字符和结构因素
  if (message.match(/```[\s\S]*```/)) complexity += 2; // 代码块
  if (message.match(/[一二三四五六七八九十、]+[\s\S]*/)) complexity += 1; // 列表结构
  if (message.includes('专业') || message.includes('深入') || message.includes('详细')) complexity += 1;
  
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
    
    // 获取对话长度
    let conversationLength = 0;
    if (conversation_id) {
      const convs = await base44.asServiceRole.entities.Conversation.filter({ id: conversation_id });
      if (convs.length > 0) {
        conversationLength = (convs[0].messages || []).length / 2;
      }
    }
    
    // 步骤1：基于关键词的任务分类
    const taskType = classifyTaskByKeywords(message);
    
    // 步骤2：计算复杂度
    const complexity = calculateComplexity(message, conversationLength);
    
    // 步骤3：选择基础模型
    let recommendedModel = selectModelForTask(taskType);
    
    // 步骤4：根据复杂度调整模型选择
    if (complexity >= 4 && recommendedModel === 'haiku') {
      recommendedModel = 'sonnet';
    } else if (complexity >= 5 && recommendedModel === 'sonnet') {
      recommendedModel = 'opus';
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
      reason: `任务类型: ${taskType}, 复杂度: ${complexity}, 对话轮次: ${conversationLength}`
    });
    
  } catch (error) {
    console.error('Task classifier error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});