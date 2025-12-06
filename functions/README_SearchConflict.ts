# 智能搜索判断系统与模型默认搜索的冲突解决方案

## 问题描述

系统中存在两个联网搜索机制：

### 1. 模型默认联网搜索（AdminModels 后台配置）
- 位置：AI模型管理 → 编辑模型 → 启用联网搜索
- 字段：`enable_web_search: boolean`
- 行为：如果启用，该模型的**所有请求**都会自动使用联网搜索
- 成本：每次请求固定增加搜索成本（约 $0.005）

### 2. 智能联网搜索判断系统
- 文件：`searchClassifier.js` + `smartChatWithSearch.js`
- 行为：根据用户查询**智能判断**是否需要搜索
- 成本节省：通过三级判断 + 缓存机制，降低 60-70% 成本

## 冲突场景

如果同时使用两个系统，会导致：

```
用户查询 "写一段代码"
  ↓
智能判断系统：不需要搜索 ✓
  ↓
调用 callAIModel
  ↓
模型配置：enable_web_search = true
  ↓
结果：执行了不必要的搜索 ✗
成本：浪费 $0.005
```

## 解决方案

### 方案：参数覆盖机制

在调用 `smartChat.js` 时，通过 `disable_model_web_search` 参数临时禁用模型的默认搜索设置。

#### 实现步骤

1. **smartChatWithSearch.js** 调用时传递参数：
```javascript
const chatRes = await base44.functions.invoke('smartChat', {
  conversation_id,
  message: enhancedMessage,
  system_prompt,
  disable_model_web_search: true  // 关键参数
});
```

2. **smartChat.js** 接收并处理参数：
```javascript
const { disable_model_web_search } = await req.json();

// 临时覆盖模型配置
if (disable_model_web_search) {
  model.enable_web_search = false;
}
```

### 使用指导

#### 场景 1：使用智能搜索判断系统（推荐）

**前端调用：**
```javascript
// 使用智能搜索判断系统
const response = await base44.functions.invoke('smartChatWithSearch', {
  conversation_id: convId,
  message: userInput
});

// 系统会自动：
// 1. 判断是否需要搜索
// 2. 检查缓存
// 3. 禁用模型默认搜索（避免冲突）
// 4. 返回优化后的结果
```

**后台配置：**
- 模型的 `enable_web_search` 设置会被自动忽略
- 无需手动关闭

#### 场景 2：直接使用模型默认搜索

**前端调用：**
```javascript
// 直接调用原有的 callAIModel
const response = await base44.functions.invoke('callAIModel', {
  model_id: selectedModel.id,
  messages: messages
});

// 如果模型启用了 enable_web_search，会自动使用搜索
```

**后台配置：**
- 在 AI 模型管理中启用"联网搜索"
- 适用于需要始终联网的特殊模型

#### 场景 3：强制不使用任何搜索

**前端调用：**
```javascript
// 调用 smartChat 并禁用搜索
const response = await base44.functions.invoke('smartChat', {
  conversation_id: convId,
  message: userInput,
  disable_model_web_search: true
});
```

## 成本对比

### 传统方案（模型默认搜索）
```
1000次请求 × $0.005 = $5.00
```

### 智能判断系统
```
搜索触发：1000 × 20% = 200次
缓存命中：200 × 44% = 88次
实际搜索：200 - 88 = 112次
搜索成本：112 × $0.005 = $0.56
判断成本：1000 × $0.0001 = $0.10
总成本：$0.66
节省：87%
```

### 冲突方案（两个系统同时运行）
```
智能判断：$0.66
模型默认搜索重复执行：额外 $0.56
总成本：$1.22（反而更贵！）
```

## 推荐配置

### 生产环境推荐

1. **关闭所有模型的默认联网搜索**
   - 进入 AI 模型管理
   - 编辑每个模型
   - 将"启用联网搜索"设置为关闭

2. **统一使用智能搜索判断系统**
   - 所有前端调用改为 `smartChatWithSearch`
   - 享受自动判断 + 缓存优化

3. **监控成本和效果**
   ```javascript
   // 查看统计
   const analytics = await base44.functions.invoke('getSearchAnalytics', {
     range: '7d'
   });
   ```

### 特殊场景配置

如果有特定模型需要始终联网（例如：新闻助手、实时数据模型）：

1. **创建专用模型**
   - 模型名称：`Claude Sonnet - 实时新闻专用`
   - 启用联网搜索：✓

2. **前端分流**
   ```javascript
   if (isRealtimeModule) {
     // 使用专用模型，直接调用 callAIModel
     response = await base44.functions.invoke('callAIModel', {
       model_id: realtimeModelId,
       messages
     });
   } else {
     // 使用智能判断系统
     response = await base44.functions.invoke('smartChatWithSearch', {
       conversation_id, 
       message
     });
   }
   ```

## 验证方法

### 检查是否存在冲突

1. 查看交易记录中的搜索成本
2. 检查 `SearchStatistics` 表的搜索触发率
3. 如果搜索触发率 > 30%，可能存在冲突

### 测试步骤

```javascript
// 测试1：发送不需要搜索的消息
const response1 = await base44.functions.invoke('smartChatWithSearch', {
  message: "写一段Python代码"
});

console.log('搜索执行:', response1.data.search_info.executed); 
// 应该为 false

// 测试2：发送需要搜索的消息
const response2 = await base44.functions.invoke('smartChatWithSearch', {
  message: "今天北京天气怎么样？"
});

console.log('搜索执行:', response2.data.search_info.executed); 
// 应该为 true
console.log('成本:', response2.data.stats.search_cost);
// 应该为 0.005
```

## 故障排查

### 问题：搜索成本异常高

**可能原因：**
- 模型启用了默认搜索，与智能判断系统冲突

**解决方法：**
1. 检查 AI 模型配置，关闭 `enable_web_search`
2. 确认前端调用 `smartChatWithSearch` 而非 `callAIModel`

### 问题：需要搜索时没有搜索

**可能原因：**
- `disable_model_web_search` 参数传递错误
- 智能判断系统误判

**解决方法：**
1. 检查 `searchClassifier` 的判断结果
2. 更新关键词列表
3. 手动触发搜索（临时方案）

## 总结

- ✅ **推荐：** 统一使用智能搜索判断系统
- ⚠️ **不推荐：** 模型默认搜索 + 智能判断系统同时使用（会冲突）
- ❌ **禁止：** 混用两种方式而不做参数隔离

通过 `disable_model_web_search` 参数，系统已完全解决冲突问题，可放心使用智能搜索判断系统。