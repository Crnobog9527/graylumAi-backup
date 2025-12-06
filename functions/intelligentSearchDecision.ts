import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user_message, conversation_history = [], conversation_id = null } = await req.json();

    if (!user_message) {
      return Response.json({ error: 'user_message is required' }, { status: 400 });
    }

    // ============ 第一层：URL 检测（最高优先级）============
    const urlPattern = /https?:\/\/[^\s]+/i;
    if (urlPattern.test(user_message)) {
      return Response.json({
        should_search: false,
        should_fetch: true,
        reason: 'URL detected - will use web_fetch instead',
        layer: 'url_detection'
      });
    }

    // ============ 第二层：显式搜索请求 ============
    const explicitSearchKeywords = [
      '搜一下', '搜索', '查一下', '查找', '找一下', '帮我查', 
      '联网查', '上网查', '搜搜', '查查', '百度一下', '谷歌一下'
    ];
    const hasExplicitRequest = explicitSearchKeywords.some(kw => user_message.includes(kw));
    
    if (hasExplicitRequest) {
      return Response.json({
        should_search: true,
        reason: 'User explicitly requested search',
        layer: 'explicit_request'
      });
    }

    // ============ 第三层：拒绝关键词（不需要搜索）============
    const rejectKeywords = {
      // 创作类
      creative: ['帮我写', '写一个', '写一段', '写个', '创作', '编写', '故事', '诗歌', '文案', '邮件', '总结一下'],
      // 代码类
      code: ['代码', '函数', '算法', '调试', 'bug', '实现', '编程'],
      programming: ['python', 'javascript', 'java', 'c++', 'html', 'css', 'react', 'vue', 'node'],
      // 解释说明类
      explanation: ['什么是', '如何理解', '解释', '原理', '概念', '定义', '为什么会', '怎么回事'],
      // 比较分析类（非实时）
      analysis: ['比较一下', '对比', '区别', '优缺点', '哪个好'],
      // 方法指导类
      howto: ['如何', '怎么做', '怎样', '步骤', '方法', '教程', '指南']
    };

    for (const [category, keywords] of Object.entries(rejectKeywords)) {
      if (keywords.some(kw => user_message.toLowerCase().includes(kw.toLowerCase()))) {
        return Response.json({
          should_search: false,
          reason: `Rejected by category: ${category}`,
          layer: 'keyword_filter',
          matched_keyword: keywords.find(kw => user_message.toLowerCase().includes(kw.toLowerCase()))
        });
      }
    }

    // ============ 第四层：强制搜索关键词（需要搜索）============
    const forceSearchKeywords = {
      // 时间相关
      time: ['今天', '昨天', '最近', '现在', '当前', '最新', '刚刚', '本周', '本月', '今年', '这周', '这个月'],
      // 实时信息
      realtime: ['天气', '股价', '汇率', '新闻', '比分', '赛况', '价格', '行情'],
      // 状态查询
      status: ['还是', '是否还', '现任', '目前', '依然', '仍然', '是不是还', '现在是'],
      // 时效性
      temporal: ['几岁', '多大', '年龄', '哪年', '什么时候']
    };

    for (const [category, keywords] of Object.entries(forceSearchKeywords)) {
      if (keywords.some(kw => user_message.includes(kw))) {
        return Response.json({
          should_search: true,
          reason: `Triggered by category: ${category}`,
          layer: 'trigger_keywords',
          matched_keyword: keywords.find(kw => user_message.includes(kw))
        });
      }
    }

    // ============ 第五层：敏感话题 + 时效性检测 ============
    const sensitiveTopics = [
      // 政治人物
      '总统', '总理', '主席', '首相', '总书记', '国家领导人', '部长', '市长', '省长',
      // 公司高管
      'CEO', 'CTO', 'CFO', '董事长', '总裁', '创始人',
      // 特定人物
      '马斯克', '扎克伯格', '库克', '比尔盖茨', '巴菲特'
    ];

    const temporalIndicators = ['现在', '当前', '目前', '最新', '是谁', '是什么'];
    
    const hasSensitiveTopic = sensitiveTopics.some(topic => user_message.includes(topic));
    const hasTemporal = temporalIndicators.some(ind => user_message.includes(ind));
    
    if (hasSensitiveTopic && hasTemporal) {
      return Response.json({
        should_search: true,
        reason: 'Sensitive topic with temporal indicator',
        layer: 'sensitive_topic'
      });
    }

    // ============ 第六层：上下文记忆（会话追问检测）============
    if (conversation_id && conversation_history.length >= 2) {
      const lastMessage = conversation_history[conversation_history.length - 2];
      const lastDecision = lastMessage?.search_decision;
      
      if (lastDecision?.should_search) {
        // 计算词汇重叠度
        const extractKeywords = (text) => {
          const words = text.match(/[\u4e00-\u9fa5]+/g) || [];
          return new Set(words.filter(w => w.length >= 2));
        };
        
        const currentKeywords = extractKeywords(user_message);
        const lastKeywords = extractKeywords(lastMessage.content || '');
        
        const intersection = [...currentKeywords].filter(kw => lastKeywords.has(kw));
        const similarity = intersection.length / Math.max(currentKeywords.size, 1);
        
        if (similarity > 0.4) {
          return Response.json({
            should_search: true,
            reason: 'Follow-up question in same topic',
            layer: 'context_memory',
            similarity: similarity.toFixed(2)
          });
        }
      }
    }

    // ============ 第七层：AI 智能判断（使用 Haiku）============
    const judgePrompt = `判断以下用户问题是否需要联网搜索。只需回答"需要"或"不需要"，不要解释。

判断标准：
- 需要：涉及实时信息、当前状态、最新数据、时效性内容、具体人物现状、事件进展
- 不需要：理论知识、代码编写、创作、解释概念、历史事实、方法指导、一般性讨论

用户问题：${user_message}

回答（只说"需要"或"不需要"）：`;

    try {
      const aiResponse = await base44.integrations.Core.InvokeLLM({
        prompt: judgePrompt,
        add_context_from_internet: false
      });

      const needsSearch = aiResponse.includes('需要') && !aiResponse.includes('不需要');
      
      return Response.json({
        should_search: needsSearch,
        reason: needsSearch ? 'AI judged as requiring search' : 'AI judged as not requiring search',
        layer: 'ai_semantic_judgment',
        ai_response: aiResponse.trim()
      });
    } catch (error) {
      // AI 判断失败，默认不搜索
      return Response.json({
        should_search: false,
        reason: 'AI judgment failed, defaulting to no search',
        layer: 'fallback',
        error: error.message
      });
    }

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});