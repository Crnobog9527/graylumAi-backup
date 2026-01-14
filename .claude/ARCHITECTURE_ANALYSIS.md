# GraylumAI 项目架构分析报告

**文档版本**: 1.0
**生成日期**: 2026-01-14
**项目代号**: base44-app

---

## 目录

1. [当前/旧架构分析](#1-当前旧架构分析)
2. [目标/新架构规划](#2-目标新架构规划)
3. [完整功能和UI清单](#3-完整功能和ui清单)
4. [迁移差异对比](#4-迁移差异对比)

---

## 1. 当前/旧架构分析

### 1.1 框架/技术栈

| 类别 | 技术 | 版本 | 说明 |
|------|------|------|------|
| **前端框架** | React | 18.2.0 | 单页应用 (SPA) |
| **构建工具** | Vite | 6.1.0 | 快速构建和热更新 |
| **路由管理** | react-router-dom | 6.26.0 | 客户端路由 |
| **状态管理** | @tanstack/react-query | 5.84.1 | 服务端状态管理 |
| **UI 组件库** | shadcn/ui (Radix UI) | 最新 | 49个基础组件 |
| **样式框架** | Tailwind CSS | 3.4.17 | 原子化 CSS |
| **后端服务** | Base44 BaaS | ^0.8.3 | 平台即服务 |
| **AI 模型** | Claude API | - | Sonnet 4.5 / Haiku 4.5 |
| **图标库** | lucide-react | ^0.475.0 | 图标系统 |
| **图表库** | recharts | ^2.15.4 | 数据可视化 |
| **表单验证** | zod | ^3.24.2 | 运行时验证 |
| **主题系统** | next-themes | ^0.4.4 | 暗色/亮色模式切换 |

### 1.2 文件结构

```
graylumAi-backup/
├── src/                          # 前端源码 (约 40,711 行)
│   ├── api/                      # API 客户端层
│   │   ├── base44Client.js       # Base44 SDK 初始化
│   │   ├── entities.js           # 实体定义
│   │   └── integrations.js       # 第三方集成配置
│   │
│   ├── assets/                   # 静态资源
│   │   └── react.svg
│   │
│   ├── components/               # React 组件 (105个)
│   │   ├── ui/                   # shadcn/ui 基础组件 (49个)
│   │   ├── chat/                 # 聊天功能组件 (15个)
│   │   ├── admin/                # 管理后台组件 (11个)
│   │   ├── profile/              # 用户资料组件 (5个)
│   │   ├── tickets/              # 工单系统组件 (8个)
│   │   ├── credits/              # 积分系统组件 (2个)
│   │   ├── invite/               # 邀请系统组件 (1个)
│   │   ├── marketplace/          # 市场组件 (1个)
│   │   ├── modules/              # 功能模块组件 (4个)
│   │   ├── layout/               # 布局组件 (2个)
│   │   ├── common/               # 通用组件 (2个)
│   │   ├── home/                 # 首页组件 (3个)
│   │   └── hooks/                # 组件级 Hooks
│   │       └── useChatState.jsx  # 聊天状态管理 (737行)
│   │
│   ├── hooks/                    # 全局 Hooks
│   │   └── use-mobile.jsx        # 移动端检测
│   │
│   ├── lib/                      # 工具库
│   │   ├── AuthContext.jsx       # 认证上下文
│   │   ├── NavigationTracker.jsx # 导航追踪
│   │   ├── query-client.js       # React Query 配置
│   │   ├── utils.js              # 通用工具函数
│   │   └── app-params.js         # 应用参数
│   │
│   ├── pages/                    # 页面组件 (18个)
│   │
│   ├── constants/                # 常量定义
│   │
│   └── utils/                    # 工具函数
│       ├── apiCache.js           # API 缓存层
│       ├── batchRequest.js       # 批量请求处理
│       └── chatAPI.js            # 聊天 API 封装
│
├── functions/                    # 后端云函数 (28个 TypeScript 文件)
│   ├── smartChatWithSearch.ts    # AI 聊天核心 (801行)
│   ├── callAIModel.ts            # AI 模型调用 (718行)
│   ├── compressConversation.ts   # 对话压缩 (148行)
│   ├── aiPerformanceMonitor.ts   # AI 性能监控 (352行)
│   └── [其他业务函数]
│
├── .claude/                      # 项目知识库文档
├── architecture_refactoring/     # 架构重构方案
│
├── package.json                  # 依赖配置
├── vite.config.js                # Vite 构建配置
├── tailwind.config.js            # Tailwind 配置
├── jsconfig.json                 # 路径别名配置
└── components.json               # shadcn/ui 配置
```

### 1.3 样式方案

| 方案 | 说明 |
|------|------|
| **主要方案** | Tailwind CSS 原子化类 |
| **主题系统** | CSS Variables (支持 light/dark mode) |
| **设计文件** | `src/theme.css` (376行) - 设计系统变量 |
| **组件样式** | `src/components.css` (1224行) - 组件样式库 |
| **颜色方案** | 深色主题 (#0A0A0A) + 金色点缀 (#FFD700) |

**核心颜色变量**:
```css
--color-primary: #FFD700;    /* 金色主色 */
--color-secondary: #FFA500;  /* 橙金辅助 */
--bg-primary: #0A0A0A;       /* 深黑背景 */
--bg-secondary: #1A1A1A;     /* 卡片背景 */
```

### 1.4 状态管理

| 类型 | 方案 | 说明 |
|------|------|------|
| **服务端状态** | @tanstack/react-query | 自动缓存、后台刷新、请求重试 |
| **聊天状态** | useChatState.jsx (自定义 Hook) | 737行，管理对话、消息、模型选择等 |
| **认证状态** | AuthContext.jsx (React Context) | 用户登录、权限控制 |
| **UI 状态** | useState/useRef | 组件级局部状态 |

### 1.5 路由系统

| 特性 | 说明 |
|------|------|
| **路由库** | react-router-dom v6.26.0 |
| **路由模式** | 客户端路由 (BrowserRouter) |
| **配置方式** | `pages.config.js` 集中配置 |
| **懒加载** | React.lazy + Suspense |
| **权限控制** | AuthProvider 包裹，统一认证检查 |

**路由列表**:
- `/` → Home (首页)
- `/Chat` → Chat (聊天)
- `/Profile` → Profile (用户资料)
- `/Marketplace` → Marketplace (市场)
- `/Templates` → Templates (模板)
- `/Admin` → Admin (管理后台入口)
- `/AdminDashboard` → 管理仪表盘
- `/AdminUsers` → 用户管理
- `/AdminModels` → AI 模型管理
- `/AdminPackages` → 套餐管理
- `/AdminPrompts` → Prompt 管理
- `/AdminInvitations` → 邀请码管理
- `/AdminTransactions` → 交易记录
- `/AdminFinance` → 财务管理
- `/AdminTickets` → 工单管理
- `/AdminAnnouncements` → 公告管理
- `/AdminSettings` → 系统设置
- `/AdminPerformance` → AI 性能监控

### 1.6 API/后端架构

| 特性 | 说明 |
|------|------|
| **后端方案** | Base44 BaaS 云函数 |
| **运行时** | Deno (TypeScript) |
| **SDK 版本** | @base44/sdk ^0.8.3 |
| **云函数数量** | 28 个 |
| **API 调用方式** | `base44.functions.invoke('functionName', data)` |

**核心云函数**:

| 函数名 | 行数 | 职责 |
|--------|------|------|
| `smartChatWithSearch.ts` | 801 | AI 聊天核心逻辑 |
| `callAIModel.ts` | 718 | Claude API 调用封装 |
| `aiPerformanceMonitor.ts` | 352 | AI 性能监控 |
| `compressConversation.ts` | 148 | 对话历史压缩 |
| `taskClassifier.ts` | - | 任务分类器 (智能路由) |
| `searchClassifier.ts` | - | 搜索分类器 |
| `tokenBudgetManager.ts` | - | Token 预算管理 |
| `processInviteReward.ts` | - | 邀请奖励处理 |
| `completeInviteReward.ts` | - | 完成邀请奖励 |
| `exportConversations.ts` | - | 对话导出 |
| `getChatStats.ts` | - | 聊天统计 |
| `autoCloseTickets.ts` | - | 自动关闭工单 |
| `changePassword.ts` | - | 密码修改 |
| `verifyEmail.ts` | - | 邮箱验证 |
| `sendVerificationEmail.ts` | - | 发送验证邮件 |

### 1.7 构建工具

| 工具 | 版本 | 用途 |
|------|------|------|
| **Vite** | 6.1.0 | 开发服务器 + 生产构建 |
| **@base44/vite-plugin** | ^0.2.5 | Base44 平台集成 |
| **@vitejs/plugin-react** | ^4.3.4 | React 支持 |
| **PostCSS** | ^8.5.3 | CSS 处理 |
| **Autoprefixer** | ^10.4.20 | CSS 前缀 |
| **ESLint** | ^9.19.0 | 代码检查 |
| **Prettier** | ^3.4.2 | 代码格式化 |
| **TypeScript** | ^5.8.2 | 类型检查 (仅云函数) |

**构建命令**:
```bash
npm run dev          # 开发服务器
npm run build        # 生产构建
npm run lint         # 代码检查
npm run lint:fix     # 自动修复
npm run format       # 格式化
npm run typecheck    # 类型检查
npm run preview      # 预览构建
```

### 1.8 托管平台

| 特性 | 说明 |
|------|------|
| **托管平台** | Base44 平台 |
| **部署方式** | 自动部署 (GitHub Webhook) |
| **CDN** | Base44 平台内置 |
| **函数托管** | Base44 云函数 (Deno Runtime) |

---

## 2. 目标/新架构规划

> 基于 `architecture_refactoring/` 目录下的方案文档

### 2.1 框架/技术栈

| 类别 | 技术 | 说明 |
|------|------|------|
| **代码库管理** | Turborepo | Monorepo 架构，统一管理前后端 |
| **前端框架** | Next.js 14 (App Router) | SSR/SSG/ISR 支持 |
| **UI 组件库** | Shadcn/ui | 保持现有组件库 |
| **状态管理** | Zustand + TanStack Query | 客户端 + 服务端状态分离 |
| **API 层** | tRPC | 端到端类型安全 |
| **数据库 ORM** | Drizzle ORM | 轻量高性能 ORM |
| **数据验证** | Zod | 运行时验证 + 类型生成 |
| **认证** | Supabase Auth | 用户管理 + RLS |
| **测试框架** | Vitest + React Testing Library | 单元测试 + 组件测试 |
| **CI/CD** | GitHub Actions | 自动化测试和部署 |

### 2.2 样式方案

| 方案 | 说明 |
|------|------|
| **主要方案** | Tailwind CSS (保持) |
| **组件库** | Shadcn/ui (保持) |
| **主题系统** | CSS Variables (保持) |
| **设计系统** | 深色主题 + 金色点缀 (保持) |

### 2.3 后端/数据库

| 特性 | 说明 |
|------|------|
| **后端方案** | Next.js API Routes + tRPC |
| **数据库** | Supabase PostgreSQL |
| **ORM** | Drizzle ORM |
| **认证** | Supabase Auth |
| **数据安全** | Row Level Security (RLS) |
| **迁移管理** | drizzle-kit |

### 2.4 其他技术

| 技术 | 用途 |
|------|------|
| **Zod** | API 输入验证 + 类型生成 |
| **Husky** | Git Hooks 管理 |
| **pnpm** | 包管理器 |
| **TypeScript** | 端到端类型安全 |

### 2.5 托管平台

| 特性 | 说明 |
|------|------|
| **前端托管** | Vercel |
| **数据库** | Supabase |
| **边缘函数** | Vercel Edge Functions |
| **CDN** | Vercel Edge Network |

### 2.6 新架构目录结构

```
graylumAi-new/
├── apps/
│   └── web/                      # Next.js 前端应用
│       ├── src/
│       │   ├── app/              # Next.js App Router
│       │   ├── components/       # UI 组件
│       │   ├── lib/              # 工具函数
│       │   └── trpc/             # tRPC 客户端
│       └── package.json
│
├── packages/
│   ├── api/                      # tRPC 后端路由和逻辑
│   ├── db/                       # Drizzle ORM Schema
│   ├── ui/                       # 共享 UI 组件
│   ├── eslint-config-custom/     # ESLint 配置
│   └── tsconfig/                 # TypeScript 配置
│
├── package.json
└── turborepo.json
```

---

## 3. 完整功能和UI清单

### 3.1 所有页面/路由

| 路由 | 页面文件 | 类型 | 说明 |
|------|----------|------|------|
| `/` | Home.jsx | 公开 | 首页，欢迎横幅、快速入门、更新区 |
| `/Chat` | Chat.jsx | 需认证 | AI 聊天主页面 |
| `/Profile` | Profile.jsx | 需认证 | 用户资料、积分、工单 |
| `/Marketplace` | Marketplace.jsx | 公开 | 功能模块市场 |
| `/Templates` | Templates.jsx | 需认证 | 模板管理 |
| `/Admin` | Admin.jsx | 管理员 | 管理后台入口 |
| `/AdminDashboard` | AdminDashboard.jsx | 管理员 | 管理仪表盘 |
| `/AdminUsers` | AdminUsers.jsx | 管理员 | 用户管理 |
| `/AdminModels` | AdminModels.jsx | 管理员 | AI 模型管理 |
| `/AdminPackages` | AdminPackages.jsx | 管理员 | 套餐管理 |
| `/AdminPrompts` | AdminPrompts.jsx | 管理员 | Prompt 管理 |
| `/AdminInvitations` | AdminInvitations.jsx | 管理员 | 邀请码管理 |
| `/AdminTransactions` | AdminTransactions.jsx | 管理员 | 交易记录 |
| `/AdminFinance` | AdminFinance.jsx | 管理员 | 财务管理 |
| `/AdminTickets` | AdminTickets.jsx | 管理员 | 工单管理 |
| `/AdminAnnouncements` | AdminAnnouncements.jsx | 管理员 | 公告管理 |
| `/AdminSettings` | AdminSettings.jsx | 管理员 | 系统设置 |
| `/AdminPerformance` | AdminPerformance.jsx | 管理员 | AI 性能监控 |

### 3.2 UI 组件清单

#### 3.2.1 基础 UI 组件 (shadcn/ui) - 49 个

| 组件 | 文件 | 说明 |
|------|------|------|
| Accordion | accordion.jsx | 手风琴 |
| Alert | alert.jsx | 警告提示 |
| AlertDialog | alert-dialog.jsx | 警告对话框 |
| AspectRatio | aspect-ratio.jsx | 宽高比容器 |
| Avatar | avatar.jsx | 头像 |
| Badge | badge.jsx | 徽章 |
| Breadcrumb | breadcrumb.jsx | 面包屑 |
| Button | button.jsx | 按钮 |
| Calendar | calendar.jsx | 日历 |
| Card | card.jsx | 卡片 |
| Carousel | carousel.jsx | 轮播 |
| Chart | chart.jsx | 图表 |
| Checkbox | checkbox.jsx | 复选框 |
| Collapsible | collapsible.jsx | 折叠面板 |
| Command | command.jsx | 命令面板 |
| ContextMenu | context-menu.jsx | 右键菜单 |
| Dialog | dialog.jsx | 对话框 |
| Drawer | drawer.jsx | 抽屉 |
| DropdownMenu | dropdown-menu.jsx | 下拉菜单 |
| Form | form.jsx | 表单 |
| HoverCard | hover-card.jsx | 悬停卡片 |
| Input | input.jsx | 输入框 |
| InputOTP | input-otp.jsx | OTP 输入 |
| Label | label.jsx | 标签 |
| Menubar | menubar.jsx | 菜单栏 |
| NavigationMenu | navigation-menu.jsx | 导航菜单 |
| Pagination | pagination.jsx | 分页 |
| Popover | popover.jsx | 弹出框 |
| Progress | progress.jsx | 进度条 |
| RadioGroup | radio-group.jsx | 单选组 |
| Resizable | resizable.jsx | 可调整大小 |
| ScrollArea | scroll-area.jsx | 滚动区域 |
| Select | select.jsx | 选择器 |
| Separator | separator.jsx | 分隔线 |
| Sheet | sheet.jsx | 侧边栏 |
| Sidebar | sidebar.jsx | 侧边导航 |
| Skeleton | skeleton.jsx | 骨架屏 |
| Slider | slider.jsx | 滑块 |
| Sonner | sonner.jsx | 通知 |
| Switch | switch.jsx | 开关 |
| Table | table.jsx | 表格 |
| Tabs | tabs.jsx | 标签页 |
| Textarea | textarea.jsx | 多行输入 |
| Toast | toast.jsx | 吐司通知 |
| Toaster | toaster.jsx | 通知容器 |
| Toggle | toggle.jsx | 切换按钮 |
| ToggleGroup | toggle-group.jsx | 切换组 |
| Tooltip | tooltip.jsx | 工具提示 |
| useToast | use-toast.jsx | Toast Hook |

#### 3.2.2 聊天组件 - 15 个

| 组件 | 文件 | 说明 |
|------|------|------|
| ChatInput | ChatInput.jsx | 消息输入框 |
| ChatInputArea | ChatInputArea.jsx | 输入区域容器 |
| ChatMessage | ChatMessage.jsx | 单条消息 |
| ChatMessages | ChatMessages.jsx | 消息列表 |
| ChatSidebar | ChatSidebar.jsx | 对话列表侧边栏 |
| ChatHeader | ChatHeader.jsx | 聊天头部 |
| ChatDebugPanel | ChatDebugPanel.jsx | 调试面板 |
| MessageBubble | MessageBubble.jsx | 消息气泡 |
| ModelSelector | ModelSelector.jsx | AI 模型选择器 |
| PromptModuleCard | PromptModuleCard.jsx | Prompt 模块卡片 |
| PromptModuleGrid | PromptModuleGrid.jsx | 模块网格 |
| TemplateCard | TemplateCard.jsx | 模板卡片 |
| TokenUsageStats | TokenUsageStats.jsx | Token 使用统计 |
| FileAttachmentCard | FileAttachmentCard.jsx | 文件附件卡片 |
| ActiveModuleBanner | ActiveModuleBanner.jsx | 活跃模块横幅 |

#### 3.2.3 管理后台组件 - 11 个

| 组件 | 文件 | 说明 |
|------|------|------|
| AdminSidebar | AdminSidebar.jsx | 管理侧边栏 |
| StatsCard | StatsCard.jsx | 统计卡片 |
| SystemStats | SystemStats.jsx | 系统统计 |
| UserManagement | UserManagement.jsx | 用户管理 |
| TicketManagement | TicketManagement.jsx | 工单管理 |
| ModelManagement | ModelManagement.jsx | 模型管理 |
| TemplateManagement | TemplateManagement.jsx | 模板管理 |
| AIPerformanceMonitor | AIPerformanceMonitor.jsx | AI 性能监控 |
| MembershipPermissionsCard | MembershipPermissionsCard.jsx | 会员权限卡片 |
| LanguageContext | LanguageContext.jsx | 语言上下文 |

#### 3.2.4 其他业务组件

**用户资料组件 (5个)**:
- ProfileComponents.jsx (1,348行) - 主资料组件
- PersonalInfoCard.jsx - 个人信息卡片
- AvatarCropper.jsx - 头像裁剪
- CreditsDialog.jsx - 积分对话框
- TicketsPanel.jsx - 工单面板

**工单组件 (8个)**:
- TicketCard.jsx - 工单卡片
- TicketInfo.jsx - 工单详情
- TicketStatusBadge.jsx - 状态徽章
- TicketPriorityBadge.jsx - 优先级徽章
- TicketReplyForm.jsx - 回复表单
- TicketReplyList.jsx - 回复列表
- TicketClosedNotice.jsx - 已关闭提示
- LoadingSpinner.jsx - 加载动画

**积分组件 (2个)**:
- CreditBalance.jsx - 积分余额
- CreditPackageCard.jsx - 积分套餐卡片

**布局组件 (2个)**:
- AppHeader.jsx - 应用头部
- GlobalBanner.jsx - 全局横幅

**首页组件 (3个)**:
- WelcomeBanner.jsx - 欢迎横幅
- QuickStartGuide.jsx - 快速入门指南
- UpdatesSection.jsx - 更新区

**功能模块组件 (4个)**:
- ModuleCard.jsx - 模块卡片
- ModuleDetailDialog.jsx - 模块详情对话框
- moduleIcons.jsx - 模块图标
- iconConfig.jsx - 图标配置

**通用组件 (2个)**:
- ConversationList.jsx - 对话列表
- CreditDisplay.jsx - 积分显示

**其他 (2个)**:
- InviteDialog.jsx - 邀请对话框
- FeaturedModules.jsx - 精选模块

### 3.3 功能特性清单

#### 3.3.1 AI 聊天系统 (核心)

| 功能 | 说明 | 关键文件 |
|------|------|----------|
| 多模型支持 | Claude Sonnet 4.5 / Haiku 4.5 智能路由 | callAIModel.ts |
| 智能任务分类 | 自动识别任务复杂度选择模型 | taskClassifier.ts |
| 智能搜索 | 集成网络搜索增强回答 | smartChatWithSearch.ts |
| 上下文压缩 | 超过20条消息自动压缩历史 | compressConversation.ts |
| Token 预算管理 | 积分扣减和预算检查 | tokenBudgetManager.ts |
| Prompt Caching | 缓存系统提示词降低成本 | callAIModel.ts |
| 对话历史管理 | 保存、加载、删除对话 | useChatState.jsx |
| 文件附件 | 支持文件上传分析 | extractFileContent.ts |
| 功能模块 | 预设 Prompt 模块快速启动 | PromptModuleGrid.jsx |
| 模板系统 | 对话模板管理 | Templates.jsx |

#### 3.3.2 用户系统

| 功能 | 说明 | 关键文件 |
|------|------|----------|
| 注册/登录 | 账号认证 | AuthContext.jsx |
| 邮箱验证 | 邮箱验证流程 | verifyEmail.ts |
| 密码修改 | 安全密码更新 | changePassword.ts |
| 用户资料 | 个人信息管理 | Profile.jsx |
| 头像裁剪 | 自定义头像 | AvatarCropper.jsx |

#### 3.3.3 邀请码系统

| 功能 | 说明 | 关键文件 |
|------|------|----------|
| 邀请码生成 | 生成邀请链接 | AdminInvitations.jsx |
| 邀请奖励 | 邀请成功奖励积分 | processInviteReward.ts |
| 奖励完成 | 被邀请人完成任务触发 | completeInviteReward.ts |
| 邀请追踪 | 追踪邀请状态 | InviteDialog.jsx |

#### 3.3.4 积分/Credits 系统

| 功能 | 说明 | 关键文件 |
|------|------|----------|
| 积分余额 | 显示当前积分 | CreditBalance.jsx |
| 积分充值 | 购买积分套餐 | AdminPackages.jsx |
| 积分消耗 | AI 调用扣减积分 | tokenBudgetManager.ts |
| 交易记录 | 积分变动历史 | AdminTransactions.jsx |

#### 3.3.5 套餐订阅

| 功能 | 说明 | 关键文件 |
|------|------|----------|
| 套餐管理 | 配置订阅套餐 | AdminPackages.jsx |
| 会员权限 | 不同套餐权限配置 | MembershipPermissionsCard.jsx |

#### 3.3.6 工单支持系统

| 功能 | 说明 | 关键文件 |
|------|------|----------|
| 创建工单 | 用户提交问题 | TicketsPanel.jsx |
| 工单列表 | 查看工单状态 | TicketCard.jsx |
| 工单回复 | 用户/管理员回复 | TicketReplyForm.jsx |
| 自动关闭 | 超时自动关闭 | autoCloseTickets.ts |
| 工单管理 | 管理员处理工单 | AdminTickets.jsx |

#### 3.3.7 管理后台

| 功能页面 | 说明 |
|----------|------|
| 仪表盘 | 系统概览统计 |
| 用户管理 | 用户列表、禁用、权限 |
| AI 模型管理 | 模型配置、开关 |
| 套餐管理 | 套餐配置、价格 |
| Prompt 管理 | 系统 Prompt、模块 |
| 邀请码管理 | 批量生成、追踪 |
| 交易记录 | 充值、消费记录 |
| 财务管理 | 收入统计 |
| 工单管理 | 工单处理 |
| 公告管理 | 系统公告 |
| 系统设置 | 全局配置 |
| AI 性能监控 | Token 使用、响应时间 |

### 3.4 第三方集成

| 集成 | 说明 | 位置 |
|------|------|------|
| Claude API (Anthropic) | AI 模型调用 | callAIModel.ts |
| Base44 Core.InvokeLLM | LLM 调用集成 | integrations.js |
| Base44 Core.SendEmail | 邮件发送 | integrations.js |
| Base44 Core.SendSMS | 短信发送 | integrations.js |
| Base44 Core.UploadFile | 文件上传 | integrations.js |
| Base44 Core.GenerateImage | 图片生成 | integrations.js |
| Base44 Core.ExtractDataFromUploadedFile | 文件内容提取 | integrations.js |

### 3.5 资源文件

| 类型 | 说明 |
|------|------|
| **图片** | src/assets/react.svg (仅有 SVG) |
| **字体** | 使用系统字体 |
| **图标** | lucide-react 图标库 |
| **视频** | 无 |

### 3.6 关键用户流程

#### 3.6.1 新用户注册流程
```
1. 访问首页 → 点击注册
2. 填写注册信息
3. 接收验证邮件
4. 验证邮箱
5. 完成注册 → 自动登录
6. 引导至聊天页面
```

#### 3.6.2 AI 聊天流程
```
1. 登录系统
2. 进入 /Chat 页面
3. (可选) 选择功能模块/模板
4. 输入问题消息
5. 系统智能分类任务复杂度
6. 选择合适模型 (Sonnet/Haiku)
7. (可选) 触发智能搜索
8. 调用 Claude API
9. 流式返回响应
10. 扣减用户积分
11. 保存对话历史
```

#### 3.6.3 积分充值流程
```
1. 进入 /Profile
2. 查看积分余额
3. 点击充值
4. 选择积分套餐
5. 完成支付
6. 积分到账
7. 生成交易记录
```

#### 3.6.4 邀请好友流程
```
1. 进入 /Profile
2. 点击邀请好友
3. 获取邀请链接/邀请码
4. 分享给好友
5. 好友通过链接注册
6. 好友完成任务
7. 双方获得积分奖励
```

#### 3.6.5 工单提交流程
```
1. 进入 /Profile → 工单
2. 点击新建工单
3. 填写问题描述
4. 提交工单
5. 等待管理员回复
6. 查看回复/补充信息
7. 问题解决 → 关闭工单
```

---

## 4. 迁移差异对比

| 维度 | 当前架构 | 目标架构 |
|------|----------|----------|
| **类型安全** | ❌ 纯 JavaScript (前端) | ✅ 端到端 TypeScript |
| **代码组织** | 单体应用 | ✅ Turborepo Monorepo |
| **API 层** | Base44 云函数调用 | ✅ tRPC (类型安全 RPC) |
| **数据库** | Base44 内置数据库 | ✅ Supabase PostgreSQL |
| **ORM** | 无 (SDK 直接访问) | ✅ Drizzle ORM |
| **认证** | Base44 Auth | ✅ Supabase Auth |
| **状态管理** | React Query + Context | ✅ TanStack Query + Zustand |
| **构建工具** | Vite | ✅ Next.js (内置) |
| **SSR/SSG** | ❌ 无 | ✅ Next.js App Router |
| **托管平台** | Base44 | ✅ Vercel + Supabase |
| **CI/CD** | ❌ 无 | ✅ GitHub Actions |
| **测试** | ❌ 无 | ✅ Vitest + RTL |
| **厂商锁定** | 🔒 深度绑定 Base44 | 🌐 完全开源 |

---

## 附录

### A. 代码统计

| 指标 | 数值 |
|------|------|
| 总文件数 | ~193 个 |
| 总代码行数 | ~40,711 行 |
| 组件数量 | 105 个 |
| 页面数量 | 18 个 |
| UI 基础组件 | 49 个 |
| 云函数数量 | 28 个 |

### B. 大文件清单

| 文件 | 行数 | 建议 |
|------|------|------|
| ProfileComponents.jsx | 1,348 | 可选拆分 |
| AdminAnnouncements.jsx | 1,116 | 可选拆分 |
| smartChatWithSearch.ts | 801 | 功能复杂，合理 |
| useChatState.jsx | 737 | 功能复杂，合理 |
| callAIModel.ts | 718 | 功能复杂，合理 |

### C. 参考文档

- `.claude/PROJECT_CONTEXT.md` - 项目上下文
- `.claude/ARCHITECTURE.md` - 系统架构
- `.claude/CODING_STANDARDS.md` - 编码规范
- `architecture_refactoring/architecture_refactoring_proposal.md` - 重构方案
- `architecture_refactoring/architecture_issues.json` - 问题分析

---

*本文档由 Claude Code 自动生成 - 2026-01-14*
