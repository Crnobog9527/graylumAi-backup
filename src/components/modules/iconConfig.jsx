import { 
  Video, PenTool, Sparkles, Briefcase, BarChart3, Lightbulb, 
  Target, Image as ImageIcon, Languages, Code, Megaphone, 
  BookOpen, Music, Bot, FileText, Palette, Rocket, Zap,
  Heart, Star, MessageSquare, Mail, Calendar, Clock,
  Camera, Mic, Radio, Tv, Film, Clapperboard,
  ShoppingBag, ShoppingCart, Store, CreditCard, DollarSign,
  TrendingUp, PieChart, LineChart, Activity, Hash,
  Globe, Send, Share2, Users, UserPlus, Award,
  Bookmark, Tag, Folder, Archive, Layers, Grid,
  Edit3, Type, AlignLeft, List, CheckSquare, Clipboard,
  Search, Filter, Settings, Sliders, Wrench,
  Coffee, Gift, Smile, ThumbsUp, Flame, Crown
} from 'lucide-react';

// 图标映射
export const iconMap = {
  Video, PenTool, Sparkles, Briefcase, BarChart3, Lightbulb,
  Target, Image: ImageIcon, Languages, Code, Megaphone,
  BookOpen, Music, Bot, FileText, Palette, Rocket, Zap,
  Heart, Star, MessageSquare, Mail, Calendar, Clock,
  Camera, Mic, Radio, Tv, Film, Clapperboard,
  ShoppingBag, ShoppingCart, Store, CreditCard, DollarSign,
  TrendingUp, PieChart, LineChart, Activity, Hash,
  Globe, Send, Share2, Users, UserPlus, Award,
  Bookmark, Tag, Folder, Archive, Layers, Grid,
  Edit3, Type, AlignLeft, List, CheckSquare, Clipboard,
  Search, Filter, Settings, Sliders, Wrench,
  Coffee, Gift, Smile, ThumbsUp, Flame, Crown
};

// 图标颜色配置 - 每个图标对应一个特定颜色
export const iconColorMap = {
  // 内容创作类 - 暖色调
  Zap: '#FFD700',           // 金黄色
  Sparkles: '#F59E0B',      // 琥珀色
  PenTool: '#84CC16',       // 青柠色
  Edit3: '#10B981',         // 翡翠绿
  Type: '#14B8A6',          // 青绿色
  AlignLeft: '#06B6D4',     // 青色
  
  // 视频/媒体类 - 粉紫色调
  Video: '#F472B6',         // 粉色
  Camera: '#EC4899',        // 玫红色
  Film: '#D946EF',          // 紫红色
  Clapperboard: '#A855F7',  // 紫色
  Tv: '#8B5CF6',            // 紫罗兰
  Radio: '#7C3AED',         // 深紫色
  Mic: '#6366F1',           // 靛蓝色
  
  // 营销/商业类 - 橙红色调
  Megaphone: '#F97316',     // 橙色
  Target: '#EF4444',        // 红色
  TrendingUp: '#DC2626',    // 深红色
  Rocket: '#FB923C',        // 亮橙色
  Flame: '#FF6B6B',         // 珊瑚红
  Crown: '#FBBF24',         // 金色
  Award: '#F59E0B',         // 琥珀色
  
  // 数据/分析类 - 蓝色调
  BarChart3: '#3B82F6',     // 蓝色
  PieChart: '#2563EB',      // 深蓝色
  LineChart: '#1D4ED8',     // 靛蓝
  Activity: '#0EA5E9',      // 天蓝色
  Hash: '#06B6D4',          // 青色
  
  // 办公/商务类 - 绿色调
  Briefcase: '#22C55E',     // 绿色
  FileText: '#16A34A',      // 深绿色
  Clipboard: '#15803D',     // 森林绿
  Calendar: '#059669',      // 翡翠绿
  Clock: '#0D9488',         // 青绿色
  CheckSquare: '#14B8A6',   // 青色
  List: '#2DD4BF',          // 蓝绿色
  
  // 社交/沟通类 - 多彩
  MessageSquare: '#8B5CF6', // 紫罗兰
  Mail: '#6366F1',          // 靛蓝色
  Send: '#3B82F6',          // 蓝色
  Share2: '#0EA5E9',        // 天蓝色
  Globe: '#06B6D4',         // 青色
  Users: '#14B8A6',         // 青绿色
  UserPlus: '#10B981',      // 翡翠绿
  
  // 电商/购物类 - 橙粉色调
  ShoppingBag: '#FB7185',   // 玫瑰粉
  ShoppingCart: '#F472B6',  // 粉色
  Store: '#E879F9',         // 淡紫色
  CreditCard: '#C084FC',    // 紫色
  DollarSign: '#22C55E',    // 绿色
  
  // 创意/设计类 - 彩虹色
  Palette: '#F472B6',       // 粉色
  Image: '#A78BFA',         // 淡紫色
  Layers: '#818CF8',        // 蓝紫色
  Grid: '#60A5FA',          // 天蓝色
  
  // 学习/知识类 - 蓝绿色调
  BookOpen: '#0EA5E9',      // 天蓝色
  Lightbulb: '#FBBF24',     // 金色
  Search: '#6366F1',        // 靛蓝色
  Filter: '#8B5CF6',        // 紫罗兰
  
  // 工具类 - 灰蓝色调
  Settings: '#64748B',      // 石板灰
  Sliders: '#475569',       // 深灰
  Wrench: '#78716C',        // 棕灰色
  
  // 其他
  Bot: '#8B5CF6',           // 紫罗兰
  Code: '#22D3EE',          // 青色
  Languages: '#34D399',     // 翡翠绿
  Music: '#F472B6',         // 粉色
  Heart: '#EF4444',         // 红色
  Star: '#FBBF24',          // 金色
  Bookmark: '#F59E0B',      // 琥珀色
  Tag: '#84CC16',           // 青柠色
  Folder: '#FB923C',        // 橙色
  Archive: '#78716C',       // 棕灰色
  Coffee: '#92400E',        // 棕色
  Gift: '#EC4899',          // 玫红色
  Smile: '#FBBF24',         // 金色
  ThumbsUp: '#22C55E',      // 绿色
};

// 带颜色的图标列表（用于选择器展示）
export const iconOptions = [
  // 内容创作
  { value: 'Zap', label: '闪电', category: '创作' },
  { value: 'Sparkles', label: '星光', category: '创作' },
  { value: 'PenTool', label: '画笔', category: '创作' },
  { value: 'Edit3', label: '编辑', category: '创作' },
  { value: 'Type', label: '文字', category: '创作' },
  { value: 'AlignLeft', label: '排版', category: '创作' },
  
  // 视频媒体
  { value: 'Video', label: '视频', category: '媒体' },
  { value: 'Camera', label: '相机', category: '媒体' },
  { value: 'Film', label: '电影', category: '媒体' },
  { value: 'Clapperboard', label: '场记板', category: '媒体' },
  { value: 'Tv', label: '电视', category: '媒体' },
  { value: 'Radio', label: '广播', category: '媒体' },
  { value: 'Mic', label: '麦克风', category: '媒体' },
  
  // 营销商业
  { value: 'Megaphone', label: '喇叭', category: '营销' },
  { value: 'Target', label: '目标', category: '营销' },
  { value: 'TrendingUp', label: '趋势', category: '营销' },
  { value: 'Rocket', label: '火箭', category: '营销' },
  { value: 'Flame', label: '火焰', category: '营销' },
  { value: 'Crown', label: '皇冠', category: '营销' },
  { value: 'Award', label: '奖章', category: '营销' },
  
  // 数据分析
  { value: 'BarChart3', label: '柱状图', category: '数据' },
  { value: 'PieChart', label: '饼图', category: '数据' },
  { value: 'LineChart', label: '折线图', category: '数据' },
  { value: 'Activity', label: '活动', category: '数据' },
  { value: 'Hash', label: '标签', category: '数据' },
  
  // 办公商务
  { value: 'Briefcase', label: '公文包', category: '办公' },
  { value: 'FileText', label: '文档', category: '办公' },
  { value: 'Clipboard', label: '剪贴板', category: '办公' },
  { value: 'Calendar', label: '日历', category: '办公' },
  { value: 'Clock', label: '时钟', category: '办公' },
  { value: 'CheckSquare', label: '勾选', category: '办公' },
  { value: 'List', label: '列表', category: '办公' },
  
  // 社交沟通
  { value: 'MessageSquare', label: '消息', category: '社交' },
  { value: 'Mail', label: '邮件', category: '社交' },
  { value: 'Send', label: '发送', category: '社交' },
  { value: 'Share2', label: '分享', category: '社交' },
  { value: 'Globe', label: '地球', category: '社交' },
  { value: 'Users', label: '用户组', category: '社交' },
  { value: 'UserPlus', label: '添加用户', category: '社交' },
  
  // 电商购物
  { value: 'ShoppingBag', label: '购物袋', category: '电商' },
  { value: 'ShoppingCart', label: '购物车', category: '电商' },
  { value: 'Store', label: '商店', category: '电商' },
  { value: 'CreditCard', label: '信用卡', category: '电商' },
  { value: 'DollarSign', label: '美元', category: '电商' },
  
  // 创意设计
  { value: 'Palette', label: '调色板', category: '设计' },
  { value: 'Image', label: '图片', category: '设计' },
  { value: 'Layers', label: '图层', category: '设计' },
  { value: 'Grid', label: '网格', category: '设计' },
  
  // 学习知识
  { value: 'BookOpen', label: '书本', category: '学习' },
  { value: 'Lightbulb', label: '灯泡', category: '学习' },
  { value: 'Search', label: '搜索', category: '学习' },
  
  // 其他
  { value: 'Bot', label: '机器人', category: '其他' },
  { value: 'Code', label: '代码', category: '其他' },
  { value: 'Languages', label: '语言', category: '其他' },
  { value: 'Music', label: '音乐', category: '其他' },
  { value: 'Heart', label: '爱心', category: '其他' },
  { value: 'Star', label: '星星', category: '其他' },
  { value: 'Coffee', label: '咖啡', category: '其他' },
  { value: 'Gift', label: '礼物', category: '其他' },
  { value: 'Smile', label: '笑脸', category: '其他' },
  { value: 'ThumbsUp', label: '点赞', category: '其他' },
];

// 获取图标颜色
export const getIconColor = (iconName) => {
  return iconColorMap[iconName] || '#FFD700'; // 默认金色
};

// 获取图标组件
export const getIconComponent = (iconName) => {
  return iconMap[iconName] || Bot;
};