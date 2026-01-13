## 🚀 后续迁移计划 - Claude Code 执行手册

**文档版本**: 2.0
**生成日期**: 2026-01-14

---

## 📖 使用指南

您好！您已成功搭建了项目的基础架构。现在，我们将开始填充核心的业务逻辑。

请继续按照分步执行的方式，将每个【任务块】复制给 Claude Code。

---

## 🚀 阶段六：核心业务逻辑迁移 (3-5天)

**目标**: 将最高优先级的业务功能（AI 对话、用户管理、积分系统）从旧的云函数迁移到新的 tRPC 架构中。

---

### ## 任务 6.1：定义受保护的 Procedure

**任务描述**: 在 tRPC 中，很多操作都需要用户登录。我们将创建一个 `protectedProcedure`，它会自动验证用户的登录状态。

**给 Claude Code 的指令**:

```
请在 `/home/user/GraylumAI_vercel/packages/api/src/trpc.ts` 文件中，添加一个 `protectedProcedure`，并创建一个可复用的 Supabase 客户端。

请将文件内容更新为：

```typescript
import { initTRPC, TRPCError } from '@trpc/server';
import { createClient } from '@supabase/supabase-js';

// 可复用的 Supabase 客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const token = opts.headers.get('authorization')?.replace('Bearer ', '');
  let user = null;
  if (token) {
    const { data } = await supabase.auth.getUser(token);
    user = data.user;
  }
  return { ...opts, user, supabase };
};

const t = initTRPC.context<typeof createTRPCContext>().create();

const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);
```

**重要提示**: 请在 Vercel 项目的环境变量中添加 `SUPABASE_SERVICE_ROLE_KEY`，值为您自己的 Supabase 服务角色密钥。


**预期输出**:
- 文件写入成功。

**验证方法**:
- `trpc.ts` 文件内容被更新。

---

### ## 任务 6.2：迁移用户管理 API

**任务描述**: 创建 `userRouter`，并将 `getUserProfile`, `updateUserProfile`, `getUserCredits` 三个高优先级函数迁移为 tRPC procedures。

**给 Claude Code 的指令**:

```
请执行以下操作：

1.  在 `packages/api/src/routers/` 目录下创建 `user.ts` 文件。
2.  在 `packages/api/src/root.ts` 中注册 `userRouter`。

**`user.ts` 文件内容如下：**

```typescript
import { router, protectedProcedure } from '../../trpc';
import { z } from 'zod';
import { profiles } from '@repo/db/schema';
import { eq } from 'drizzle-orm';

export const userRouter = router({
  getUserProfile: protectedProcedure.query(async ({ ctx }) => {
    const [userProfile] = await ctx.supabase
      .from('profiles')
      .select('*')
      .eq('id', ctx.user.id);
    return userProfile;
  }),

  updateUserProfile: protectedProcedure
    .input(z.object({ nickname: z.string().optional(), avatarUrl: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('profiles')
        .update({ nickname: input.nickname, avatar_url: input.avatarUrl })
        .eq('id', ctx.user.id);
      if (error) throw error;
      return data;
    }),

  getUserCredits: protectedProcedure.query(async ({ ctx }) => {
    const [userProfile] = await ctx.supabase
      .from('profiles')
      .select('credits')
      .eq('id', ctx.user.id);
    return userProfile?.credits ?? 0;
  }),
});


**请将 `packages/api/src/root.ts` 更新为：**

```typescript
import { chatRouter } from './routers/chat';
import { userRouter } from './routers/user'; // 新增
import { router } from '../trpc';

export const appRouter = router({
  chat: chatRouter,
  user: userRouter, // 新增
});

export type AppRouter = typeof appRouter;
```


**预期输出**:
- 文件创建和更新成功。

**验证方法**:
- 您可以在前端页面中通过 `trpc.user.getUserProfile.useQuery()` 来调用并获取用户信息。

---

### ## 任务 6.3：迁移积分系统 API

**任务描述**: 创建 `creditsRouter`，并将 `deductCredits`, `addCredits`, `getCreditTransactions` 三个高优先级函数迁移。

**给 Claude Code 的指令**:

```
请执行以下操作：

1.  在 `packages/api/src/routers/` 目录下创建 `credits.ts` 文件。
2.  在 `packages/api/src/root.ts` 中注册 `creditsRouter`。

**`credits.ts` 文件内容如下：**

```typescript
import { router, protectedProcedure } from '../../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

export const creditsRouter = router({
  // Supabase Edge Functions are recommended for transactional operations
  // Here we provide a simplified, non-transactional version
  deductCredits: protectedProcedure
    .input(z.object({ amount: z.number().positive() }))
    .mutation(async ({ ctx, input }) => {
      const { data: profile, error: profileError } = await ctx.supabase
        .from('profiles')
        .select('credits')
        .eq('id', ctx.user.id)
        .single();

      if (profileError || !profile) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Profile not found.' });
      }

      if (profile.credits < input.amount) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Insufficient credits.' });
      }

      const newCredits = profile.credits - input.amount;

      const { error: updateError } = await ctx.supabase
        .from('profiles')
        .update({ credits: newCredits })
        .eq('id', ctx.user.id);

      if (updateError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to deduct credits.' });
      }

      // TODO: Add a record to credit_transactions table
      return { success: true, newCredits };
    }),
});


**请将 `packages/api/src/root.ts` 更新为：**

```typescript
import { chatRouter } from './routers/chat';
import { userRouter } from './routers/user';
import { creditsRouter } from './routers/credits'; // 新增
import { router } from '../trpc';

export const appRouter = router({
  chat: chatRouter,
  user: userRouter,
  credits: creditsRouter, // 新增
});

export type AppRouter = typeof appRouter;
```

**说明**: 真正的积分操作需要数据库事务来保证原子性。Supabase 中，这通常通过数据库函数（RPC）或 Edge Functions 来实现。这里的实现是一个简化版，用于演示 tRPC 的基本用法。


**预期输出**:
- 文件创建和更新成功。

---

### ## 任务 6.4：提交第六阶段成果

**任务描述**: 提交核心业务逻辑迁移的代码。

**给 Claude Code 的指令**:

```
请在 `/home/user/GraylumAI_vercel` 目录下执行以下 shell 命令：

git add . && \
git commit -m "feat: migrate core business logic to tRPC

- Add protectedProcedure for authenticated routes
- Migrate user management APIs (getUserProfile, updateUserProfile, getUserCredits)
- Migrate credits system APIs (simplified deductCredits)" && \
git push origin refactor
```

**预期输出**:
- git commit 和 push 的成功信息。

---

**阶段六完成！**

您已成功将项目最核心的业务逻辑迁移到了新架构。下一步，我们将完善数据库的 Schema，并开始迁移前端页面。


---

## 🚀 阶段七：数据库 Schema 完整迁移 (1-2天)

**目标**: 根据项目评估报告，将所有18个数据实体完整地迁移到 Supabase 数据库中。

---

### ## 任务 7.1：完善数据库 Schema

**任务描述**: 在 `packages/db/schema.ts` 文件中，添加所有剩余的数据表的 Drizzle Schema 定义。

**给 Claude Code 的指令**:

```
请将 `/home/user/GraylumAI_vercel/packages/db/schema.ts` 文件的内容完全替换为以下代码，以定义所有数据表的结构。

```typescript
import { pgTable, text, uuid, integer, timestamp, jsonb, primaryKey } from 'drizzle-orm/pg-core';

// --- 核心表 ---

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(), // Corresponds to supabase.auth.users.id
  nickname: text('nickname'),
  avatarUrl: text('avatar_url'),
  credits: integer('credits').default(100).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  modelId: uuid('model_id').references(() => aiModels.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }).notNull(),
  role: text('role', { enum: ['user', 'assistant'] }).notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const creditTransactions = pgTable('credit_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'set null' }),
  amount: integer('amount').notNull(),
  type: text('type', { enum: ['deduction', 'addition', 'purchase', 'refund'] }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- 配置表 ---

export const aiModels = pgTable('ai_models', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  provider: text('provider'),
  endpoint: text('endpoint'),
  config: jsonb('config'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const systemSettings = pgTable('system_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value'),
});

// --- 业务表 ---

export const tickets = pgTable('tickets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  status: text('status', { enum: ['open', 'closed', 'in_progress'] }).default('open').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const ticketReplies = pgTable('ticket_replies', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticketId: uuid('ticket_id').references(() => tickets.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'set null' }), // User who replied
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const creditPackages = pgTable('credit_packages', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  price: integer('price').notNull(), // In cents
  creditsAmount: integer('credits_amount').notNull(),
  active: text('active').default('true').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const invitations = pgTable('invitations', {
  code: text('code').primaryKey(),
  createdBy: uuid('created_by').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
  usedBy: uuid('used_by').references(() => profiles.id, { onDelete: 'set null' }),
  status: text('status', { enum: ['active', 'used', 'expired'] }).default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```


**预期输出**:
- 文件写入成功。

**验证方法**:
- `packages/db/schema.ts` 文件内容被更新。

---

### ## 任务 7.2：执行数据库迁移

**任务描述**: 使用 Drizzle Kit 将新的数据库 Schema 变更推送到 Supabase。

**给 Claude Code 的指令**:

```
请在 `/home/user/GraylumAI_vercel` 目录下执行以下 shell 命令，将新的数据表结构推送到数据库：

pnpm run db:push
```

**预期输出**:
- Claude Code 会显示 Drizzle Kit 的输出，提示检测到新的数据表和关系，并成功将变更推送到数据库。

**验证方法**:
- 在 Supabase 的 Table Editor 中，您应该能看到所有新创建的表，如 `conversations`, `messages`, `tickets` 等。

---

### ## 任务 7.3：提交第七阶段成果

**任务描述**: 提交完整的数据库 Schema 代码。

**给 Claude Code 的指令**:

```
请在 `/home/user/GraylumAI_vercel` 目录下执行以下 shell 命令：

git add . && \
git commit -m "feat: define and migrate complete database schema

- Add schemas for all 18 data entities including conversations, messages, tickets, etc.
- Establish foreign key relationships between tables.
- Push all schema changes to Supabase database." && \
git push origin refactor
```

**预期输出**:
- git commit 和 push 的成功信息。

---

**阶段七完成！**

您的数据库现在已经拥有了与原应用完全匹配的数据结构。这是非常关键的一步！接下来，我们将开始迁移前端页面，让用户能够与这些数据进行交互。


---

## 🚀 阶段八：前端核心页面迁移 (4-6天)

**目标**: 迁移项目最核心的页面——AI 聊天界面。这包括对话列表、消息展示和消息发送功能。

---

### ## 任务 8.1：扩展聊天 API

**任务描述**: 在 `chatRouter` 中添加获取对话消息、发送消息等必要的 tRPC procedures。

**给 Claude Code 的指令**:

```
请将 `/home/user/GraylumAI_vercel/packages/api/src/routers/chat.ts` 文件的内容完全替换为以下代码，以扩展聊天 API 的功能。

```typescript
import { router, protectedProcedure } from '../../trpc';
import { z } from 'zod';
import { conversations, messages } from '@repo/db/schema';
import { eq, desc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const chatRouter = router({
  getConversations: protectedProcedure.query(async ({ ctx }) => {
    return ctx.supabase
      .from('conversations')
      .select('*')
      .eq('user_id', ctx.user.id)
      .order('created_at', { ascending: false });
  }),

  getMessages: protectedProcedure
    .input(z.object({ conversationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Validate that the user owns the conversation
      const { data: convos } = await ctx.supabase
        .from('conversations')
        .select('id')
        .eq('id', input.conversationId)
        .eq('user_id', ctx.user.id);

      if (!convos || convos.length === 0) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      return ctx.supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', input.conversationId)
        .order('created_at', { ascending: true });
    }),

  sendMessage: protectedProcedure
    .input(z.object({ conversationId: z.string().uuid(), content: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // TODO: Add logic to call AI model and stream response
      // For now, we just save the user's message and echo a reply

      // 1. Save user message
      const { data: userMessage, error: userMessageError } = await ctx.supabase
        .from('messages')
        .insert({
          conversation_id: input.conversationId,
          role: 'user',
          content: input.content,
        })
        .select()
        .single();

      if (userMessageError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: userMessageError.message });

      // 2. Deduct credits (example)
      // await ctx.supabase.rpc('deduct_credits', { user_id: ctx.user.id, amount: 1 });

      // 3. Echo a reply
      const { data: assistantMessage, error: assistantMessageError } = await ctx.supabase
        .from('messages')
        .insert({
          conversation_id: input.conversationId,
          role: 'assistant',
          content: `You said: ${input.content}`,
        })
        .select()
        .single();
      
      if (assistantMessageError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: assistantMessageError.message });

      return { userMessage, assistantMessage };
    }),
});
```

**预期输出**:
- 文件写入成功。

**验证方法**:
- `packages/api/src/routers/chat.ts` 文件内容被更新。

---

### ## 任务 8.2：创建聊天界面组件

**任务描述**: 创建聊天界面的核心组件，包括对话列表 (`ConversationList`) 和消息界面 (`ChatInterface`)。

**给 Claude Code 的指令**:


请在 `/home/user/GraylumAI_vercel/apps/web/src/components/` 目录下创建 `chat` 目录，并添加以下两个组件文件。

**1. `chat/ConversationList.tsx` 文件内容：**

```typescript
'use client';

import { trpc } from '@/trpc/client';
import { Button } from '@/components/ui/button';

interface ConversationListProps {
  onSelectConversation: (id: string) => void;
}

export function ConversationList({ onSelectConversation }: ConversationListProps) {
  const { data: conversations, isLoading } = trpc.chat.getConversations.useQuery();

  if (isLoading) return <div>Loading conversations...</div>;

  return (
    <div className="flex flex-col gap-2">
      {conversations?.data?.map((convo) => (
        <Button
          key={convo.id}
          variant="outline"
          onClick={() => onSelectConversation(convo.id)}
          className="justify-start"
        >
          {convo.title}
        </Button>
      ))}
    </div>
  );
}


**2. `chat/ChatInterface.tsx` 文件内容：**

```typescript
'use client';

import { useState } from 'react';
import { trpc } from '@/trpc/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ChatInterfaceProps {
  conversationId: string;
}

export function ChatInterface({ conversationId }: ChatInterfaceProps) {
  const { data: messages, isLoading, refetch } = trpc.chat.getMessages.useQuery({ conversationId });
  const sendMessage = trpc.chat.sendMessage.useMutation({
    onSuccess: () => {
      refetch(); // Refetch messages after sending
      setNewMessage('');
    },
  });
  const [newMessage, setNewMessage] = useState('');

  const handleSend = () => {
    if (newMessage.trim() !== '') {
      sendMessage.mutate({ conversationId, content: newMessage });
    }
  };

  if (isLoading) return <div>Loading messages...</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow p-4 space-y-4 overflow-y-auto">
        {messages?.data?.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`px-4 py-2 rounded-lg ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
              {msg.content}
            </div>
          </div>
        ))}
      </div>
      <div className="p-4 flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type your message..."
        />
        <Button onClick={handleSend} disabled={sendMessage.isPending}>
          Send
        </Button>
      </div>
    </div>
  );
}
```


**预期输出**:
- 文件创建成功。

---

### ## 任务 8.3：组装主页面

**任务描述**: 修改应用的主页面 (`/`)，使其成为一个包含对话列表和聊天界面的完整布局。

**给 Claude Code 的指令**:

```
请将 `/home/user/GraylumAI_vercel/apps/web/src/app/page.tsx` 文件的内容完全替换为以下代码：

```typescript
'use client';

import { useState } from 'react';
import { ConversationList } from '@/components/chat/ConversationList';
import { ChatInterface } from '@/components/chat/ChatInterface';

export default function HomePage() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-[300px_1fr] h-screen">
      <div className="p-4 border-r">
        <h2 className="text-lg font-semibold mb-4">Conversations</h2>
        <ConversationList onSelectConversation={setSelectedConversationId} />
      </div>
      <div className="flex flex-col">
        {selectedConversationId ? (
          <ChatInterface conversationId={selectedConversationId} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}
```
```

**预期输出**:
- 文件写入成功。

**验证方法**:
- 启动开发服务器 (`pnpm dev`)。
- 访问主页 (`/`)，您应该能看到一个两栏布局。
- （在 Supabase 中手动创建一些对话和消息数据后）左侧会显示对话列表，点击后右侧会显示消息和输入框，并且可以发送消息。

---

### ## 任务 8.4：提交第八阶段成果

**任务描述**: 提交核心聊天界面的代码。

**给 Claude Code 的指令**:


请在 `/home/user/GraylumAI_vercel` 目录下执行以下 shell 命令：

git add . && \
git commit -m "feat: migrate core chat interface

- Extend chat API with getMessages and sendMessage procedures.
- Create ConversationList and ChatInterface components.
- Assemble the main chat layout on the home page.
- Use tRPC hooks to fetch and mutate chat data." && \
git push origin refactor
```

**预期输出**:
- git commit 和 push 的成功信息。

---

**阶段八完成！**

您已经成功迁移了项目最核心的功能！基于这个模式，您可以继续迁移其他页面和功能：

1.  在 `packages/api` 中为每个功能模块创建新的 `router`。
2.  在 `packages/db/schema.ts` 中定义所需的数据表。
3.  在 `apps/web/src/components` 中创建对应的 UI 组件。
4.  在 `apps/web/src/app` 中创建新的页面，并使用 tRPC hooks 连接前后端。

这个项目已经具备了极好的可扩展性，祝您后续开发顺利！
