# GraylumAI 迁移模块化任务清单

**文档版本**: 1.0
**生成日期**: 2026-01-14

---

## 说明

本文档将整个迁移过程拆分为一系列可独立执行和验证的模块化任务。请按照任务编号和依赖关系顺序执行。每个任务都提供了详细的步骤、所需修改的文件以及验证标准，旨在方便您将指令传递给 Claude Code 执行。

---

## 任务组 1：环境设置与基础配置 (Setup)

**目标**：准备好新的开发环境，安装必要的依赖并移除旧的平台SDK。

### **任务 S1: 初始化项目与依赖**
- **任务名称**: 初始化 Supabase/Vercel 项目并安装新依赖。
- **执行步骤**:
  1. 在代码库根目录创建一个 `.env` 文件，用于存放本地开发所需的环境变量。
  2. 在 `.env` 文件中添加以下内容，并填入您从 Supabase 项目设置中获取的值：
     ```
     VITE_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
     VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
     ```
  3. 在终端中执行以下命令，安装 Supabase 客户端库：
     ```bash
     npm install @supabase/supabase-js
     ```
- **所需修改的文件**: `.env` (新建)
- **验证标准**: `package.json` 的 `dependencies` 中出现 `@supabase/supabase-js`，并且 `.env` 文件已创建并包含正确的密钥。
- **依赖关系**: 无。

### **任务 S2: 移除 Base44 依赖**
- **任务名称**: 从项目中彻底移除 Base44 的 SDK 和插件。
- **执行步骤**:
  1. 在终端中执行以下命令，卸载 Base44 相关包：
     ```bash
     npm uninstall @base44/sdk @base44/vite-plugin
     ```
  2. 打开 `vite.config.js` 文件，删除 `import { base44 } from '@base44/vite-plugin'` 这一行，并从 `plugins` 数组中移除 `base44()`。
- **所需修改的文件**: `package.json`, `vite.config.js`
- **验证标准**: `package.json` 中不再包含 `@base44/sdk` 和 `@base44/vite-plugin`。执行 `npm run dev` 时项目不再提示找不到 Base44 插件。
- **依赖关系**: 任务 S1。

---

## 任务组 2：数据库迁移 (Database)

**目标**：在 Supabase 中创建新的数据库结构，并为数据迁移做准备。

### **任务 DB1: 创建数据库 Schema**
- **任务名称**: 在 Supabase 中创建数据库表结构。
- **执行步骤**:
  1. 登录 Supabase 控制台，进入 “SQL Editor”。
  2. 将以下 SQL 脚本粘贴到编辑器中并执行，以创建核心数据表（此为简化版，实际需根据完整实体清单扩展）：
     ```sql
     -- 用户信息扩展表 (关联 auth.users)
     CREATE TABLE public.profiles (
         id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
         nickname TEXT,
         avatar_url TEXT,
         role TEXT DEFAULT 'user' NOT NULL,
         credits INT DEFAULT 100 NOT NULL
     );

     -- AI 对话表
     CREATE TABLE public.conversations (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
         title TEXT NOT NULL,
         messages JSONB,
         created_at TIMESTAMPTZ DEFAULT now()
     );

     -- 工单表
     CREATE TABLE public.tickets (
         id SERIAL PRIMARY KEY,
         user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
         title TEXT NOT NULL,
         status TEXT DEFAULT 'open' NOT NULL,
         created_at TIMESTAMPTZ DEFAULT now()
     );
     ```
- **所需修改的文件**: 无（在 Supabase 平台操作）。
- **验证标准**: 在 Supabase 的 “Table Editor” 中可以看到 `profiles`, `conversations`, `tickets` 等新表被成功创建。
- **依赖关系**: 任务 S1。

### **任务 DB2: 启用行级安全 (RLS)**
- **任务名称**: 为数据表配置行级安全策略。
- **执行步骤**:
  1. 在 Supabase 的 “SQL Editor” 中，为每个需要保护的表启用 RLS 并添加策略。
  2. 执行以下 SQL 示例，确保用户只能访问自己的数据：
     ```sql
     -- 为 profiles 表启用 RLS
     ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
     CREATE POLICY "Users can view their own profile." ON public.profiles FOR SELECT USING (auth.uid() = id);
     CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

     -- 为 conversations 表启用 RLS
     ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
     CREATE POLICY "Users can manage their own conversations." ON public.conversations FOR ALL USING (auth.uid() = user_id);
     ```
- **所需修改的文件**: 无（在 Supabase 平台操作）。
- **验证标准**: 在 Supabase 的 “Authentication” -> “Policies” 部分，可以看到为相应表创建的策略。
- **依赖关系**: 任务 DB1。

---

## 任务组 3：认证系统迁移 (Authentication)

**目标**：将应用的认证流程完全切换到 Supabase Auth。

### **任务 AUTH1: 创建 Supabase 客户端与认证上下文**
- **任务名称**: 创建全局 Supabase 客户端实例和新的 React Auth Context。
- **执行步骤**:
  1. 在 `src/lib/` 目录下创建一个新文件 `supabaseClient.js`，内容如下：
     ```javascript
     import { createClient } from '@supabase/supabase-js';

     const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
     const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

     export const supabase = createClient(supabaseUrl, supabaseAnonKey);
     ```
  2. 重写 `src/lib/AuthContext.jsx` 文件，使用 Supabase 的方法来管理用户会话和状态。移除所有 `base44` 相关逻辑。
- **所需修改的文件**: `src/lib/supabaseClient.js` (新建), `src/lib/AuthContext.jsx` (重写)。
- **验证标准**: 应用能够初始化 Supabase 客户端，并且新的 `AuthProvider` 能够正确包裹根组件。
- **依赖关系**: 任务 S2。

### **任务 AUTH2: 改造登录/注册/登出页面**
- **任务名称**: 使用 Supabase Auth 重建用户认证页面和流程。
- **执行步骤**:
  1. 找到处理登录、注册的组件（例如，可以新建 `src/pages/Login.jsx` 和 `src/pages/Signup.jsx`）。
  2. 使用 `react-hook-form` 和 `supabase.auth.signInWithPassword()`, `supabase.auth.signUp()` 方法重写表单提交逻辑。
  3. 修改 `AppHeader.jsx` 和 `Profile.jsx` 中的登出按钮，使其调用 `supabase.auth.signOut()`。
- **所需修改的文件**: `src/pages/Login.jsx` (新建或修改), `src/pages/Signup.jsx` (新建或修改), `src/components/layout/AppHeader.jsx`, `src/pages/Profile.jsx`。
- **验证标准**: 用户可以成功使用新页面注册、登录和登出。登录后，Supabase 控制台的 `auth.users` 表中应出现新用户。
- **依赖关系**: 任务 AUTH1。

---

## 任务组 4：后端 API 迁移 (API)

**目标**：将 Base44 云函数迁移为 Vercel Serverless Functions。

### **任务 API1: 迁移 `changePassword` 函数**
- **任务名称**: 将修改密码的云函数迁移到 Vercel。
- **执行步骤**:
  1. 在项目根目录创建 `api/` 文件夹。
  2. 在 `api/` 目录下创建 `change-password.ts` 文件。
  3. 编写函数逻辑，使其接收 `POST` 请求，从请求头获取 Supabase JWT，验证用户身份，并使用 `supabase.auth.admin.updateUserById()` 更新用户密码。
- **所需修改的文件**: `api/change-password.ts` (新建)。
- **验证标准**: 在登录状态下，向 `/api/change-password` 端点发送合法的 POST 请求可以成功修改用户密码。
- **依赖关系**: 任务 AUTH2。

### **任务 API2: 迁移 `smartChatWithSearch` 核心函数**
- **任务名称**: 将核心的 AI 聊天函数迁移到 Vercel。
- **执行步骤**:
  1. 在 `api/` 目录下创建 `smart-chat.ts` 文件。
  2. 将原 `functions/smartChatWithSearch.ts` 的核心逻辑（如上下文管理、模型选择、外部 API 调用）复制过来。
  3. 将所有 `base44.entities` 的调用替换为 `supabase-js` 的数据库查询（例如，使用 `supabase.from('conversations').select()` 获取对话历史）。
  4. 从请求中获取用户信息，并替换原有的权限验证逻辑。
- **所需修改的文件**: `api/smart-chat.ts` (新建)。
- **验证标准**: 向 `/api/smart-chat` 端点发送请求，能够收到 AI 的回复，并且对话历史被正确记录到 Supabase 数据库中。
- **依赖关系**: 任务 DB2, 任务 AUTH2。

---

## 任务组 5：前端适配 (Frontend)

**目标**：将前端所有数据请求切换到新的后端 API。

### **任务 FE1: 适配前端 API 调用**
- **任务名称**: 修改前端代码，使其调用新的 Vercel API 端点。
- **执行步骤**:
  1. 找到所有调用 `base44.functions.invoke()` 和 `base44.entities` 的地方。
  2. 将它们替换为使用 `fetch` 或 `axios` 对 `/api/...` 端点的请求。
  3. 确保在每个请求的 `Authorization` 头中附带 `Bearer ${session.access_token}`，其中 `session` 来自 Supabase 的认证状态。
- **所需修改的文件**: `src/components/hooks/useChatState.jsx`, `src/pages/AdminUsers.jsx`, `src/pages/Profile.jsx` 等所有涉及数据交互的组件。
- **验证标准**: 应用的所有功能（聊天、管理、个人资料修改等）恢复正常，数据能够正确地从 Supabase 加载和写入。
- **依赖关系**: 任务 API1, 任务 API2。
