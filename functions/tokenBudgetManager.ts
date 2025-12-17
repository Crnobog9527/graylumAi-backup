import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// 默认预算配置
const DEFAULT_BUDGET = 50000; // 每个对话的默认Token预算
const WARNING_THRESHOLD = 0.8; // 80%时预警

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { conversation_id, operation, tokens } = await req.json();
    
    if (!conversation_id) {
      return Response.json({ error: 'conversation_id is required' }, { status: 400 });
    }
    
    // 获取或创建预算记录
    const budgets = await base44.asServiceRole.entities.TokenBudget.filter({ 
      conversation_id 
    });
    
    let budget;
    if (budgets.length === 0) {
      // 创建新预算记录
      budget = await base44.asServiceRole.entities.TokenBudget.create({
        conversation_id,
        user_email: user.email,
        total_budget: DEFAULT_BUDGET,
        used_tokens: 0,
        remaining_tokens: DEFAULT_BUDGET,
        warning_threshold: WARNING_THRESHOLD,
        is_exceeded: false
      });
    } else {
      budget = budgets[0];
    }
    
    // 处理不同操作
    if (operation === 'check') {
      // 检查预算
      const usagePercent = (budget.used_tokens / budget.total_budget) * 100;
      const shouldWarn = usagePercent >= (budget.warning_threshold * 100);
      
      return Response.json({
        budget: {
          total: budget.total_budget,
          used: budget.used_tokens,
          remaining: budget.remaining_tokens,
          usage_percent: usagePercent.toFixed(1) + '%',
          is_exceeded: budget.is_exceeded,
          should_warn: shouldWarn
        }
      });
      
    } else if (operation === 'consume') {
      // 消耗Token
      if (!tokens || tokens <= 0) {
        return Response.json({ error: 'Valid tokens amount required' }, { status: 400 });
      }
      
      const newUsed = budget.used_tokens + tokens;
      const newRemaining = budget.total_budget - newUsed;
      const isExceeded = newRemaining <= 0;
      const usagePercent = (newUsed / budget.total_budget);
      const shouldWarn = usagePercent >= budget.warning_threshold;
      
      // 更新预算
      const updatedBudget = await base44.asServiceRole.entities.TokenBudget.update(budget.id, {
        used_tokens: newUsed,
        remaining_tokens: Math.max(0, newRemaining),
        is_exceeded: isExceeded,
        last_warning_at: shouldWarn && !budget.last_warning_at ? new Date().toISOString() : budget.last_warning_at
      });
      
      return Response.json({
        success: true,
        consumed: tokens,
        budget: {
          total: updatedBudget.total_budget,
          used: updatedBudget.used_tokens,
          remaining: updatedBudget.remaining_tokens,
          usage_percent: (usagePercent * 100).toFixed(1) + '%',
          is_exceeded: updatedBudget.is_exceeded,
          should_warn: shouldWarn
        },
        warning: shouldWarn ? `已使用 ${(usagePercent * 100).toFixed(1)}% 的Token预算` : null
      });
      
    } else if (operation === 'reset') {
      // 重置预算
      const resetBudget = await base44.asServiceRole.entities.TokenBudget.update(budget.id, {
        used_tokens: 0,
        remaining_tokens: budget.total_budget,
        is_exceeded: false,
        last_warning_at: null
      });
      
      return Response.json({
        success: true,
        message: 'Budget reset successfully',
        budget: {
          total: resetBudget.total_budget,
          used: 0,
          remaining: resetBudget.total_budget,
          usage_percent: '0%',
          is_exceeded: false
        }
      });
      
    } else if (operation === 'increase') {
      // 增加预算
      if (!tokens || tokens <= 0) {
        return Response.json({ error: 'Valid tokens amount required' }, { status: 400 });
      }
      
      const newTotal = budget.total_budget + tokens;
      const newRemaining = budget.remaining_tokens + tokens;
      
      const updatedBudget = await base44.asServiceRole.entities.TokenBudget.update(budget.id, {
        total_budget: newTotal,
        remaining_tokens: Math.max(0, newRemaining),
        is_exceeded: newRemaining > 0 ? false : budget.is_exceeded
      });
      
      return Response.json({
        success: true,
        increased: tokens,
        budget: {
          total: updatedBudget.total_budget,
          used: updatedBudget.used_tokens,
          remaining: updatedBudget.remaining_tokens,
          usage_percent: ((updatedBudget.used_tokens / updatedBudget.total_budget) * 100).toFixed(1) + '%',
          is_exceeded: updatedBudget.is_exceeded
        }
      });
      
    } else {
      return Response.json({ error: 'Invalid operation. Use: check, consume, reset, or increase' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Token budget manager error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});