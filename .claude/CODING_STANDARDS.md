# CODING_STANDARDS.md

<!--
  最后更新: 2026-01-11
  对应代码文件:
    - src/theme.css (设计系统变量)
    - src/components.css (组件样式库)
    - src/components/ui/* (shadcn/ui 组件)
  维护说明: 当设计系统或编码规范变更时，需同步更新本文档
-->

> Grayscale 项目编码规范文档

---

## 文件组织规则

```
项目根目录/
├── functions/              # 后端云函数 (.ts)
│   ├── smartChatWithSearch.ts   # AI 聊天核心
│   ├── callAIModel.ts           # 模型调用封装
│   ├── taskClassifier.ts        # 任务分类器
│   └── [其他业务函数].ts
│
├── src/                    # 前端源码 (.jsx)
│   ├── api/                # API 客户端
│   ├── components/         # 可复用组件
│   │   ├── ui/             # shadcn/ui 基础组件
│   │   ├── chat/           # 聊天功能组件
│   │   ├── admin/          # 管理后台组件
│   │   └── [功能模块]/
│   ├── hooks/              # 全局 Hooks
│   ├── lib/                # 工具库
│   ├── pages/              # 页面组件
│   ├── constants/          # 常量定义
│   └── utils/              # 工具函数
│
└── .claude/                # 项目知识库
    ├── PROJECT_CONTEXT.md
    ├── ARCHITECTURE.md
    ├── CODING_STANDARDS.md  # 本文件
    └── [其他文档]
```

---

## 前端开发规范 (.jsx)

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| **组件文件** | PascalCase | `AdminAnnouncements.jsx` |
| **页面文件** | PascalCase | `Chat.jsx`, `Profile.jsx` |
| **Hook 文件** | camelCase (use 前缀) | `useChatState.js` |
| **工具函数** | camelCase | `apiCache.js`, `batchRequest.js` |
| **常量** | UPPER_SNAKE_CASE | `MAX_INPUT_LENGTH` |
| **CSS 变量** | kebab-case | `--primary-foreground` |

### 组件结构模板

```jsx
// 标准组件模板
import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// UI 组件导入 (shadcn/ui)
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

/**
 * 组件描述
 * @param {Object} props - 组件属性
 */
export default function ComponentName({ prop1, prop2 }) {
  // ============ 1. State 声明 ============
  const [localState, setLocalState] = useState(null);

  // ============ 2. 数据查询 ============
  const { data, isLoading } = useQuery({
    queryKey: ['dataKey'],
    queryFn: () => base44.entities.Entity.list(),
  });

  // ============ 3. 副作用处理 ============
  useEffect(() => {
    // 初始化逻辑
  }, []);

  // ============ 4. 事件处理函数 ============
  const handleAction = useCallback(async () => {
    try {
      // 业务逻辑
    } catch (error) {
      console.error('操作失败:', error);
    }
  }, []);

  // ============ 5. 加载状态 ============
  if (isLoading) {
    return <div>加载中...</div>;
  }

  // ============ 6. 渲染逻辑 ============
  return (
    <Card>
      {/* UI 内容 */}
    </Card>
  );
}
```

### 状态管理规范

#### 全局状态 (聊天相关)

```jsx
// 使用 useChatState.js 管理聊天状态
import { useChatState } from '@/hooks/useChatState';

function ChatComponent() {
  const {
    user,
    messages,
    currentConversation,
    isStreaming,
    handleSendMessage,
  } = useChatState();

  // ...
}
```

#### 局部状态

```jsx
// 使用 React Hooks
const [isOpen, setIsOpen] = useState(false);
const [formData, setFormData] = useState({ name: '', email: '' });
```

#### 服务端状态

```jsx
// 使用 React Query
const { data, isLoading, error } = useQuery({
  queryKey: ['models'],
  queryFn: () => base44.entities.AIModel.filter({ is_active: true }),
  staleTime: 5 * 60 * 1000, // 5分钟缓存
});
```

### 路径别名

```javascript
// 使用 @ 别名替代相对路径
import { Button } from '@/components/ui/button';  // ✅ 正确
import { Button } from '../../../components/ui/button';  // ❌ 避免
```

---

## 后端开发规范 (.ts)

### 云函数结构模板

```typescript
// functions/exampleFunction.ts
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

interface RequestBody {
  param1: string;
  param2?: number;
}

interface ResponseData {
  success: boolean;
  data?: any;
  error?: string;
  code?: string;
}

export default async function exampleFunction(request: Request): Promise<Response> {
  try {
    // ============ 1. 初始化 SDK ============
    const base44 = createClientFromRequest(request);

    // ============ 2. 用户认证 ============
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({
        success: false,
        error: '用户未登录',
        code: 'UNAUTHORIZED'
      }, { status: 401 });
    }

    // ============ 3. 参数验证 ============
    const body: RequestBody = await request.json();
    if (!body.param1) {
      return Response.json({
        success: false,
        error: '缺少必要参数',
        code: 'INVALID_PARAMS'
      }, { status: 400 });
    }

    // ============ 4. 业务逻辑 ============
    const result = await processData(body);

    // ============ 5. 返回结果 ============
    return Response.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('[exampleFunction] 错误:', error);
    return Response.json({
      success: false,
      error: error.message,
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}
```

### AI 调用规范

#### 必须遵循的规则

1. **必须使用 callAIModel.ts 封装**

```typescript
// ✅ 正确：通过封装调用
import { callAIModel } from './callAIModel.ts';

const response = await callAIModel({
  model: selectedModel,
  messages: formattedMessages,
  systemPrompt: systemPrompt,
  user: user,
});

// ❌ 错误：直接调用 Anthropic API
const anthropic = new Anthropic({ apiKey: 'xxx' });
```

2. **必须实现 Token 预算管理**

```typescript
// Token 预算检查
const userCredits = user.credits || 0;
const estimatedCost = estimateTokenCost(messages);

if (userCredits < estimatedCost) {
  return {
    success: false,
    error: '积分不足',
    code: 'INSUFFICIENT_CREDITS'
  };
}
```

3. **必须处理多模型路由**

```typescript
// 智能路由逻辑
const taskComplexity = await classifyTask(userMessage);
const selectedModel = taskComplexity === 'complex'
  ? 'claude-sonnet-4-5-20250514'  // Sonnet 4.5
  : 'claude-haiku-4-5-20250514';   // Haiku 4.5
```

4. **必须记录 API 调用成本**

```typescript
// 成本记录
console.log('[AI调用] 模型:', model);
console.log('[AI调用] Input Tokens:', usage.input_tokens);
console.log('[AI调用] Output Tokens:', usage.output_tokens);
console.log('[AI调用] 缓存命中:', usage.cache_read_input_tokens);
console.log('[AI调用] 成本:', calculateCost(usage));
```

### 依赖导入规范

```typescript
// 使用 npm: URL 导入
import Anthropic from 'npm:@anthropic-ai/sdk@0.52.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Deno 标准库
import { crypto } from 'https://deno.land/std@0.208.0/crypto/mod.ts';
```

---

## 性能要求

### 前端性能

| 指标 | 要求 | 当前状态 |
|------|------|----------|
| 单文件行数 | < 1000 行 | ⚠️ AdminAnnouncements.jsx (48,524行) 严重超标 |
| 首屏加载 | < 3秒 | 待测量 |
| 代码分割 | 必须实现 | 未实现 |
| 图片优化 | 必须压缩 | 部分实现 |

#### 代码分割示例

```jsx
// 使用 React.lazy 实现代码分割
import React, { Suspense, lazy } from 'react';

const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const AdminUsers = lazy(() => import('@/pages/AdminUsers'));

function AdminRoutes() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/dashboard" element={<AdminDashboard />} />
        <Route path="/users" element={<AdminUsers />} />
      </Routes>
    </Suspense>
  );
}
```

### 后端性能

| 指标 | 要求 | 说明 |
|------|------|------|
| 冷启动时间 | < 3秒 | 避免大量顶层导入 |
| 函数体积 | < 5000 行 | smartChatWithSearch.ts 需要拆分 |
| 响应时间 | < 30秒 | AI 调用除外 |
| 内存使用 | < 512MB | 避免大对象缓存 |

#### 函数拆分建议

```typescript
// ❌ 避免：单个超大函数
// smartChatWithSearch.ts (31,478行)

// ✅ 建议：拆分为模块
// smartChat/
//   ├── index.ts           # 主入口
//   ├── messageHandler.ts  # 消息处理
//   ├── searchHandler.ts   # 搜索处理
//   ├── contextManager.ts  # 上下文管理
//   └── responseBuilder.ts # 响应构建
```

---

## UI 一致性规则

### 组件使用规范

```jsx
// ✅ 必须使用 shadcn/ui 组件
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

// ❌ 禁止使用原生 HTML 或其他 UI 库
<button className="...">Click</button>  // 禁止
<div className="modal">...</div>        // 禁止
```

### 主题系统

```jsx
// ✅ 使用 CSS 变量
<div className="bg-background text-foreground">
  <Button variant="default">主按钮</Button>
  <Button variant="secondary">次按钮</Button>
</div>

// ❌ 禁止硬编码颜色
<div style={{ backgroundColor: '#ffffff', color: '#000000' }}>
```

### 暗色模式支持

```jsx
// 所有颜色必须支持暗色模式
<div className="bg-white dark:bg-gray-900">  // ✅ 正确
<div className="bg-white">                    // ⚠️ 缺少暗色模式
```

### 响应式设计

```jsx
// 使用 Tailwind 响应式前缀
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  {/* 内容 */}
</div>
```

### 设计系统速查

> 设计风格: 深色主题 (#0A0A0A) + 金色点缀 (#FFD700)

**核心颜色变量**：
```css
--color-primary: #FFD700;    /* 金色主色 */
--color-secondary: #FFA500;  /* 橙金辅助 */
--bg-primary: #0A0A0A;       /* 深黑背景 */
--bg-secondary: #1A1A1A;     /* 卡片背景 */
```

**常用组件类**：
```css
/* 按钮 */
.btn .btn-primary .btn-secondary .btn-outline

/* 卡片 */
.card .card-header .card-body .card-footer

/* 表单 */
.form-input .form-label .form-group

/* 布局 */
.container .flex .grid .grid-cols-3

/* 文字 */
.heading-1 .text-gradient .text-muted
```

**设计系统文件**：
| 文件 | 说明 | 行数 |
|------|------|------|
| `src/theme.css` | 设计系统变量 - 颜色/字体/间距/圆角/阴影/动画 | 376 |
| `src/components.css` | 组件样式库 - 按钮/卡片/表单/布局/文字/徽章等 | 1224 |

---

## 错误处理标准

### 前端错误处理

```jsx
// API 调用错误处理
const handleSubmit = async () => {
  try {
    setLoading(true);
    const result = await base44.functions.invoke('functionName', data);

    if (!result.success) {
      toast.error(result.error || '操作失败');
      return;
    }

    toast.success('操作成功');
  } catch (error) {
    console.error('[handleSubmit] 错误:', error);
    toast.error('网络错误，请稍后重试');
  } finally {
    setLoading(false);
  }
};
```

### 后端错误处理

```typescript
// 标准错误响应格式
interface ErrorResponse {
  success: false;
  error: string;      // 用户友好的错误信息
  code: string;       // 错误代码
  details?: any;      // 可选：调试信息
}

// 错误代码定义
const ERROR_CODES = {
  UNAUTHORIZED: '用户未登录',
  FORBIDDEN: '权限不足',
  INVALID_PARAMS: '参数无效',
  NOT_FOUND: '资源不存在',
  INSUFFICIENT_CREDITS: '积分不足',
  RATE_LIMITED: '请求过于频繁',
  INTERNAL_ERROR: '服务器内部错误',
};

// 错误处理示例
try {
  // 业务逻辑
} catch (error) {
  console.error('[functionName] 错误:', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  });

  return Response.json({
    success: false,
    error: '服务暂时不可用，请稍后重试',
    code: 'INTERNAL_ERROR',
  }, { status: 500 });
}
```

---

## Git 提交规范

### Commit Message 格式

```
<type>: <subject>

<body>

<footer>
```

### Type 类型

| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档更新 |
| `style` | 代码格式 (不影响逻辑) |
| `refactor` | 重构 |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建/工具更新 |

### 示例

```
feat: Add user invitation system

- Implement invite code generation
- Add invitation reward processing
- Create invitation tracking page

Closes #123
```

---

## 代码审查检查清单

### 通用检查

- [ ] 符合命名规范 (PascalCase/camelCase/UPPER_SNAKE_CASE)
- [ ] 文件大小合理 (< 1000 行)
- [ ] 包含必要的错误处理
- [ ] 没有硬编码的配置或密钥
- [ ] 代码有适当的注释 (复杂逻辑)
- [ ] 没有 console.log 残留 (除错误日志)

### 前端检查

- [ ] 使用 shadcn/ui 组件
- [ ] 支持暗色模式
- [ ] 响应式布局
- [ ] 使用 @ 路径别名
- [ ] React Query 缓存策略合理

### 后端检查

- [ ] 用户认证检查
- [ ] 参数验证完整
- [ ] 错误码标准化
- [ ] AI 调用使用 callAIModel
- [ ] Token 使用已记录
- [ ] 成本计算正确

### AI 相关检查

- [ ] 使用正确的模型 (Sonnet/Haiku)
- [ ] Prompt Caching 已启用
- [ ] Token 预算已检查
- [ ] 成本日志已记录
- [ ] 错误重试机制完善

---

## 禁止事项

### 绝对禁止

1. **禁止提交敏感信息**
   - API Keys
   - 密码
   - 个人数据

2. **禁止直接操作数据库**
   - 必须通过 Base44 SDK

3. **禁止跳过认证检查**
   - 所有 API 必须验证用户

4. **禁止硬编码 AI 模型 ID**
   - 从 SystemSettings 读取

### 应当避免

1. 避免超大文件 (> 1000 行)
2. 避免深层嵌套 (> 4 层)
3. 避免重复代码 (提取公共函数)
4. 避免同步阻塞操作

---

*本文件由 Claude Code 自动生成，如有更新请同步维护*
