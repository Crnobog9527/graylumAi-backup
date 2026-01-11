# 故障排查手册

> Grayscale 项目常见问题诊断与解决方案
> 最后更新：2026-01-11

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

## 🚨 紧急问题

### 问题：AdminAnnouncements.jsx 文件过大导致编辑卡顿

**症状**
- 文件有 48,524 行代码
- IDE 打开文件缓慢或卡死
- 可能影响构建性能
- 代码审查困难

**诊断步骤**
1. 分析文件内容结构
2. 识别可拆分的功能模块
3. 评估拆分对现有功能的影响

**解决方案（待执行）**

```jsx
// 拆分建议结构
src/components/admin/announcements/
├── index.jsx                    # 主入口
├── AnnouncementList.jsx         # 公告列表
├── AnnouncementForm.jsx         # 公告表单
├── AnnouncementPreview.jsx      # 公告预览
├── AnnouncementFilters.jsx      # 筛选器
└── hooks/
    └── useAnnouncements.js      # 公告状态管理
```

**临时解决方案**
- 使用 VSCode 的 "大文件模式"
- 关闭语法高亮和 lint 检查
- 使用命令行编辑器 (vim/nano) 进行小修改

---

## 🔍 AI 系统问题

### 问题：AI 响应缓慢或超时

**症状**
- 用户等待时间过长 (>30秒)
- API 调用超时错误
- 错误信息: "Request timeout" 或 "ETIMEDOUT"

**诊断步骤**
1. 检查 `callAIModel.ts` 中的模型选择逻辑
2. 验证 Token 预算设置是否合理
3. 检查网络连接和 API 状态
4. 查看 Claude API 状态页面

**检查点**
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

---

### 问题：聊天上下文丢失

**症状**
- 多轮对话后 AI 忘记之前内容
- 用户需要重复说明背景
- AI 回复与之前对话不连贯

**诊断步骤**
1. 检查 `useChatState.js` 状态管理
2. 验证对话历史是否正确传递到后端
3. 检查 Token 限制是否导致上下文被截断
4. 查看 `compressConversation.ts` 压缩策略

**相关配置**

```typescript
// smartChatWithSearch.ts 中的配置
const FULL_HISTORY_LIMIT = 10;          // 10轮内保持完整历史
const RECENT_MESSAGES_COUNT = 6;        // 超过后保留最近6条
const COMPRESSION_TRIGGER_MESSAGES = 20; // 触发压缩的消息数
```

**解决方案**
- 确保 `useChatState.js` 正确维护 `messages` 数组
- 检查前端是否正确传递 `conversationId`
- 验证压缩后的摘要质量

---

### 问题：Token 消耗过高

**症状**
- 用户积分消耗过快
- 成本超出预算
- 单次对话消耗大量 Token

**诊断步骤**
1. 检查 Prompt Caching 是否正常工作
2. 验证模型选择是否合理
3. 查看系统提示词长度

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

---

### 问题：智能搜索不生效

**症状**
- AI 无法获取最新信息
- 搜索结果为空
- 搜索决策错误

**诊断步骤**
1. 检查 `SystemSettings` 中 `enable_smart_search_decision` 是否为 `true`
2. 验证搜索分类器 `searchClassifier.ts` 逻辑
3. 检查搜索缓存是否过期

**解决方案**

```typescript
// 检查系统设置
const settings = await base44.entities.SystemSettings.list();
const searchEnabled = settings.find(s => s.setting_key === 'enable_smart_search_decision');
console.log('智能搜索开关:', searchEnabled?.setting_value);
```

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
