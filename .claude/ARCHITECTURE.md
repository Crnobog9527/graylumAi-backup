# ARCHITECTURE.md

<!--
  最后更新: 2026-01-11
  对应代码文件:
    - functions/smartChatWithSearch.ts
    - functions/callAIModel.ts
    - functions/compressConversation.ts
    - src/components/hooks/useChatState.jsx
  维护说明: 当上述文件结构或核心逻辑变更时，需同步更新本文档
-->

> Grayscale 项目系统架构文档

---

## 系统架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                    用户界面层 (React)                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │  shadcn/ui 组件  │  │ CSS Variables   │  │ Tailwind    │ │
│  │  (Radix UI)     │  │ 主题系统        │  │ CSS         │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   业务逻辑层 (.jsx)                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ useChatState.js │  │ 页面组件        │  │ 功能模块    │ │
│  │ 聊天状态管理     │  │ (18个页面)      │  │ 组件        │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                 API 集成层 (@base44/sdk)                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ base44Client.js │  │ entities.js     │  │ chatAPI.js  │ │
│  │ SDK 初始化      │  │ 实体定义        │  │ 聊天 API    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  后端服务层 (functions/)                     │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              smartChatWithSearch.ts (AI 核心)           ││
│  │  • 智能对话管理  • 搜索集成  • 上下文压缩  • Token管理  ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │                 callAIModel.ts (模型调用)               ││
│  │  • Claude API  • Prompt Caching  • 成本计算  • 重试    ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    业务云函数 (.ts)                     ││
│  │  • 用户管理  • 积分系统  • 工单处理  • 邀请奖励         ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                       外部服务                               │
│  ┌─────────────────────────┐  ┌───────────────────────────┐│
│  │     Claude API          │  │    Base44 BaaS 平台       ││
│  │     (Anthropic)         │  │    • 数据库  • 认证       ││
│  │  • Sonnet 4.5           │  │    • 文件存储  • 函数托管 ││
│  │  • Haiku 4.5            │  │                           ││
│  └─────────────────────────┘  └───────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## 目录结构说明

### 前端目录 (`src/`)

```
src/
├── api/                    # API 客户端层
│   ├── base44Client.js     # Base44 SDK 初始化和配置
│   ├── entities.js         # 数据实体定义 (User, Conversation 等)
│   └── integrations.js     # 第三方集成配置
│
├── assets/                 # 静态资源
│   └── [图片、字体等]
│
├── components/             # React 组件库
│   ├── admin/              # 管理后台组件 (9个)
│   ├── chat/               # 聊天功能组件 (15个)
│   │   ├── ChatInput.jsx       # 消息输入框
│   │   ├── ChatMessage.jsx     # 消息气泡
│   │   ├── ChatSidebar.jsx     # 对话列表侧边栏
│   │   └── ...
│   ├── common/             # 通用组件
│   ├── credits/            # 积分系统组件
│   ├── home/               # 首页组件
│   ├── hooks/              # 组件级 Hooks（含 useChatState.jsx）
│   ├── invite/             # 邀请系统组件
│   ├── layout/             # 布局组件
│   ├── marketplace/        # 市场组件
│   ├── modules/            # 功能模块组件
│   ├── profile/            # 用户资料组件
│   ├── tickets/            # 工单系统组件
│   └── ui/                 # UI 基础组件 (49个, shadcn/ui)
│       ├── button.jsx
│       ├── dialog.jsx
│       ├── toast.jsx
│       └── ...
│
├── constants/              # 常量定义
│
├── hooks/                  # 全局 Hooks
│   └── use-mobile.jsx      # 移动端检测
│   # 注意：useChatState.jsx 位于 components/hooks/ 目录
│
├── lib/                    # 工具库
│   ├── AuthContext.jsx     # 认证上下文
│   ├── NavigationTracker.jsx # 导航追踪
│   ├── query-client.js     # React Query 配置
│   └── utils.js            # 通用工具函数
│
├── pages/                  # 页面组件 (18个)
│   ├── Home.jsx            # 首页
│   ├── Chat.jsx            # 聊天页面 (核心)
│   ├── Profile.jsx         # 用户资料
│   ├── Marketplace.jsx     # 市场
│   ├── Admin.jsx           # 管理后台入口
│   ├── AdminDashboard.jsx  # 管理仪表盘
│   └── ...
│
└── utils/                  # 工具函数
    ├── apiCache.js         # API 缓存层
    ├── batchRequest.js     # 批量请求处理
    ├── chatAPI.js          # 聊天 API 封装
    └── index.ts            # 工具函数入口
```

### 后端目录 (`functions/`)

```
functions/
├── smartChatWithSearch.ts  # 智能聊天核心 (801行)
├── callAIModel.ts          # AI 模型调用 (718行)
├── taskClassifier.ts       # 任务分类器
├── searchClassifier.ts     # 搜索分类器
├── compressConversation.ts # 对话压缩 (148行)
├── tokenBudgetManager.ts   # Token 预算管理
├── processInviteReward.ts  # 邀请奖励处理
├── completeInviteReward.ts # 完成邀请奖励
├── autoCloseTickets.ts     # 自动关闭工单
├── changePassword.ts       # 密码修改
├── exportConversations.ts  # 对话导出
├── getChatStats.ts         # 聊天统计
├── getSearchAnalytics.ts   # 搜索分析
└── ...                     # 其他云函数
```

---

## AI 系统架构

### 核心文件职责

#### 1. smartChatWithSearch.ts (801行)

**主要职责:**
- 智能对话管理和路由
- 搜索功能集成
- 上下文历史处理
- 系统设置读取

**核心功能:**

```typescript
// 对话历史管理配置
const FULL_HISTORY_LIMIT = 10;          // 10轮内保持完整历史
const RECENT_MESSAGES_COUNT = 6;        // 超过10轮后保留最近6条
const COMPRESSION_CHECK_INTERVAL = 10;  // 每10条消息检查压缩
const COMPRESSION_TRIGGER_MESSAGES = 20; // >=20条消息触发压缩

// 缓存配置
const CACHE_TTL_MINUTES = 15;           // 搜索缓存15分钟
const SIMILARITY_THRESHOLD = 0.85;       // 相似度阈值
const WEB_SEARCH_COST = 0.005;          // 网络搜索成本
```

**处理流程:**
1. 用户认证验证
2. 读取系统设置 (智能路由、智能搜索)
3. 获取 AI 模型配置
4. Token 预算检查
5. 智能任务分类和模型选择
6. 搜索缓存检查/执行
7. 调用 `callAIModel` 获取响应
8. 更新对话历史

---

#### 2. callAIModel.ts (718行)

**主要职责:**
- Claude API 调用封装
- Prompt Caching 实现
- 成本计算和监控
- 错误处理和重试

**核心功能:**

```typescript
// Prompt Caching 配置
const CACHE_MIN_TOKENS = 1024;          // 最小缓存阈值
const MAX_CACHE_BREAKPOINTS = 4;        // 最多4个缓存断点

// 模型价格 (per 1M tokens)
const MODEL_RATES = {
  'sonnet': { input: 3.0, output: 15.0, cached: 0.3 },
  'haiku':  { input: 1.0, output: 5.0,  cached: 0.1 }
};
```

**Prompt Caching 策略:**
- 系统提示词 ≥1024 tokens 时启用缓存
- 对话历史倒数第4条消息添加缓存标记
- 最新3条消息不缓存 (内容变化频繁)

**成本监控:**
- 实时计算 Input/Output Token 成本
- 追踪缓存命中率和节省金额
- 详细日志输出便于调试

---

#### 3. useChatState.jsx (737行) - 位于 `src/components/hooks/`

**主要职责:**
- 前端聊天状态管理
- 对话历史维护
- UI 交互状态控制
- React Query 集成
- 功能模块自动发送逻辑

**状态结构:**

```javascript
// 核心状态
const [user, setUser] = useState(null);
const [selectedModel, setSelectedModel] = useState(null);
const [currentConversation, setCurrentConversation] = useState(null);
const [messages, setMessages] = useState([]);
const [isStreaming, setIsStreaming] = useState(false);
const [inputMessage, setInputMessage] = useState('');

// UI 状态
const [isSelectMode, setIsSelectMode] = useState(false);
const [uploadedFiles, setUploadedFiles] = useState([]);
const [showDebugPanel, setShowDebugPanel] = useState(false);
```

**数据查询:**
- `models` - AI 模型列表
- `promptModules` - Prompt 模块
- `conversations` - 用户对话列表
- `systemSettings` - 系统设置

---

### 模型选择策略

#### 智能路由规则

| 任务类型 | 推荐模型 | 原因 |
|----------|----------|------|
| 复杂分析、深度推理 | Sonnet 4.5 | 更强的推理能力 |
| 创意写作、长文本 | Sonnet 4.5 | 更好的生成质量 |
| 简单问答、闲聊 | Haiku 4.5 | 快速响应、低成本 |
| 代码解释、格式转换 | Haiku 4.5 | 足够处理简单任务 |

#### 路由决策流程

```
用户消息 → taskClassifier.ts → 任务分类
                ↓
        ┌───────┴───────┐
        ↓               ↓
    复杂任务         简单任务
        ↓               ↓
   Sonnet 4.5      Haiku 4.5
```

#### 系统设置控制

```typescript
// 可通过 SystemSettings 实体控制
enable_smart_routing: 'true' | 'false'      // 启用智能路由
enable_smart_search_decision: 'true' | 'false' // 启用智能搜索决策
```

---

## 设计系统

### UI 组件库

| 组件类型 | 数量 | 来源 |
|----------|------|------|
| 基础组件 | 49 | shadcn/ui (Radix UI) |
| 业务组件 | 56 | 自定义开发 |

### 主题系统

**实现方式:** CSS Variables + Tailwind CSS

```css
/* 示例变量 */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  /* ... */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... */
}
```

### 暗色模式

- **状态:** 已支持
- **切换方式:** `next-themes` 库
- **存储:** LocalStorage

### 设计进度

参考文档: `DESIGN_SYSTEM_PROGRESS.md`

---

## 前后端技术栈差异

| 维度 | 前端 | 后端 |
|------|------|------|
| **文件类型** | `.jsx` | `.ts` |
| **运行时** | 浏览器 (React) | Deno (Base44 Functions) |
| **配置文件** | `jsconfig.json` | 无独立配置 |
| **类型检查** | JSDoc + TypeScript (可选) | TypeScript 原生 |
| **依赖管理** | `package.json` + npm | `npm:` URL 导入 |
| **路径别名** | `@/` → `src/` | 无 |

### API 通信

**SDK 封装:** `@base44/sdk`

```javascript
// 前端调用
import { base44 } from '@/api/base44Client';
await base44.functions.invoke('smartChatWithSearch', { message });

// 后端接收
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
const base44 = createClientFromRequest(req);
```

---

## 部署流程

### 自动部署流程

```
1. 代码推送到 GitHub
         ↓
2. Base44 平台 Webhook 触发
         ↓
3. 云函数自动部署 (functions/)
         ↓
4. 前端资源构建 (Vite build)
         ↓
5. 静态资源部署到 CDN
         ↓
6. 部署完成通知
```

### 环境配置

| 环境 | 用途 |
|------|------|
| Development | 本地开发 (`npm run dev`) |
| Production | 生产环境 (Base44 托管) |

### 构建命令

```bash
# 开发
npm run dev

# 构建
npm run build

# 预览
npm run preview
```

---

## 性能优化策略

### 当前优化措施

#### 1. Prompt Caching (已实现)

- 缓存系统提示词 (≥1024 tokens)
- 缓存对话历史稳定部分
- 节省约 90% 的缓存 Token 成本

#### 2. 搜索缓存 (已实现)

- 15 分钟 TTL 缓存
- 基于查询 Hash 的精确匹配
- 自动过期清理

#### 3. 对话压缩 (已实现)

- 超过 20 条消息触发压缩
- 保留最近 6 条完整消息
- 历史消息生成摘要

#### 4. React Query 缓存 (已实现)

- 模型列表缓存
- 对话列表缓存
- 系统设置缓存

### 待优化项

| 问题 | 影响 | 建议方案 | 优先级 |
|------|------|----------|--------|
| ProfileComponents.jsx (1,348行) | 可选优化 | 拆分为子组件 | 低 |
| AdminAnnouncements.jsx (1,116行) | 可选优化 | 拆分为子组件 | 低 |
| 无代码分割 | 首屏加载慢 | React.lazy + Suspense | 中 |
| 无图片懒加载 | 带宽浪费 | Intersection Observer | 低 |

### 性能监控

**现有监控:**
- API 调用时间日志
- Token 使用量追踪
- 成本计算和统计

**建议添加:**
- 前端性能指标 (FCP, LCP, TTI)
- 错误追踪 (Sentry 等)
- 用户行为分析

---

## 数据流图

### 聊天消息流

```
用户输入消息
      ↓
[前端] useChatState.js
      │
      ├─→ 乐观更新 UI (显示用户消息)
      │
      └─→ 调用 base44.functions.invoke('smartChatWithSearch')
                    ↓
            [后端] smartChatWithSearch.ts
                    │
                    ├─→ 用户认证
                    ├─→ 读取系统设置
                    ├─→ 任务分类 (taskClassifier)
                    ├─→ 模型选择
                    ├─→ 搜索检查/执行
                    │
                    └─→ 调用 callAIModel.ts
                              │
                              ├─→ 构建 Prompt Cache
                              ├─→ 调用 Claude API
                              └─→ 返回响应
                    ↓
            返回 AI 响应
      ↓
[前端] 更新 messages 状态
      ↓
UI 渲染 AI 回复
```

---

*本文件由 Claude Code 自动生成，如有更新请同步维护*
