import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// 加载配置
const CONFIG = {
  keywords: {
    must_search: [
      "天气", "股价", "汇率", "比赛", "新闻", "最新", "今天", "昨天", "现在", "当前",
      "近期", "帮我查", "搜索", "找一下", "谁是", "CEO", "总统", "总理", "价格",
      "多少钱", "排名", "评分", "统计", "数据", "政策", "任命", "辞职",
      "weather", "stock", "price", "news", "latest", "today", "current", "search",
      "2024年6月", "2024年7月", "2024年8月", "2024年9月", "2024年10月", "2024年11月", "2024年12月"
    ],
    no_search: [
      "写", "创作", "翻译", "改写", "代码", "编程", "算法", "数学", "计算",
      "解释", "是什么", "怎么", "为什么", "原理", "概念", "定义", "教程",
      "谢谢", "你好", "再见", "明白", "知道了", "继续", "还有吗",
      "write", "code", "programming", "algorithm", "math", "explain", "what is",
      "how to", "why", "principle", "concept", "definition", "tutorial",
      "已故", "历史上", "古代", "过去", "曾经"
    ]
  },
  thresholds: {
    high_confidence: 0.7,
    low_confidence: 0.5
  }
};

// 第一级：关键词快速过滤
const keywordFilter = (message) => {
  const startTime = Date.now();
  const lowerMessage = message.toLowerCase();
  
  // 检查必搜关键词
  for (const keyword of CONFIG.keywords.must_search) {
    if (lowerMessage.includes(keyword.toLowerCase())) {
      return {
        need_search: true,
        confidence: 0.95,
        reason: `命中必搜关键词: ${keyword}`,
        search_type: 'general',
        decision_level: 'keyword',
        decision_time_ms: Date.now() - startTime
      };
    }
  }
  
  // 检查禁搜关键词
  for (const keyword of CONFIG.keywords.no_search) {
    if (lowerMessage.includes(keyword.toLowerCase())) {
      return {
        need_search: false,
        confidence: 0.9,
        reason: `命中禁搜关键词: ${keyword}`,
        search_type: 'none',
        decision_level: 'keyword',
        decision_time_ms: Date.now() - startTime
      };
    }
  }
  
  return null; // 未命中，需要进入第二级
};

// 第二级：Haiku 语义分析
const haikuAnalysis = async (message, context) => {
  const startTime = Date.now();
  
  const prompt = `你是一个搜索需求分类专家。分析用户消息，判断是否需要联网搜索。

用户消息：${message}

${context ? `对话上下文：${context}` : ''}

判断规则：
【必须搜索】
- 实时信息（天气、股价、汇率、比赛结果、新闻）
- 时间敏感（今天、昨天、最新、现在、当前、近期、2024年5月后）
- 当前状态（谁是XXX的CEO、XXX还在职吗、最新政策）
- 事实核查（选举结果、人事任免、公司动态）
- 具体数据（价格、统计、排名、评分）
- 明确要求（帮我查、搜索一下、找一下）

【不需要搜索】
- 历史知识（2024年5月前的事件、已故人物、基础概念）
- 技术问答（编程、数学、算法、通用技术知识）
- 创作任务（写作、代码生成、翻译、改写）
- 分析推理（基于已有信息的分析）
- 概念解释（定义、原理、教程）
- 对话延续（基于历史对话的追问）
- 简短对话（问候、确认、感谢）

请以JSON格式返回：
{
  "need_search": true/false,
  "confidence": 0.0-1.0,
  "reason": "判断原因",
  "search_type": "news/data/verification/general/none"
}`;

  try {
    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!openRouterKey) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 500);
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openRouterKey}`
      },
      body: JSON.stringify({
        model: '@preset/claude-haiku-4.5',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.3
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // 尝试解析JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid JSON response');
    }
    
    const result = JSON.parse(jsonMatch[0]);
    
    return {
      ...result,
      decision_level: 'haiku',
      decision_time_ms: Date.now() - startTime
    };
    
  } catch (error) {
    console.error('Haiku analysis error:', error);
    // 降级策略：默认不搜索
    return {
      need_search: false,
      confidence: 0.3,
      reason: `Haiku分析失败，采用保守策略: ${error.message}`,
      search_type: 'none',
      decision_level: 'haiku',
      decision_time_ms: Date.now() - startTime
    };
  }
};

// 第三级：上下文联动判断
const contextAnalysis = async (message, conversationId, base44) => {
  const startTime = Date.now();
  
  if (!conversationId) {
    return null; // 无上下文信息
  }
  
  try {
    // 获取前一次的搜索决策
    const recentDecisions = await base44.asServiceRole.entities.SearchDecision.filter(
      { conversation_id: conversationId },
      '-created_date',
      5
    );
    
    if (recentDecisions.length === 0) {
      return null;
    }
    
    const lastDecision = recentDecisions[0];
    
    // 如果上一次使用了搜索，检查是否为追问
    if (lastDecision.search_executed) {
      const similarity = computeTextSimilarity(message, lastDecision.user_message);
      
      if (similarity > 0.75) {
        return {
          need_search: false,
          confidence: 0.8,
          reason: '检测到追问，可能已有上下文信息',
          search_type: 'none',
          decision_level: 'context',
          decision_time_ms: Date.now() - startTime
        };
      }
    }
    
    return null;
    
  } catch (error) {
    console.error('Context analysis error:', error);
    return null;
  }
};

// 计算文本相似度（简化版）
const computeTextSimilarity = (text1, text2) => {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { message, conversation_id, context } = await req.json();
    
    if (!message) {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }
    
    const totalStartTime = Date.now();
    let result = null;
    
    // 第一级：关键词过滤
    result = keywordFilter(message);
    
    // 第二级：Haiku 分析
    if (!result) {
      result = await haikuAnalysis(message, context);
    }
    
    // 第三级：上下文判断（仅在置信度较低时）
    if (result && result.confidence < CONFIG.thresholds.high_confidence) {
      const contextResult = await contextAnalysis(message, conversation_id, base44);
      if (contextResult && contextResult.confidence > result.confidence) {
        result = contextResult;
      }
    }
    
    // 保存决策记录
    const decision = await base44.asServiceRole.entities.SearchDecision.create({
      conversation_id,
      user_email: user.email,
      user_message: message,
      need_search: result.need_search,
      confidence: result.confidence,
      reason: result.reason,
      search_type: result.search_type,
      decision_level: result.decision_level,
      decision_time_ms: Date.now() - totalStartTime
    });
    
    // 更新每日统计
    const today = new Date().toISOString().split('T')[0];
    const stats = await base44.asServiceRole.entities.SearchStatistics.filter({ date: today });
    
    if (stats.length > 0) {
      const stat = stats[0];
      const updates = {
        total_requests: (stat.total_requests || 0) + 1,
        avg_decision_time_ms: ((stat.avg_decision_time_ms || 0) * stat.total_requests + result.decision_time_ms) / (stat.total_requests + 1)
      };
      
      if (result.decision_level === 'keyword') updates.keyword_decisions = (stat.keyword_decisions || 0) + 1;
      if (result.decision_level === 'haiku') updates.haiku_decisions = (stat.haiku_decisions || 0) + 1;
      if (result.decision_level === 'context') updates.context_decisions = (stat.context_decisions || 0) + 1;
      
      await base44.asServiceRole.entities.SearchStatistics.update(stat.id, updates);
    } else {
      await base44.asServiceRole.entities.SearchStatistics.create({
        date: today,
        total_requests: 1,
        keyword_decisions: result.decision_level === 'keyword' ? 1 : 0,
        haiku_decisions: result.decision_level === 'haiku' ? 1 : 0,
        context_decisions: result.decision_level === 'context' ? 1 : 0,
        avg_decision_time_ms: result.decision_time_ms
      });
    }
    
    return Response.json({
      decision_id: decision.id,
      ...result,
      total_time_ms: Date.now() - totalStartTime
    });
    
  } catch (error) {
    console.error('Search classifier error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});