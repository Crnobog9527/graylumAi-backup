# AI 对话系统修复计划

<!--
  创建日期: 2026-01-13
  对应诊断: HEALTH_REPORT.md AI对话系统模块诊断
  维护说明: 每完成一项修复，更新进度和变更日志
-->

> 基于 2026-01-13 全面诊断结果制定的修复计划

---

## 修复进度追踪

- [x] **P0: 联网搜索修复** - 官方API添加web_search tool支持 ✅ 2026-01-13
- [x] **P1: 智能路由修复** - 修复模型ID匹配逻辑 ✅ 2026-01-13
- [ ] **P2: 文件拆分重构** - 降低主文件复杂度（可选）
- [x] **P3: 缓存优化** - 清理模拟数据，完善缓存策略 ✅ 2026-01-13

---

## P0: 联网搜索修复

### 目标
使官方 Anthropic API 路径支持 Claude web_search tool，实现与 OpenRouter 一致的联网搜索能力。

### 修改文件
- `functions/callAIModel.ts`

### 关键代码备份

```typescript
// callAIModel.ts:511-515 当前实现
const requestBody = {
  model: model.model_id,
  max_tokens: model.max_tokens || 4096,
  messages: anthropicMessages
};

// callAIModel.ts:585 当前返回
web_search_enabled: false,
```

### 具体步骤

#### Step 1: 修改请求体构建 (callAIModel.ts:511-515)

```typescript
// 修改为：
const requestBody = {
  model: model.model_id,
  max_tokens: model.max_tokens || 4096,
  messages: anthropicMessages,
  // 添加 web_search tool 支持
  ...(force_web_search && {
    tools: [{
      type: "web_search",
      name: "web_search",
      max_uses: 5
    }],
    tool_choice: { type: "auto" }
  })
};
```

#### Step 2: 修改返回值 (callAIModel.ts:585)

```typescript
// 修改为：
web_search_enabled: force_web_search === true,
```

#### Step 3: 处理 tool_use 响应格式

Claude web_search 返回格式与普通消息不同，需要解析：

```typescript
// 在 callAIModel.ts:546 后添加
// 处理可能的 tool_use 响应
let responseText = '';
if (data.content) {
  for (const block of data.content) {
    if (block.type === 'text') {
      responseText += block.text;
    } else if (block.type === 'tool_use' && block.name === 'web_search') {
      // web_search 工具调用记录
      log.info('[AI] Web search executed:', block.input?.query);
    }
  }
}
if (!responseText && data.content?.[0]?.text) {
  responseText = data.content[0].text;
}
```

### 验证方法

```bash
# 1. 部署函数后，发送测试请求
curl -X POST https://your-base44-url/functions/callAIModel \
  -H "Content-Type: application/json" \
  -d '{
    "model_id": "your-anthropic-model-id",
    "messages": [{"role": "user", "content": "今天北京天气怎么样？"}],
    "force_web_search": true
  }'

# 2. 验证返回
# - web_search_enabled: true
# - 响应内容包含实时天气信息
```

### 完成标记
- [x] 代码修改完成 ✅ 2026-01-13
- [ ] 本地测试通过
- [ ] 部署验证通过
- [ ] 更新 TROUBLESHOOTING.md 标记为已修复

---

## P1: 智能路由修复

### 目标
修复 taskClassifier 返回的 model_id 与数据库 AIModel 表匹配失败的问题。

### 修改文件
- `functions/smartChatWithSearch.ts`

### 关键代码备份

```typescript
// smartChatWithSearch.ts:206-213 当前实现
if (taskClassification.model_id) {
  const classifiedModel = models.find(m =>
    m.model_id === taskClassification.model_id ||
    m.model_id.includes(taskClassification.recommended_model)
  );
  if (classifiedModel && classifiedModel.is_active) {
    selectedModel = classifiedModel;
  }
}
```

### 具体步骤

#### Step 1: 增强模型匹配逻辑 (smartChatWithSearch.ts:206-213)

```typescript
// 修改为：
if (taskClassification.model_id || taskClassification.recommended_model) {
  const targetModelId = taskClassification.model_id || '';
  const recommendedModel = taskClassification.recommended_model || '';

  const classifiedModel = models.find(m => {
    const dbModelId = (m.model_id || '').toLowerCase();
    const targetLower = targetModelId.toLowerCase();
    const recommendedLower = recommendedModel.toLowerCase();

    // 精确匹配
    if (dbModelId === targetLower) return true;

    // 包含匹配（数据库model_id包含推荐模型名）
    if (dbModelId.includes(recommendedLower)) return true;

    // 反向包含匹配（推荐模型名包含数据库model_id）
    if (targetLower.includes(dbModelId)) return true;

    return false;
  });

  if (classifiedModel && classifiedModel.is_active) {
    selectedModel = classifiedModel;
    log.info('[Chat] Model selected by classifier:', classifiedModel.model_id);
  } else {
    log.warn('[Chat] Classifier model not found:', targetModelId, recommendedModel);
  }
}
```

### 验证方法

```bash
# 1. 发送简单确认消息，应路由到 Haiku
curl -X POST https://your-base44-url/functions/smartChatWithSearch \
  -H "Content-Type: application/json" \
  -d '{"message": "好的"}'

# 2. 检查日志
# - 应显示: [Chat] Model selected by classifier: claude-haiku-...
# - 不应显示: [Chat] Classifier model not found
```

### 完成标记
- [x] 代码修改完成 ✅ 2026-01-13
- [ ] Haiku 路由测试通过
- [ ] Sonnet 路由测试通过
- [ ] 更新 TROUBLESHOOTING.md 标记为已修复

---

## P2: 文件拆分重构

### 目标
将超大文件拆分为职责单一的模块，降低维护复杂度。

### 修改文件
- `functions/smartChatWithSearch.ts` (761行 → 目标<300行)

### 拆分方案

| 新文件 | 职责 | 原代码行数 |
|--------|------|-----------|
| `chatHandler.ts` | 请求处理、认证、响应构建 | ~150行 |
| `contextBuilder.ts` | 消息构建、摘要集成、token估算 | ~200行 |
| `billingProcessor.ts` | 积分计算、交易记录、余额更新 | ~150行 |
| `smartChatWithSearch.ts` | 主入口，调度其他模块 | ~200行 |

### 具体步骤

#### Step 1: 提取 billingProcessor.ts

```typescript
// functions/billingProcessor.ts
export interface BillingResult {
  finalBalance: number;
  finalPending: number;
  actualDeducted: number;
  webSearchDeducted: number;
  tokenDeducted: number;
}

export async function processBilling(
  base44: any,
  userEmail: string,
  inputCredits: number,
  outputCredits: number,
  webSearchUsed: boolean,
  selectedModelName: string,
  inputTokens: number,
  outputTokens: number
): Promise<BillingResult> {
  // 提取 smartChatWithSearch.ts:526-592 的计费逻辑
}
```

#### Step 2: 提取 contextBuilder.ts

```typescript
// functions/contextBuilder.ts
export interface ContextBuildResult {
  apiMessages: any[];
  contextType: string;
  compressionInfo: any;
}

export function buildContext(
  conversationMessages: any[],
  summaryToUse: any,
  enhancedMessage: string,
  fullHistoryLimit: number,
  recentMessagesCount: number
): ContextBuildResult {
  // 提取 smartChatWithSearch.ts:333-463 的上下文构建逻辑
}
```

#### Step 3: 重构主文件

```typescript
// functions/smartChatWithSearch.ts (重构后)
import { processBilling } from './billingProcessor.ts';
import { buildContext } from './contextBuilder.ts';

Deno.serve(async (req) => {
  // 认证和参数验证 (~50行)
  // 调用 taskClassifier (~30行)
  // 调用 buildContext (~10行)
  // 调用 callAIModel (~20行)
  // 调用 processBilling (~10行)
  // 更新对话和返回响应 (~80行)
});
```

### 验证方法

```bash
# 1. 拆分后功能测试
npm run test:functions

# 2. 文件行数检查
wc -l functions/smartChatWithSearch.ts
# 应 < 300 行

# 3. 循环依赖检查
npx madge --circular functions/
```

### 完成标记
- [ ] billingProcessor.ts 提取完成
- [ ] contextBuilder.ts 提取完成
- [ ] 主文件重构完成
- [ ] 所有测试通过
- [ ] 无循环依赖

---

## P3: 缓存优化

### 目标
清理模拟数据，优化缓存策略。

### 修改文件
- `functions/smartChatWithSearch.ts`

### 具体步骤

#### Step 1: 标记 executeSearch 为废弃

```typescript
// smartChatWithSearch.ts:96-107
/**
 * @deprecated 联网搜索现在通过 Claude API web_search tool 实现
 * 此函数保留仅作为缓存层数据结构参考
 */
const executeSearch = async (query: string, searchType: string) => {
  throw new Error('Deprecated: Use force_web_search in callAIModel instead');
};
```

#### Step 2: 优化缓存Key生成

```typescript
// 使用更强的hash算法避免碰撞
const hashQuery = (query: string, searchType: string): string => {
  const normalized = normalizeQuery(query);
  const str = `${normalized}_${searchType}`;

  // 使用 FNV-1a hash（更均匀分布）
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return hash.toString(36);
};
```

### 验证方法

```bash
# 1. 验证 executeSearch 调用会报错
# 2. 验证缓存Key无碰撞（对比新旧hash）
```

### 完成标记
- [x] executeSearch 标记废弃 ✅ 2026-01-13
- [ ] hash算法优化（可选）
- [ ] 测试通过

---

## 回滚方案

### 紧急回滚步骤

1. **Git 回滚**
   ```bash
   git log --oneline -10  # 找到修复前的commit
   git revert <commit-hash>
   git push
   ```

2. **Base44 函数回滚**
   - 进入 Base44 控制台
   - 选择对应函数
   - 使用"历史版本"功能回滚

3. **验证回滚**
   ```bash
   # 确认功能恢复
   curl -X POST https://your-base44-url/functions/smartChatWithSearch \
     -H "Content-Type: application/json" \
     -d '{"message": "测试消息"}'
   ```

---

## 变更日志

| 日期 | 版本 | 变更内容 | 操作人 |
|------|------|----------|--------|
| 2026-01-13 | 1.0 | 创建修复计划 | Claude |
| 2026-01-13 | 1.1 | 完成P0/P1/P3修复 | Claude |

### v1.1 修复详情

**P0: 联网搜索修复**
- `callAIModel.ts:517-526`: 添加 web_search tool 配置
- `callAIModel.ts:558-577`: 处理 tool_use 响应格式
- `callAIModel.ts:616-617`: 动态返回 web_search_enabled 状态

**P1: 智能路由修复**
- `smartChatWithSearch.ts:205-231`: 增强模型ID匹配逻辑，支持精确匹配、包含匹配、反向包含匹配

**P3: 缓存优化**
- `smartChatWithSearch.ts:95-103`: executeSearch 标记为 @deprecated

---

*本文档由 Claude Code 自动生成，修复执行时请按顺序进行*
