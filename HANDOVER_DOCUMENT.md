# GraylumAI 项目交接文档

**生成日期**: 2026-01-12
**文档版本**: 1.0

---

## 1. 项目概览

### 项目名称
**GraylumAI** (原项目名: base44-app)

### 项目描述
GraylumAI 是一个基于 AI 的社交媒体增长策略平台，提供智能聊天、内容生成和策略分析功能。项目采用前后端分离架构，前端基于 React + Vite 构建，后端使用 Base44 SDK 平台提供 BaaS (Backend as a Service) 服务。

### 主要功能概述
1. **智能 AI 聊天系统** - 支持多模型选择、流式响应、文件上传、对话历史管理
2. **用户认证与管理** - 注册、登录、个人资料、权限控制
3. **积分/信用系统** - 积分购买、消耗追踪、会员等级
4. **管理后台** - 用户管理、模型配置、财务统计、公告管理
5. **工单系统** - 用户反馈、客服支持
6. **邀请奖励系统** - 推荐码生成、奖励发放

### 目标用户群体
- **普通用户**: 使用 AI 聊天功能进行内容创作和策略咨询
- **会员用户**: 享受更多积分额度和高级功能
- **管理员**: 管理平台运营、用户和系统配置

---

## 2. 前端代码结构分析

### 前端框架/库
- **核心框架**: React 18.2.0
- **构建工具**: Vite 6.1.0
- **路由管理**: React Router DOM 6.26.0

**证据**: `package.json:57-65`

### UI 组件库/样式框架
- **UI 组件库**: Radix UI (19 个无头组件包)
- **组件风格**: shadcn/ui (基于 Radix UI 的样式封装)
- **样式框架**: Tailwind CSS 3.4.17
- **图标库**: Lucide React 0.475.0
- **通知组件**: Sonner 2.0.1, React Hot Toast 2.6.0

**证据**: `package.json:21-47, 55, 67-69`

### 路由管理
- **路由库**: React Router DOM 6.26.0
- **路由配置**: 动态页面配置文件 `src/pages.config.js`
- **路由守卫**: 基于 `AuthContext` 的认证检查

**路由表**:

| 路由路径 | 页面组件 | 描述 |
|---------|---------|------|
| `/` | `Home.jsx` | 首页/仪表盘 |
| `/chat` | `Chat.jsx` | AI 聊天界面 |
| `/marketplace` | `Marketplace.jsx` | 功能市场 |
| `/profile` | `Profile.jsx` | 用户个人中心 |
| `/templates` | `Templates.jsx` | 模板管理 |
| `/admin` | `Admin.jsx` | 管理员入口 |
| `/admin-dashboard` | `AdminDashboard.jsx` | 管理仪表盘 |
| `/admin-users` | `AdminUsers.jsx` | 用户管理 |
| `/admin-models` | `AdminModels.jsx` | 模型配置 |
| `/admin-finance` | `AdminFinance.jsx` | 财务管理 |
| `/admin-packages` | `AdminPackages.jsx` | 套餐管理 |
| `/admin-settings` | `AdminSettings.jsx` | 系统设置 |
| `/admin-tickets` | `AdminTickets.jsx` | 工单管理 |
| `/admin-announcements` | `AdminAnnouncements.jsx` | 公告管理 |
| `/admin-prompts` | `AdminPrompts.jsx` | 提示词管理 |
| `/admin-invitations` | `AdminInvitations.jsx` | 邀请管理 |
| `/admin-transactions` | `AdminTransactions.jsx` | 交易记录 |
| `/admin-performance` | `AdminPerformance.jsx` | 性能监控 |

**证据**: `src/pages.config.js`, `src/App.jsx`

### 状态管理
1. **全局认证状态**: React Context (`src/lib/AuthContext.jsx`)
   - 提供 `useAuth()` hook
   - 管理 `user`, `isAuthenticated`, `isLoadingAuth`, `authError`

2. **服务端状态**: TanStack React Query 5.84.1
   - 缓存优先策略
   - 默认配置: 1 次重试, 不自动刷新

3. **表单状态**: React Hook Form 7.54.2 + Zod 3.24.2
   - 表单验证
   - 字段管理

4. **自定义缓存层**: `src/utils/chatAPI.js`
   - 对话列表缓存 (2 分钟 TTL)
   - 对话历史缓存 (5 分钟 TTL)
   - 请求去重

**证据**: `package.json:48, 61, 71`, `src/lib/AuthContext.jsx`, `src/utils/chatAPI.js`

### API 请求库
- **主要方式**: Base44 SDK (`@base44/sdk` v0.8.3)
- **SDK 初始化**: `src/api/base44Client.js`

**无独立的 Axios 或 Fetch 封装层** - 所有 API 调用通过 Base44 SDK 完成

### 项目入口文件
- **HTML 入口**: `index.html`
- **React 入口**: `src/main.jsx`
- **应用根组件**: `src/App.jsx`
- **布局包装器**: `src/Layout.jsx`

### 主要目录结构

```
src/
├── api/                    # API 客户端
│   ├── base44Client.js     # Base44 SDK 初始化
│   ├── entities.js         # 数据实体导出
│   └── integrations.js     # 集成服务导出
├── assets/                 # 静态资源 (图片、图标)
├── components/             # 组件目录 (106 个文件)
│   ├── ui/                 # shadcn/ui 组件 (49 个)
│   ├── chat/               # 聊天相关组件
│   ├── admin/              # 管理后台组件
│   ├── profile/            # 用户资料组件
│   ├── layout/             # 布局组件 (Header, Banner)
│   ├── home/               # 首页组件
│   ├── marketplace/        # 市场组件
│   ├── common/             # 公共组件
│   ├── hooks/              # 组件级 hooks
│   ├── credits/            # 积分组件
│   ├── tickets/            # 工单组件
│   ├── invite/             # 邀请组件
│   └── modules/            # 功能模块组件
├── constants/              # 常量定义
├── hooks/                  # 全局 hooks
├── lib/                    # 核心库
│   ├── AuthContext.jsx     # 认证上下文
│   ├── query-client.js     # React Query 配置
│   ├── app-params.js       # 环境参数
│   └── utils.js            # 工具函数
├── pages/                  # 页面组件 (17 个)
├── utils/                  # 业务工具
│   ├── chatAPI.js          # 聊天 API 封装
│   ├── apiCache.js         # API 缓存
│   └── batchRequest.js     # 批量请求
├── App.jsx                 # 根组件
├── Layout.jsx              # 布局组件
├── main.jsx                # React 渲染入口
├── pages.config.js         # 页面路由配置
├── index.css               # Tailwind 全局样式
├── theme.css               # 设计系统变量
└── components.css          # 组件样式
```

### 与后端交互的模式

#### 1. Base44 SDK 调用方式

```javascript
// SDK 初始化 (src/api/base44Client.js)
import { createClient } from '@base44/sdk';

const base44 = createClient({
  appId,        // 应用 ID
  serverUrl,    // 后端 URL
  token,        // 访问令牌
  functionsVersion,
  requiresAuth: false
});
```

#### 2. 主要 API 服务类别

| 服务类型 | 调用方式 | 用途 |
|---------|---------|------|
| 认证 | `base44.auth.*` | 用户登录、获取信息、登出 |
| 数据实体 | `base44.entities.*` | CRUD 操作 |
| 服务角色 | `base44.asServiceRole.entities.*` | 特权操作 |
| 云函数 | `base44.functions.invoke()` | 自定义业务逻辑 |
| 集成服务 | `base44.integrations.Core.*` | LLM、邮件、短信等 |

#### 3. 统一 API 服务层
**有**，位于 `src/api/` 目录:
- `entities.js` - 数据实体导出
- `integrations.js` - 集成服务导出
- `base44Client.js` - SDK 客户端实例

---

## 3. 后端功能重构需求 (原 Base44 内置功能)

### 3.1 用户鉴权与管理

#### 注册功能
- **前端注册表单字段**: 由 Base44 托管，前端无自定义注册表单
- **注册跳转**: `base44.auth.redirectToSignup()` 跳转到 Base44 注册页
- **注册成功后的行为**:
  1. URL 携带 `access_token` 参数返回
  2. `app-params.js` 捕获并存储到 `localStorage`
  3. 自动发放注册奖励积分 (默认 100 积分)
  4. 处理邀请码奖励 (如有)

**证据**: `src/lib/app-params.js:41`, `src/Layout.jsx:24-91`

#### 登录功能
- **前端登录表单字段**: 由 Base44 托管
- **登录跳转**: `base44.auth.redirectToLogin()`
- **登录成功后的行为**:
  1. URL 携带 `access_token` 参数
  2. Token 存储到 `localStorage` (key: `base44_access_token`)
  3. 调用 `base44.auth.me()` 获取用户信息
  4. 跳转到首页或原来页面
- **登录失败的错误处理**:
  - `auth_required`: 重定向到登录页
  - `user_not_registered`: 显示未注册错误组件

**证据**: `src/App.jsx:31-78`, `src/lib/AuthContext.jsx:49-95`

#### 登出功能
- **前端触发**: 调用 `base44.auth.logout()`
- **触发位置**:
  - `src/pages/Profile.jsx:47`
  - `src/components/layout/AppHeader.jsx:214`
- **登出后的行为**:
  1. 清除 localStorage Token
  2. 重定向到 Base44 登录页

#### 用户个人信息管理

**用户个人中心页面显示信息**:
- 头像 (`avatar_url`)
- 昵称 (`nickname`)
- 邮箱 (`email`)
- 会员等级 (`membership_level` / `subscription_tier`)
- 积分余额 (`credits`)
- 注册时间 (`created_date`)

**可修改的信息**:
- 头像 (支持裁剪上传)
- 昵称
- 密码 (需验证当前密码)
- 邮箱验证

**API 调用**:
```javascript
// 获取用户信息
base44.auth.me()

// 更新用户资料
base44.auth.updateMe({ avatar_url, nickname })

// 修改密码 (云函数)
base44.functions.invoke('changePassword', { current_password, new_password })

// 发送验证邮件 (云函数)
base44.functions.invoke('sendVerificationEmail', { email })

// 验证邮箱 (云函数)
base44.functions.invoke('verifyEmail', { code })
```

**证据**: `src/pages/Profile.jsx`, `src/components/profile/ProfileComponents.jsx:974-1173`

#### 用户角色/权限

**角色类型**:
- `user` (普通用户)
- `admin` (管理员)

**权限控制方式**:
```javascript
// 管理员页面守卫 (每个 Admin 页面)
if (userData.role !== 'admin') {
  navigate('/');
  return;
}
```

**会员等级**:
- `free` (免费用户)
- `basic` (基础会员)
- `pro` (专业会员)
- `enterprise` (企业会员)

**证据**: `src/pages/AdminDashboard.jsx:21-23` 及所有 Admin 页面

---

### 3.2 AI 核心逻辑

#### AI 交互页面/组件
- **主页面**: `/chat` (`src/pages/Chat.jsx`)
- **核心组件**:
  - `ChatSidebar.jsx` - 对话列表
  - `ChatHeader.jsx` - 标题编辑、导出
  - `ChatMessages.jsx` - 消息展示
  - `ChatInputArea.jsx` - 输入框
  - `ModelSelector.jsx` - 模型选择器
  - `TokenUsageStats.jsx` - Token 使用统计

#### AI 功能类型
1. **文本生成** - 主要功能，支持多轮对话
2. **文件处理** - 支持 PDF、DOC、图片上传和内容提取
3. **Web 搜索增强** - 智能判断是否需要搜索
4. **对话压缩** - 自动压缩长对话历史

#### 前端如何向后端发送 AI 请求

**请求 API 路径**: `base44.functions.invoke('smartChatWithSearch', params)`

**请求参数**:
```javascript
{
  conversation_id: string | null,  // 对话 ID (新对话为 null)
  message: string,                 // 用户消息 (必填)
  system_prompt: string | null,    // 系统提示词 (仅首轮)
  image_files: Array<{             // 图片文件 (可选)
    media_type: string,
    base64: string
  }>
}
```

**证据**: `src/components/hooks/useChatState.jsx:333-337`

#### 前端如何处理 AI 响应

**响应数据结构**:
```javascript
{
  conversation_id: string,         // 对话 ID
  response: string,                // AI 回复文本
  model_used: string,              // 使用的模型
  input_tokens: number,            // 输入 Token 数
  output_tokens: number,           // 输出 Token 数
  credits_used: number,            // 消耗积分
  web_search_enabled: boolean,     // 是否使用了 Web 搜索
  stats: {
    cache_hit_rate: string,        // 缓存命中率
    compression_triggered: boolean, // 是否触发压缩
    context_type: string,          // 上下文类型
    compression_info: {            // 压缩信息
      before_tokens: number,
      after_tokens: number,
      saved_tokens: number,
      compression_ratio: string
    }
  }
}
```

**流式响应**: **不支持真正的流式传输**
- 使用 `isStreaming` 状态变量显示加载动画
- 响应一次性返回后更新 UI
- 没有 WebSocket 或 SSE 实现

**证据**: `src/components/hooks/useChatState.jsx:29-31, 290, 429`

#### 使用的 AI 模型类型

**默认模型**:
- Sonnet: `claude-sonnet-4-5-20250929` (高质量)
- Haiku: `claude-haiku-4-5-20251001` (快速/低成本)

**支持的提供商**:
- `anthropic` - Anthropic Claude
- `google` - Google Gemini
- `openai` - OpenAI GPT
- `custom` - 自定义端点

**模型路由逻辑** (`taskClassifier.ts`):
1. 内部任务 → Haiku
2. 多轮对话 (≥3 轮) → Sonnet
3. 简单确认 → Haiku
4. 默认 → Sonnet

**证据**: `functions/taskClassifier.ts:28-64`, `functions/callAIModel.ts`

#### 历史会话管理

**是**，完整支持:

**会话实体字段**:
```javascript
{
  id: string,                      // UUID
  created_by: string,              // 用户邮箱
  title: string,                   // 会话标题
  messages: Array,                 // 消息数组
  system_prompt: string,           // 系统提示词
  model_id: string,                // 选择的模型
  is_archived: boolean,            // 是否归档
  total_credits_used: number,      // 总消耗积分
  updated_date: ISO8601,           // 更新时间
  created_date: ISO8601            // 创建时间
}
```

**会话分组显示** (`useChatState.jsx:7-31`):
- 今天 (today)
- 昨天 (yesterday)
- 本周 (thisWeek)
- 本月 (thisMonth)
- 更早 (older)

**会话压缩** (`compressConversation.ts`):
- 每 10 条消息检查
- 超过 20 条自动压缩
- 使用 Haiku 生成摘要

---

### 3.3 数据存储与管理

#### 涉及数据库操作的页面/功能

| 页面/功能 | 数据操作 | 实体 |
|----------|---------|------|
| 聊天 | CRUD | Conversation, TokenStats |
| 用户管理 | RU | User |
| 模型配置 | CRUD | AIModel |
| 积分交易 | CR | CreditTransaction |
| 工单系统 | CRUD | Ticket, TicketReply |
| 公告管理 | CRUD | Announcement |
| 系统设置 | RU | SystemSettings |
| 邀请管理 | CR | Invitation |
| 套餐管理 | CRUD | CreditPackage, MembershipPlan |
| 提示词管理 | CRUD | PromptModule |

#### 主要数据实体

##### User (用户)
```typescript
{
  id: string,                      // UUID
  email: string,                   // 邮箱 (唯一)
  full_name: string,               // 全名
  nickname: string,                // 昵称
  avatar_url: string,              // 头像 URL
  role: 'user' | 'admin',          // 角色
  credits: number,                 // 当前积分
  pending_credits: number,         // 待发放积分
  total_credits_used: number,      // 总消耗积分
  membership_level: string,        // 会员等级
  subscription_tier: string,       // 订阅层级
  email_verified: boolean,         // 邮箱已验证
  email_verification_token: string,// 验证 Token
  email_verification_expires: Date,// Token 过期时间
  registration_bonus_granted: boolean, // 已发放注册奖励
  invite_code: string,             // 邀请码
  last_password_change: Date,      // 最后修改密码时间
  created_date: Date,              // 创建时间
  updated_date: Date               // 更新时间
}
```

##### Conversation (对话)
```typescript
{
  id: string,                      // UUID
  created_by: string,              // 用户邮箱
  title: string,                   // 对话标题
  messages: Array<Message>,        // 消息数组
  system_prompt: string,           // 系统提示词
  model_id: string,                // 模型 ID
  is_archived: boolean,            // 是否归档
  total_credits_used: number,      // 总消耗积分
  session_task_type: string,       // 任务类型
  updated_date: Date,              // 更新时间
  created_date: Date               // 创建时间
}
```

##### Message (消息) - 嵌入在 Conversation 中
```typescript
{
  role: 'user' | 'assistant' | 'system',
  content: string,                 // 消息内容
  text: string,                    // 原始文本
  timestamp: ISO8601,              // 时间戳
  attachments: Array<{             // 附件
    name: string,
    type: string
  }>,
  credits_used: number,            // 消耗积分
  input_tokens: number,            // 输入 Token
  output_tokens: number,           // 输出 Token
  isError: boolean                 // 错误标记
}
```

##### AIModel (AI 模型)
```typescript
{
  id: string,                      // UUID
  name: string,                    // 显示名称
  model_id: string,                // 模型 ID
  provider: 'anthropic' | 'google' | 'openai' | 'custom',
  api_key: string,                 // API 密钥
  api_endpoint: string,            // 自定义端点
  is_active: boolean,              // 是否启用
  is_default: boolean,             // 是否默认
  description: string,             // 描述
  max_tokens: number,              // 最大输出 Token
  input_limit: number,             // 最大输入 Token
  enable_web_search: boolean,      // 启用 Web 搜索
  input_token_cost: number,        // 输入 Token 成本
  output_token_cost: number,       // 输出 Token 成本
  web_search_cost: number          // Web 搜索成本
}
```

##### CreditTransaction (积分交易)
```typescript
{
  id: string,                      // UUID
  user_email: string,              // 用户邮箱
  type: 'usage' | 'purchase' | 'reward' | 'bonus',
  amount: number,                  // 金额 (负数为扣除)
  balance_after: number,           // 交易后余额
  description: string,             // 描述
  model_used: string,              // 使用的模型
  input_tokens: number,            // 输入 Token
  output_tokens: number,           // 输出 Token
  input_credits: number,           // 输入积分
  output_credits: number,          // 输出积分
  web_search_used: boolean,        // 是否使用 Web 搜索
  created_date: Date               // 创建时间
}
```

##### TokenBudget (Token 预算)
```typescript
{
  id: string,                      // UUID
  conversation_id: string,         // 对话 ID
  user_email: string,              // 用户邮箱
  total_budget: number,            // 总预算
  used_tokens: number,             // 已使用 Token
  remaining_tokens: number,        // 剩余 Token
  warning_threshold: number,       // 警告阈值 (0-1)
  is_exceeded: boolean,            // 是否超支
  last_warning_at: Date            // 最后警告时间
}
```

##### Ticket (工单)
```typescript
{
  id: string,                      // UUID
  title: string,                   // 标题
  description: string,             // 描述
  status: 'open' | 'in_progress' | 'resolved' | 'closed',
  priority: 'low' | 'medium' | 'high',
  category: string,                // 分类
  created_by: string,              // 创建者邮箱
  created_date: Date,              // 创建时间
  updated_date: Date               // 更新时间
}
```

##### TicketReply (工单回复)
```typescript
{
  id: string,                      // UUID
  ticket_id: string,               // 工单 ID
  content: string,                 // 回复内容
  created_by: string,              // 回复者邮箱
  created_date: Date               // 创建时间
}
```

##### SystemSettings (系统设置)
```typescript
{
  id: string,                      // UUID
  setting_key: string,             // 设置键
  setting_value: string            // 设置值
}
```

**默认系统设置** (`src/pages/AdminSettings.jsx:17-64`):
```javascript
{
  site_name: 'AI Chat Platform',
  support_email: 'support@example.com',
  maintenance_mode: 'false',
  new_user_credits: '100',            // 新用户积分
  input_credits_per_1k: '1',          // 每 1k 输入 Token 积分
  output_credits_per_1k: '5',         // 每 1k 输出 Token 积分
  web_search_credits: '5',            // Web 搜索积分
  max_messages_per_conversation: '100',
  max_input_characters: '2000',
  enable_free_tier: 'false',
  free_tier_messages: '5',
  long_text_warning_threshold: '5000',
  enable_long_text_warning: 'true',
  show_token_usage_stats: 'true',
  chat_show_model_selector: 'true',
  enable_smart_routing: 'true',
  enable_smart_search_decision: 'true'
}
```

##### ConversationSummary (对话摘要)
```typescript
{
  id: string,
  conversation_id: string,
  user_email: string,
  summary_text: string,            // 摘要文本
  covered_messages: number,        // 覆盖的消息数
  summary_tokens: number,          // 摘要 Token 数
  key_topics: string[],            // 关键主题
  compression_ratio: string        // 压缩率
}
```

##### SearchCache (搜索缓存)
```typescript
{
  id: string,
  query_hash: string,              // 查询哈希
  normalized_query: string,        // 标准化查询
  search_type: string,             // 搜索类型
  search_results: string,          // 结果 JSON
  hit_count: number,               // 命中次数
  cost_saved: number,              // 节省成本
  expires_at: Date                 // 过期时间
}
```

##### Invitation (邀请)
```typescript
{
  id: string,
  inviter_id: string,              // 邀请人 ID
  invitee_email: string,           // 被邀请人邮箱
  status: string,                  // 状态
  reward_granted: boolean,         // 奖励已发放
  risk_level: string,              // 风险等级
  created_date: Date
}
```

##### Announcement (公告)
```typescript
{
  id: string,
  title: string,
  content: string,
  is_active: boolean,
  sort_order: number,
  created_date: Date
}
```

##### CreditPackage (积分套餐)
```typescript
{
  id: string,
  name: string,
  amount: number,                  // 积分数量
  price: number,                   // 价格
  is_active: boolean,
  sort_order: number
}
```

##### MembershipPlan (会员计划)
```typescript
{
  id: string,
  name: string,
  credits_per_month: number,
  features: string[],
  price: number,
  is_active: boolean,
  sort_order: number
}
```

##### PromptModule (提示词模块)
```typescript
{
  id: string,
  name: string,
  prompt: string,
  category: string,
  is_active: boolean,
  sort_order: number
}
```

##### TokenStats (Token 统计)
```typescript
{
  id: string,
  conversation_id: string,
  user_email: string,
  model_used: string,
  input_tokens: number,
  output_tokens: number,
  cached_tokens: number,
  total_cost: number,
  request_type: string,
  response_time_ms: number,
  is_timeout: boolean,
  is_error: boolean,
  created_date: Date
}
```

#### 前端数据操作模式

**创建 (Create)**:
```javascript
await base44.entities.Conversation.create({ title, messages, model_id })
await base44.entities.CreditTransaction.create({ user_email, amount, type })
```

**读取 (Read)**:
```javascript
// 列表查询
await base44.entities.User.list('-created_date')
await base44.entities.Conversation.filter({ created_by: email }, '-updated_date', 100)

// 单条查询
await base44.entities.Conversation.get(conversationId)
```

**更新 (Update)**:
```javascript
await base44.entities.User.update(id, { credits, role })
await base44.entities.Conversation.update(id, { messages, updated_date })
```

**删除 (Delete)**:
```javascript
await base44.entities.Conversation.delete(conversationId)
await base44.entities.AIModel.delete(modelId)
```

#### API 路径和参数汇总

| 操作 | API 调用 | 参数 |
|------|---------|------|
| 获取用户 | `base44.auth.me()` | 无 |
| 更新用户 | `base44.auth.updateMe(data)` | `{ avatar_url, nickname }` |
| 登出 | `base44.auth.logout()` | 无 |
| 获取对话列表 | `Conversation.filter(filters, sort, limit)` | `{ created_by, is_archived }` |
| 获取对话详情 | `Conversation.get(id)` | `conversationId` |
| 创建对话 | `Conversation.create(data)` | `{ title, messages, model_id, ... }` |
| 更新对话 | `Conversation.update(id, data)` | `{ messages, updated_date, ... }` |
| 删除对话 | `Conversation.delete(id)` | `conversationId` |
| AI 聊天 | `functions.invoke('smartChatWithSearch', params)` | `{ message, conversation_id, ... }` |
| 修改密码 | `functions.invoke('changePassword', params)` | `{ current_password, new_password }` |
| 验证邮箱 | `functions.invoke('verifyEmail', params)` | `{ code }` |

---

### 3.4 其他后端集成

#### 支付集成
**当前状态**: **未检测到支付集成**

- 无 Stripe、PayPal 或其他支付 SDK
- 积分系统存在，但购买功能似乎未实现
- `CreditPackage` 和 `MembershipPlan` 实体存在但无支付处理

**重构建议**: 需要实现支付网关集成

#### 邮件/短信服务

**邮件服务**:
```javascript
// 集成调用
base44.integrations.Core.SendEmail({
  to: email,
  subject: '验证码',
  body: htmlContent
})

// 使用场景
// 1. 邮箱验证码 (sendVerificationEmail.ts)
// 2. 密码修改通知 (changePassword.ts)
```

**短信服务**:
```javascript
// 集成调用
base44.integrations.Core.SendSMS({
  to: phoneNumber,
  message: smsContent
})
```

**证据**: `src/api/integrations.js`, `functions/sendVerificationEmail.ts`

#### 其他第三方 API 调用

**文件上传**:
```javascript
base44.integrations.Core.UploadFile({ file })
```

**文件内容提取**:
```javascript
base44.integrations.Core.ExtractDataFromUploadedFile({ file_url })
// 支持: PDF, DOC, DOCX, TXT, CSV
```

**图像生成**:
```javascript
base44.integrations.Core.GenerateImage({ prompt })
```

**LLM 直接调用**:
```javascript
base44.integrations.Core.InvokeLLM({
  model,
  messages,
  system_prompt
})
```

**证据**: `src/api/integrations.js:1-25`

---

## 4. 环境与配置

### 前端环境变量

| 变量名 | 用途 | 默认值 |
|-------|------|-------|
| `VITE_BASE44_APP_ID` | Base44 应用 ID | 需配置 |
| `VITE_BASE44_BACKEND_URL` | Base44 后端 URL | 需配置 |

**获取方式**: `src/lib/app-params.js:39-40`

**URL 参数支持**:
- `access_token` - 访问令牌 (自动从 URL 移除)
- `app_id` - 应用 ID (覆盖环境变量)
- `server_url` - 服务器 URL (覆盖环境变量)
- `functions_version` - 函数版本
- `from_url` - 来源 URL

### 后端所需密钥/凭证

| 凭证 | 用途 | 存储位置 |
|-----|------|---------|
| Base44 App ID | 应用标识 | 环境变量 |
| Base44 Backend URL | API 端点 | 环境变量 |
| OpenRouter API Key | AI 模型调用 | AIModel 实体 |
| Anthropic API Key | Claude 直接调用 | AIModel 实体 |
| 邮件服务凭证 | 发送邮件 | Base44 集成配置 |
| 短信服务凭证 | 发送短信 | Base44 集成配置 |

### 后端云函数列表

| 函数名 | 文件 | 用途 |
|-------|------|------|
| `smartChatWithSearch` | `smartChatWithSearch.ts` | 主聊天入口 |
| `callAIModel` | `callAIModel.ts` | AI 模型调用 |
| `taskClassifier` | `taskClassifier.ts` | 任务分类/模型路由 |
| `searchClassifier` | `searchClassifier.ts` | 搜索决策 |
| `compressConversation` | `compressConversation.ts` | 对话压缩 |
| `tokenBudgetManager` | `tokenBudgetManager.ts` | Token 预算管理 |
| `changePassword` | `changePassword.ts` | 修改密码 |
| `sendVerificationEmail` | `sendVerificationEmail.ts` | 发送验证邮件 |
| `verifyEmail` | `verifyEmail.ts` | 验证邮箱 |
| `processInviteReward` | `processInviteReward.ts` | 处理邀请奖励 |
| `completeInviteReward` | `completeInviteReward.ts` | 完成邀请奖励 |
| `getChatStats` | `getChatStats.ts` | 获取聊天统计 |
| `getSearchAnalytics` | `getSearchAnalytics.ts` | 获取搜索分析 |
| `exportConversations` | `exportConversations.ts` | 导出对话 |
| `extractFileContent` | `extractFileContent.ts` | 提取文件内容 |
| `aiPerformanceMonitor` | `aiPerformanceMonitor.ts` | AI 性能监控 |
| `cleanupConversationHistory` | `cleanupConversationHistory.ts` | 清理对话历史 |
| `cleanupSearchCache` | `cleanupSearchCache.ts` | 清理搜索缓存 |
| `autoCloseTickets` | `autoCloseTickets.ts` | 自动关闭工单 |

---

## 5. 设计系统

### 颜色系统 (CSS 变量)

**主题色**:
```css
--color-primary: #FFD700;    /* 金色 - 品牌主色 */
--color-secondary: #FFA500;  /* 橙色 */
--color-accent: #22C55E;     /* 绿色 - 成功状态 */
```

**背景色** (深色主题):
```css
--bg-primary: #0A0A0A;       /* 主背景 */
--bg-secondary: #111111;     /* 次级背景 */
--bg-tertiary: #1A1A1A;      /* 三级背景 */
--bg-elevated: #222222;      /* 悬浮背景 */
```

**文字色**:
```css
--text-primary: #FFFFFF;
--text-secondary: #A1A1AA;
--text-tertiary: #71717A;
--text-disabled: #52525B;
```

**状态色**:
```css
--color-success: #22C55E;
--color-warning: #F59E0B;
--color-error: #EF4444;
--color-info: #3B82F6;
```

**证据**: `src/theme.css`

### 字体系统
- **主字体**: Inter (Google Fonts)
- **加载策略**: `font-display: swap`

---

## 6. 重构迁移指南

### 需要从 Base44 迁移的功能

1. **用户认证系统**
   - 实现自有的注册/登录流程
   - Token 管理和刷新机制
   - OAuth 集成 (可选)

2. **数据存储**
   - 设计数据库 Schema (建议 PostgreSQL)
   - 实现 ORM 层 (建议 Prisma)
   - 数据迁移脚本

3. **云函数**
   - 迁移到 Node.js/Python 后端
   - 实现 27 个云函数
   - API 路由设计

4. **集成服务**
   - AI 模型调用 (OpenRouter/Anthropic)
   - 邮件服务 (SendGrid/AWS SES)
   - 文件存储 (S3/OSS)

5. **前端改造**
   - 替换 Base44 SDK 调用
   - 实现自有 API 客户端
   - 认证流程改造

### 推荐技术栈

**后端**:
- Node.js + Express/Fastify 或 Python + FastAPI
- PostgreSQL + Prisma 或 MongoDB
- Redis (缓存)
- JWT 认证

**AI 服务**:
- OpenRouter API (统一入口)
- 或直接 Anthropic/OpenAI API

**基础设施**:
- Docker 容器化
- Nginx 反向代理
- AWS/阿里云部署

---

## 7. 关键文件索引

### 必读文件

| 文件 | 用途 | 优先级 |
|-----|------|-------|
| `src/App.jsx` | 应用入口、路由配置 | ⭐⭐⭐ |
| `src/Layout.jsx` | 布局和初始化逻辑 | ⭐⭐⭐ |
| `src/lib/AuthContext.jsx` | 认证状态管理 | ⭐⭐⭐ |
| `src/api/base44Client.js` | SDK 配置 | ⭐⭐⭐ |
| `src/components/hooks/useChatState.jsx` | 聊天核心逻辑 | ⭐⭐⭐ |
| `functions/smartChatWithSearch.ts` | AI 聊天后端 | ⭐⭐⭐ |
| `functions/callAIModel.ts` | AI 调用封装 | ⭐⭐ |
| `src/utils/chatAPI.js` | 聊天 API 封装 | ⭐⭐ |
| `src/pages/Profile.jsx` | 用户中心 | ⭐⭐ |
| `src/pages/AdminDashboard.jsx` | 管理后台入口 | ⭐⭐ |

### 配置文件

| 文件 | 用途 |
|-----|------|
| `package.json` | 依赖和脚本 |
| `vite.config.js` | Vite 构建配置 |
| `tailwind.config.js` | Tailwind 主题 |
| `jsconfig.json` | 路径别名 |
| `postcss.config.js` | CSS 处理 |
| `eslint.config.js` | 代码检查 |
| `components.json` | shadcn/ui 配置 |

---

## 8. 附录

### A. 完整依赖列表

见 `package.json`，共 47 个生产依赖，22 个开发依赖。

### B. API 调用频率统计

| API | 调用位置数 | 重要性 |
|-----|-----------|-------|
| `base44.auth.me()` | 12+ | 高 |
| `base44.entities.*.filter()` | 20+ | 高 |
| `base44.functions.invoke()` | 15+ | 高 |
| `base44.entities.*.create()` | 10+ | 中 |
| `base44.entities.*.update()` | 8+ | 中 |

### C. 已知问题和限制

1. **无真正的流式响应** - AI 回复非实时
2. **无 OAuth 集成** - 仅支持 Base44 认证
3. **无支付功能** - 积分购买未实现
4. **单语言** - 仅中文界面

### D. 联系信息

如有疑问，请参考:
- 代码仓库中的 `functions/README_*.ts` 文档
- 项目 CHANGELOG.md
- Base44 SDK 文档

---

**文档生成**: Claude AI
**基于**: 代码库完整分析
