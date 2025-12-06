{
  "keywords": {
    "must_search": [
      "天气", "股价", "汇率", "比赛", "新闻", "最新", "今天", "昨天", "现在", "当前",
      "近期", "帮我查", "搜索", "找一下", "谁是", "CEO", "总统", "总理", "价格",
      "多少钱", "排名", "评分", "统计", "数据", "政策", "任命", "辞职",
      "weather", "stock", "price", "news", "latest", "today", "current", "search",
      "2024年6月", "2024年7月", "2024年8月", "2024年9月", "2024年10月", "2024年11月", "2024年12月"
    ],
    "no_search": [
      "写", "创作", "翻译", "改写", "代码", "编程", "算法", "数学", "计算",
      "解释", "是什么", "怎么", "为什么", "原理", "概念", "定义", "教程",
      "谢谢", "你好", "再见", "明白", "知道了", "继续", "还有吗",
      "write", "code", "programming", "algorithm", "math", "explain", "what is",
      "how to", "why", "principle", "concept", "definition", "tutorial",
      "已故", "历史上", "古代", "过去", "曾经"
    ]
  },
  "cache": {
    "ttl_minutes": 15,
    "similarity_threshold": 0.85,
    "max_cache_size": 1000,
    "cleanup_interval_minutes": 30
  },
  "thresholds": {
    "high_confidence": 0.7,
    "low_confidence": 0.5,
    "context_similarity": 0.75
  },
  "costs": {
    "haiku_judgment": 0.0001,
    "web_search": 0.005,
    "max_daily_cost_per_user": 1.0
  },
  "performance": {
    "keyword_timeout_ms": 100,
    "haiku_timeout_ms": 500,
    "cache_timeout_ms": 50,
    "total_timeout_ms": 2000
  },
  "quota": {
    "free_searches_per_day": 10,
    "premium_searches_per_day": 100
  }
}