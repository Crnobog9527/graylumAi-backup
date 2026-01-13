# 故障排查手册

<!--
  最后更新: 2026-01-11
  对应代码文件:
    - src/components/hooks/useChatState.jsx (前端状态问题)
    - functions/smartChatWithSearch.ts (后端聊天问题)
    - functions/callAIModel.ts (AI 调用问题)
  维护说明: 每次修复 Bug 后，需在此记录问题和解决方案
  包含内容: 故障排查 + 已解决问题的详细方案 (原 DIAGNOSIS_REPORT.md 已合并)
-->

> Grayscale 项目常见问题诊断与解决方案

---

## 目录

1. [紧急问题](#-紧急问题)
2. [AI 系统问题](#-ai-系统问题)
3. [UI/UX 问题](#-uiux-问题)
4. [后端云函数问题](#️-后端云函数问题)
5. [构建和部署问题](#-构建和部署问题)
6. [开发工具](#️-开发工具)
7. [问题上报模板](#-问题上报模板)

---

## 🚨 紧急问题 - ✅ 已解决

### ✅ 问题已修复：文件大小数据错误（2026-01-11）

**原问题**：文档中记录的文件大小数据严重错误

**实际数据**：
| 文件 | 原记录 | 实际行数 | 状态 |
|------|--------|----------|------|
| `AdminAnnouncements.jsx` | 48,524 | **1,116** | ✅ 正常 |
| `smartChatWithSearch.ts` | 31,478 | **801** | ✅ 正常 |
| `callAIModel.ts` | 27,164 | **718** | ✅ 正常 |
| `useChatState.jsx` | 22,855 | **737** | ✅ 正常 |

**结论**：所有文件大小均在合理范围内（<1500行），无需紧急拆分。

---

### ✅ 问题已修复：系统提示词跨对话串联（2026-01-11）

**症状**
- 用户在对话A中使用功能模块（带系统提示词）
- 新建对话B后，对话A的系统提示词仍然生效
- 不同对话之间记忆互相串联

**根本原因**
系统提示词从 URL 参数 `module_id` 读取，新建对话时 URL 没有清除

**修复方案**（`src/components/hooks/useChatState.jsx:184-194`）

```javascript
const handleStartNewChat = useCallback(() => {
  setCurrentConversation(null);
  setMessages([]);
  // ...

  // 【修复】清除 URL 中的 module_id 参数
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('module_id')) {
    urlParams.delete('module_id');
    urlParams.delete('auto_start');
    const newUrl = urlParams.toString()
      ? `${window.location.pathname}?${urlParams.toString()}`
      : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }
}, []);
```

---

### ✅ 问题已修复：功能模块不自动发送用户提示词（2026-01-11）

**症状**
- 用户通过功能模块点击"使用"跳转对话后
- 后台配置的用户提示词没有自动发送

**根本原因**
原有的 `setTimeout + querySelector.click()` 方法不可靠，存在竞态条件

**修复方案**（`src/components/hooks/useChatState.jsx:546-682`）

```javascript
// 使用 autoSentRef 防止重复发送
const autoSentRef = useRef(false);

useEffect(() => {
  if (autoSentRef.current) return;  // 已发送过则跳过

  const shouldAutoSend = autoStart === 'true' && moduleId &&
                         !currentConversation && messages.length === 0;

  if (shouldAutoSend) {
    autoSentRef.current = true;  // 标记已触发
    // 直接调用 API 发送消息，不依赖 DOM 查询
    await base44.functions.invoke('smartChatWithSearch', {...});
  }
}, [messages.length, currentConversation, isStreaming]);
```

**关键改进**：
- 使用 `useRef` 防止重复发送
- 直接调用 API 而非模拟点击
- 添加 `[AutoSend]` 前缀的诊断日志

---

### ✅ 问题已修复：对话历史不显示在侧边栏（2026-01-11）

**症状**
- 新建对话后，对话不出现在左侧历史记录栏
- 刷新页面后对话完全消失

**根本原因**
`queryClient.invalidateQueries` 只标记缓存过期，不会立即触发重新获取

**修复方案**（`src/components/hooks/useChatState.jsx:372-379`）

```javascript
// 修复：多次刷新确保数据同步
setTimeout(() => {
  console.log('[useChatState] First refetch attempt...');
  refetchConversations();
}, 500);
setTimeout(() => {
  console.log('[useChatState] Second refetch attempt...');
  refetchConversations();
}, 1500);
```

---

### ✅ 问题已修复：聊天上下文丢失（2026-01-11）

**症状**
- 多轮对话后 AI 忘记之前内容
- 长对话时问题更明显

**根本原因**
消息过滤和 token 估算逻辑无法正确处理数组格式的消息内容（带缓存控制的消息格式）

**修复方案**（`functions/smartChatWithSearch.ts` 和 `functions/callAIModel.ts`）

```typescript
// 修复前（错误处理）
apiMessages = apiMessages.filter(m => m.content && m.content.trim().length > 0);

// 修复后（安全处理数组格式）
apiMessages = apiMessages.filter(m => {
  if (!m.content) return false;
  if (Array.isArray(m.content)) {
    return m.content.some(block =>
      block && block.text && typeof block.text === 'string' && block.text.trim().length > 0
    );
  }
  return typeof m.content === 'string' && m.content.trim().length > 0;
});
```

---

## 🔍 AI 系统问题

### 问题：AI 响应缓慢或超时 ✅ 已有监控

**症状**
- 用户等待时间过长 (>30秒)
- API 调用超时错误
- 错误信息: "Request timeout" 或 "ETIMEDOUT"

**当前状态**：已实现性能监控系统（2026-01-11）

**监控机制**
- `aiPerformanceMonitor.ts` 自动记录每次 API 调用
- 超时阈值：30秒（自动警告）
- 慢响应阈值：10秒（自动标记）
- 管理后台可查看实时仪表板

**查看监控数据**
```bash
# 获取性能仪表板
GET /functions/aiPerformanceMonitor?operation=dashboard&time_range=24h

# 获取超时警报列表
GET /functions/aiPerformanceMonitor?operation=alerts&time_range=7d
```

**诊断步骤**
1. 查看管理后台 AI 性能监控页面
2. 检查 `callAIModel.ts` 中的模型选择逻辑
3. 验证 Token 预算设置是否合理
4. 检查网络连接和 API 状态
5. 查看 Claude API 状态页面

**检查点**
- [ ] 查看监控仪表板的超时率和慢响应率
- [ ] Sonnet 4.5 vs Haiku 4.5 选择是否正确
- [ ] Token 上限是否过低
- [ ] 是否有重试机制
- [ ] 网络延迟是否正常

**解决方案**

```typescript
// 1. 优化模型选择策略
const selectedModel = taskComplexity === 'simple'
  ? 'claude-haiku-4-5-20250514'   // 简单任务用 Haiku
  : 'claude-sonnet-4-5-20250514'; // 复杂任务用 Sonnet

// 2. 实现指数退避重试
const MAX_RETRIES = 3;
const INITIAL_DELAY = 1000;

for (let i = 0; i < MAX_RETRIES; i++) {
  try {
    return await callAPI();
  } catch (error) {
    if (i === MAX_RETRIES - 1) throw error;
    await sleep(INITIAL_DELAY * Math.pow(2, i));
  }
}
```

**相关文件**
- `functions/aiPerformanceMonitor.ts` - 性能监控函数
- `src/components/admin/AIPerformanceMonitor.jsx` - 管理后台组件
- `src/pages/AdminPerformance.jsx` - 监控页面

---
### 问题：Token 消耗过高 ✅ 已有监控

**症状**
- 用户积分消耗过快
- 成本超出预算
- 单次对话消耗大量 Token

**当前状态**：已实现 Token 消耗和缓存命中率监控（2026-01-11）

**查看监控数据**
```bash
# 获取 Token 使用统计
GET /functions/aiPerformanceMonitor?operation=dashboard&time_range=24h

# 返回数据包含：
# - total_input: 总输入 Token
# - total_output: 总输出 Token
# - total_cached: 缓存命中 Token
# - cache_hit_rate: 缓存命中率（目标 ≥50%）
# - estimated_savings: 估算节省成本
```

**诊断步骤**
1. 查看管理后台 AI 性能监控页面的 Token 统计
2. 检查缓存命中率是否达到目标（≥50%）
3. 验证模型选择是否合理
4. 查看系统提示词长度

**诊断命令**

```typescript
// 在 callAIModel.ts 中添加
console.log('[Token分析]', {
  inputTokens: usage.input_tokens,
  outputTokens: usage.output_tokens,
  cacheReadTokens: usage.cache_read_input_tokens,
  cacheCreationTokens: usage.cache_creation_input_tokens,
  缓存命中率: (usage.cache_read_input_tokens / usage.input_tokens * 100).toFixed(2) + '%'
});
```

**解决方案**
- 确保 Prompt Caching 生效 (系统提示 ≥1024 tokens)
- 简化系统提示词
- 对长文本使用上下文压缩

**相关文件**
- `functions/aiPerformanceMonitor.ts` - 监控 Token 使用
- `functions/callAIModel.ts` - Prompt Caching 实现

---

## 🎨 UI/UX 问题

### 问题：暗色模式样式异常

**症状**
- 某些组件在暗色模式下显示不正常
- 颜色对比度不足
- 文字不可读

**诊断步骤**
1. 检查 `src/index.css` 中的 CSS Variables 定义
2. 验证组件是否使用主题变量
3. 参考 `DESIGN_SYSTEM_PROGRESS.md`

**正确示例**

```jsx
// ✅ 使用 CSS 变量
<div className="bg-background text-foreground">
  <p className="text-muted-foreground">次要文字</p>
</div>

// ❌ 硬编码颜色
<div style={{ backgroundColor: '#fff', color: '#000' }}>
```

**解决方案**
- 使用 shadcn/ui 组件（自带主题支持）
- 确保所有颜色使用 CSS Variables
- 使用 `dark:` 前缀定义暗色样式

---

### 问题：移动端布局错乱

**症状**
- 内容溢出屏幕
- 按钮过小无法点击
- 文字重叠

**诊断步骤**
1. 检查是否使用了 Tailwind 响应式类
2. 验证 `use-mobile.jsx` Hook 是否正常工作
3. 使用浏览器开发者工具模拟移动设备

**解决方案**

```jsx
// 使用响应式布局
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* 内容 */}
</div>

// 使用 useMobile Hook
import { useMobile } from '@/hooks/use-mobile';

function Component() {
  const isMobile = useMobile();
  return isMobile ? <MobileView /> : <DesktopView />;
}
```

---

## ⚙️ 后端云函数问题

### 案例：对话窗口隔离性失效 - 多层问题级联修复（2026-01-13）

**案例背景**
- 原问题：对话窗口隔离性失效，每轮对话都创建新的 Conversation 记录
- 症状表现：
  1. 新建对话功能失效，新窗口显示旧内容
  2. 对话记录不出现在历史列表
  3. user_email 字段在首轮对话时为空
  4. 发送消息时重复发送 2 次请求

**问题分析过程**

| 阶段 | 发现的问题 | 修复方案 | 引入的新问题 |
|------|-----------|---------|-------------|
| 1 | React useState 异步导致 conversation_id 竞态 | 添加 conversationIdRef 同步跟踪 | 无 |
| 2 | 每次发消息发 2 次请求 | 添加 isStreamingRef 同步检查 | 无 |
| 3 | 中文输入法 Enter 键重复触发 | 添加 isComposing 检查 | 无 |
| 4 | user_email 未验证可能为空 | 后端添加 email 验证 | 无 |
| 5 | RLS "Creator Only" 不匹配 | 改用 "Entity-User Field Comparison" | asServiceRole 查询受限 |
| 6 | asServiceRole 对 Read 操作也受 RLS 限制 | Read 改为 No Restrictions | 前端需手动过滤 |
| 7 | asServiceRole 对 Update 操作也受 RLS 限制 | Update 改为 No Restrictions | 无 |

**根本原因**

1. **React 异步状态更新**：`setState` 是异步的，多次快速调用时状态未及时更新
2. **IME 输入法事件**：中文输入法按 Enter 确认时触发 keydown 事件
3. **Base44 RLS 特殊行为**：`asServiceRole` 只对 Create 操作绕过 RLS，Read/Update 仍受限

**最终解决方案**

```javascript
// 1. 前端：使用 useRef 同步跟踪状态
const conversationIdRef = useRef(null);
const isStreamingRef = useRef(false);

// 2. 前端：检查 IME 输入法状态
if (e.isComposing || e.keyCode === 229) return;

// 3. 前端：查询时手动添加 user_email 过滤
const convs = await base44.entities.Conversation.filter(
  { user_email: user.email },
  '-updated_date',
  100
);

// 4. 后端：验证 user.email 不为空
if (!user.email || user.email.trim() === '') {
  return Response.json({ error: 'User email required' }, { status: 400 });
}

// 5. RLS 配置
// Create: No restrictions
// Read: No restrictions（代码中手动过滤）
// Update: No restrictions
// Delete: user_email = user field
```

**经验教训**
- Base44 的 `asServiceRole` 并不是真正的管理员权限，需要测试实际行为
- React 的 setState 异步特性在高频操作时需要用 useRef 配合
- 中文输入法（IME）需要特殊处理，检查 `e.isComposing`
- RLS 权限修改需要逐项测试，不要假设行为一致
- 当 RLS 无法满足需求时，可以放开权限并在代码中实现安全控制

**相关文件**
- `src/components/hooks/useChatState.jsx` - conversationIdRef, isStreamingRef, isComposing
- `functions/smartChatWithSearch.ts` - userEmail 验证和 asServiceRole 使用
- Base44 RLS 配置 - Conversation 实体权限设置

---

### 案例：Base44 实体数据嵌套导致监控数据读取失败（2026-01-11）

**案例背景**
- 原问题：开发 AI 性能监控功能，需要从 TokenStats 实体读取数据
- 第一次尝试：直接访问 `stat.response_time_ms` 等字段
- 引入的新问题：仪表板数据全为 0，缓存命中率显示 "0%"

**根本原因**

Base44 实体返回的数据结构与预期不同：

```typescript
// ❌ 预期结构（错误假设）
{
  id: "xxx",
  response_time_ms: 1500,
  input_tokens: 100,
  ...
}

// ✅ 实际结构（Base44 返回格式）
{
  id: "xxx",
  created_date: "2026-01-11T...",
  data: {
    response_time_ms: 1500,
    input_tokens: 100,
    ...
  }
}
```

**正确的解决方案**

```typescript
// 兼容处理：数据可能嵌套在 data 字段中
for (const rawStat of filteredStats) {
  const stat = rawStat.data || rawStat;  // 关键：兼容两种结构
  const responseTime = Number(stat.response_time_ms) || 0;

  // created_date 在外层
  const createdDate = new Date(rawStat.created_date);
}
```

**经验教训**
- 使用 Base44 实体前，先用 `console.log` 打印实际返回结构
- 添加 `log.debug('Sample record:', JSON.stringify(stats[0]))` 便于调试
- 始终使用 `Number()` 转换数值字段，避免字符串比较问题
- 写入和读取时保持数据路径一致

**相关文件**
- `functions/aiPerformanceMonitor.ts:180-182` - 数据读取兼容处理
- `functions/aiPerformanceMonitor.ts:110-115` - 调试日志

---

### 问题：云函数冷启动慢

**症状**
- 首次请求等待时间长 (>5秒)
- 影响用户体验
- 间歇性出现

**诊断步骤**
1. 识别是哪个云函数响应慢
2. 检查函数代码大小和依赖
3. 分析初始化逻辑

**解决方案**
- 减少函数依赖项
- 将大型函数拆分为多个小函数
- 延迟加载非必要模块

```typescript
// 延迟加载示例
let heavyModule: any = null;

async function getHeavyModule() {
  if (!heavyModule) {
    heavyModule = await import('npm:heavy-module@1.0.0');
  }
  return heavyModule;
}
```

---

### 问题：云函数返回错误

**症状**
- 返回 500 错误
- 错误信息不明确
- 功能无法正常使用

**诊断步骤**
1. 查看云函数日志
2. 检查请求参数格式
3. 验证用户认证状态

**常见错误码**

| 错误码 | 含义 | 解决方案 |
|--------|------|----------|
| `UNAUTHORIZED` | 用户未登录 | 重新登录 |
| `FORBIDDEN` | 权限不足 | 检查用户权限 |
| `INVALID_PARAMS` | 参数无效 | 检查请求参数 |
| `INSUFFICIENT_CREDITS` | 积分不足 | 充值积分 |
| `RATE_LIMITED` | 请求过于频繁 | 等待后重试 |

---

## 🔧 构建和部署问题

### 问题：npm run build 失败

**症状**
- 构建报错
- TypeScript 类型错误
- 模块找不到

**诊断步骤**

```bash
# 1. 清理缓存
rm -rf node_modules/.vite

# 2. 重新安装依赖
rm -rf node_modules
npm install

# 3. 类型检查
npm run typecheck

# 4. Lint 检查
npm run lint
```

**常见错误及解决**

| 错误 | 解决方案 |
|------|----------|
| `Cannot find module '@/xxx'` | 检查 jsconfig.json 路径配置 |
| `Type 'xxx' is not assignable` | 修复 TypeScript 类型 |
| `ESLint errors` | 运行 `npm run lint:fix` |

---

### 问题：部署后功能异常

**症状**
- 本地正常，部署后出错
- API 调用失败
- 环境变量缺失

**诊断步骤**
1. 检查 Base44 平台部署日志
2. 验证环境变量配置
3. 对比本地和生产环境差异

**解决方案**
- 确保所有环境变量已在平台配置
- 检查 API 端点 URL 是否正确
- 清除浏览器缓存后重试

---

## 🛠️ 开发工具

### 调试 Claude API 调用

```typescript
// 在 callAIModel.ts 中添加详细日志
console.log('[AI调用开始]', {
  model: selectedModel,
  tokenBudget: budget,
  messagesCount: messages.length,
  systemPromptLength: systemPrompt.length,
  timestamp: new Date().toISOString()
});

// 响应后记录
console.log('[AI调用完成]', {
  inputTokens: response.usage.input_tokens,
  outputTokens: response.usage.output_tokens,
  cacheHit: response.usage.cache_read_input_tokens,
  responseLength: response.content[0].text.length,
  duration: Date.now() - startTime + 'ms'
});
```

### 检查 Token 使用

```typescript
// 详细 Token 统计
function logTokenUsage(usage: any) {
  const rates = {
    sonnet: { input: 3.0, output: 15.0, cached: 0.3 },
    haiku: { input: 1.0, output: 5.0, cached: 0.1 }
  };

  const cost = calculateCost(usage, rates.sonnet);

  console.log('[Token统计]', {
    输入: usage.input_tokens,
    输出: usage.output_tokens,
    缓存读取: usage.cache_read_input_tokens || 0,
    缓存创建: usage.cache_creation_input_tokens || 0,
    估算成本: '$' + cost.toFixed(6)
  });
}
```

### Base44 云函数日志

```typescript
// 标准日志格式
function log(functionName: string, message: string, data?: any) {
  console.log(`[${functionName}] ${new Date().toISOString()} - ${message}`, data || '');
}

// 使用示例
log('smartChatWithSearch', '开始处理请求', { userId: user.id });
log('smartChatWithSearch', '模型选择', { model: selectedModel });
log('smartChatWithSearch', '请求完成', { duration: '1.5s' });
```

### 前端状态调试

```jsx
// 在 useChatState.js 中添加调试
useEffect(() => {
  if (process.env.NODE_ENV === 'development') {
    console.log('[useChatState] 状态更新:', {
      user: user?.email,
      messagesCount: messages.length,
      currentConversation: currentConversation?.id,
      isStreaming
    });
  }
}, [user, messages, currentConversation, isStreaming]);
```

---

## 📋 问题上报模板

发现新问题时，使用以下模板记录：

```markdown
### 问题：[简短描述]

**严重程度**：🔴 紧急 / 🟡 中等 / 🟢 低

**症状**
- [具体表现1]
- [具体表现2]

**复现步骤**
1. [步骤1]
2. [步骤2]
3. [步骤3]

**期望行为**
- [应该发生什么]

**实际行为**
- [实际发生了什么]

**诊断步骤**
1. [检查点1]
2. [检查点2]

**解决方案**
- [方案描述]

**相关文件**
- [文件路径1]
- [文件路径2]

**环境信息**
- 浏览器：[Chrome/Safari/Firefox]
- 操作系统：[Windows/macOS/Linux]
- 时间：[发生时间]

**发现日期**：YYYY-MM-DD
**修复日期**：YYYY-MM-DD 或 "待修复"
```

---

*本文件由 Claude Code 自动生成，如有更新请同步维护*
