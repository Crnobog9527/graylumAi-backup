# GraylumAI 项目迁移评估报告

**文档版本**: 1.0
**生成日期**: 2026-01-14

---

## 1. 项目架构概览

根据对交接文档 [1] 和代码库的分析，GraylumAI 项目是一个前后端分离的单体仓库（Monorepo）应用。其核心架构围绕 Base44 平台提供的后端即服务（BaaS）能力构建。

### 1.1. 前端架构

前端是一个基于 **React** 的单页面应用（SPA），技术栈详情如下：

| 技术类别 | 主要技术栈 |
|---|---|
| **核心框架** | React 18.2.0, Vite 6.1.0 |
| **UI 与样式** | Radix UI, shadcn/ui, Tailwind CSS 3.4.17 |
| **路由管理** | React Router DOM 6.26.0 |
| **状态管理** | React Context (全局认证), TanStack React Query (服务端状态), React Hook Form (表单) |
| **API 请求** | `@base44/sdk` (所有后端交互均通过此SDK) |

项目包含 **18个** 页面组件和 **106个** 可复用组件，结构清晰，组件化程度高。所有与后端服务的交互都统一通过 `src/api/` 目录下的模块进行，这为后续的迁移工作提供了便利。

### 1.2. 后端架构 (基于 Base44)

后端完全依赖 Base44 平台提供的服务，代码库中的 `functions/` 目录包含了 **21个** 云函数，用于处理自定义业务逻辑。后端功能可归纳为以下几类：

- **用户认证与管理**: Base44 Auth 提供了完整的用户注册、登录、登出和信息管理流程。
- **数据库**: 使用 Base44 的数据实体服务，共定义了 **18个** 主要数据模型。
- **云函数**: 通过 `base44.functions.invoke()` 执行自定义的 TypeScript 后端逻辑。
- **集成服务**: 利用 Base44 集成第三方服务，如邮件、支付等。

这种架构的特点是前端业务逻辑复杂，而后端则高度依赖平台能力，迁移的核心工作在于将这些平台依赖替换为 Supabase 和 Vercel 的对应服务。

---

## 2. Base44 依赖清单

通过对代码库的全面扫描，我们识别出对 Base44 SDK 的调用共计 **315** 处。这些调用分布在前端组件和后端云函数中，具体分类如下：

| Base44 服务类别 | 调用次数 | 主要用途 |
|---|---|---|
| **数据实体 (`base44.entities.*`)** | 116 | 对数据库进行增删改查（CRUD）操作 |
| **服务角色 (`base44.asServiceRole.*`)** | 71 | 执行需要管理员权限的后端操作 |
| **认证 (`base44.auth.*`)** | 63 | 处理用户登录、注册、信息获取、登出等 |
| **云函数 (`base44.functions.invoke()`)** | 43 | 调用自定义的后端业务逻辑 |
| **集成服务 (`base44.integrations.*`)** | 15 | 调用邮件、支付等第三方集成服务 |
| **总计** | **308** | |

*注：统计数据基于静态代码分析，可能与实际运行时调用略有差异。*

依赖主要集中在以下几个方面：

- **认证流程**: `src/lib/AuthContext.jsx` 和所有管理后台页面都深度依赖 `base44.auth`。
- **数据操作**: 项目中几乎所有的页面和组件都通过 `base44.entities` 或 `base44.asServiceRole.entities` 与数据库交互。
- **核心业务逻辑**: AI 聊天、工单系统、积分管理等核心功能均通过调用云函数实现。

完整的依赖调用列表已保存至 `project_analysis.json` 文件，可供后续详细审计 [2]。

---

## 3. 数据库 Schema 分析

项目数据库结构通过分析代码中定义的 **18个** 数据实体推断得出。这些实体构成了应用的核心数据模型。由于无法直接访问数据库，以下分析基于交接文档和代码中的实体调用情况。

| 实体名称 (推断表名) | 主要字段 (推断) | 功能描述 |
|---|---|---|
| `User` | `id`, `email`, `nickname`, `avatar_url`, `role`, `credits` | 存储用户信息、角色和积分 |
| `Conversation` | `id`, `created_by`, `title`, `messages`, `model_id` | 存储 AI 对话的完整历史记录 |
| `CreditTransaction` | `user_id`, `amount`, `type`, `description`, `created_at` | 记录用户积分的增减流水 |
| `AIModel` | `id`, `name`, `provider`, `endpoint`, `config` | 配置可用的 AI 模型及其参数 |
| `Ticket` | `id`, `user_id`, `title`, `status`, `created_at` | 用户提交的工单信息 |
| `SystemSettings` | `key`, `value` | 存储系统级的配置，如公告、功能开关等 |
| `CreditPackage` | `id`, `name`, `price`, `credits_amount` | 定义可供购买的积分套餐 |
| `Invitation` | `code`, `created_by`, `used_by`, `status` | 存储邀请码及其使用状态 |

**关系分析**:
- `User` 与 `Conversation`, `CreditTransaction`, `Ticket` 之间存在一对多关系。
- `Conversation` 与 `Message` (嵌入字段) 存在一对多关系。
- `Ticket` 与 `TicketReply` 存在一对多关系。

**迁移注意事项**:
- 需要将这些逻辑实体映射到 Supabase 的 PostgreSQL 表结构。
- 字段类型需要仔细确认，特别是 JSON 类型的字段（如 `Conversation.messages`）。
- 数据的导出和导入是迁移过程中的关键风险点，需要制定详细的脚本和验证方案。

---

## 4. 认证流程分析

应用的认证流程完全由 Base44 托管，前端通过重定向到 Base44 的标准页面完成注册和登录。

### 4.1. 注册流程
1. 前端调用 `base44.auth.redirectToSignup()`。
2. 用户在 Base44 托管页面完成注册。
3. 页面重定向回应用，URL 中携带 `access_token`。
4. 前端 `src/lib/app-params.js` 捕获 `access_token` 并存入 `localStorage`。
5. 后端触发新用户奖励逻辑（如发放积分）。

### 4.2. 登录流程
1. 前端调用 `base44.auth.redirectToLogin()`。
2. 用户在 Base44 托管页面完成登录。
3. 页面重定向回应用，URL 中携带 `access_token`。
4. 前端捕获 `access_token` 并存入 `localStorage`。
5. `src/lib/AuthContext.jsx` 调用 `base44.auth.me()` 获取用户信息，完成前端认证状态更新。

### 4.3. 权限验证
- **角色权限**: 主要通过前端检查用户对象的 `role` 字段（`user` 或 `admin`）来控制页面访问，例如在每个管理后台页面的入口处进行判断。
- **登录状态**: `AuthContext` 维护全局的 `isAuthenticated` 状态，用于控制需要登录才能访问的页面。

**迁移策略**: 整个认证流程需要替换为 **Supabase Auth**。这包括：
- 使用 Supabase 提供的 UI 组件或自定义 UI 来重建登录/注册页面。
- 将 `access_token` 的处理逻辑替换为 Supabase 的 Session 管理机制。
- 用户角色和权限数据需要迁移到 Supabase 的用户元数据（`user_metadata`）中。

---

## 5. 云函数/API 端点清单

项目包含 **21个** 独立的云函数，构成了后端的核心业务逻辑。这些函数将在迁移过程中被重构为 **Vercel Serverless Functions**。

| 云函数名称 | 功能描述 | 迁移复杂度 |
|---|---|---|
| `smartChatWithSearch` | 核心 AI 聊天功能，包含联网搜索和上下文管理逻辑 | **高** |
| `callAIModel` | 封装对不同 AI 模型（Claude, GPT 等）的调用 | **高** |
| `taskClassifier` | 根据用户输入对任务进行分类，以选择合适的 AI 模型 | **中** |
| `changePassword` | 用户修改密码 | **低** |
| `sendVerificationEmail` | 发送邮箱验证邮件 | **低** |
| `compressConversation` | 压缩长对话历史以节省 Token | **高** |
| `tokenBudgetManager` | 管理用户的 Token 消耗和预算 | **中** |
| `processInviteReward` | 处理邀请注册的奖励逻辑 | **中** |
| `autoCloseTickets` | 自动关闭超时的工单 | **低** |
| `exportConversations` | 导出用户对话历史 | **中** |

**迁移策略**:
- 每个云函数都可以一对一地迁移到 Vercel 的一个 Serverless Function。
- 函数内部对 `base44.entities` 的调用需要替换为使用 `supabase-js` 客户端的数据库操作。
- 认证和权限检查逻辑需要适配 Supabase 的用户身份验证机制。
- `smartChatWithSearch` 和 `callAIModel` 等复杂函数需要重点测试，确保核心功能不受影响。

---

## 6. 第三方依赖库清单

项目前端依赖项定义在 `package.json` 文件中，除了核心的 React 和 Vite 外，主要包含以下第三方库：

- **UI & 样式**: `@radix-ui/*`, `shadcn/ui`, `tailwindcss`, `lucide-react`, `recharts`
- **状态管理**: `@tanstack/react-query`, `react-hook-form`, `zod`
- **路由**: `react-router-dom`
- **核心依赖**: `@base44/sdk`, `@base44/vite-plugin`

**迁移影响**:
- `@base44/sdk` 和 `@base44/vite-plugin` 将被完全移除。
- 新增 `@supabase/supabase-js` 作为新的数据库和认证客户端。
- 其他大部分 UI 和状态管理库与后端服务解耦，无需修改，可以继续使用。

---

## 7. 参考文献

[1] GraylumAI 项目交接文档, 2026-01-12
[2] `project_analysis.json`, 2026-01-14 (由 Manus AI 生成的代码分析报告)
