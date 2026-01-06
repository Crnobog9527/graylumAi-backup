import { 
  Video, PenTool, Sparkles, Briefcase, BarChart3, Lightbulb, 
  Target, Image as ImageIcon, Languages, Code, Megaphone, 
  BookOpen, Music, Bot, FileText, Palette, Rocket, Zap,
  MessageSquare, Mail, Globe, Hash, Heart, Star, 
  Camera, Mic, Radio, Tv, Film, Play, Headphones,
  Edit3, Feather, Type, AlignLeft, List, CheckSquare,
  TrendingUp, PieChart, Activity, DollarSign, ShoppingCart,
  Users, UserPlus, Award, Gift, Crown, Gem,
  Cpu, Terminal, Database, Cloud, Settings, Wrench,
  Search, Filter, Eye, Layers, LayoutGrid, LayoutDashboard,
  Calendar, Clock, Bell, Send, Share2, Link,
  Folder, Archive, Bookmark, Tag, Flag, MapPin
} from 'lucide-react';

// 图标映射表
export const iconComponents = {
  Video, PenTool, Sparkles, Briefcase, BarChart3, Lightbulb,
  Target, Image: ImageIcon, Languages, Code, Megaphone,
  BookOpen, Music, Bot, FileText, Palette, Rocket, Zap,
  MessageSquare, Mail, Globe, Hash, Heart, Star,
  Camera, Mic, Radio, Tv, Film, Play, Headphones,
  Edit3, Feather, Type, AlignLeft, List, CheckSquare,
  TrendingUp, PieChart, Activity, DollarSign, ShoppingCart,
  Users, UserPlus, Award, Gift, Crown, Gem,
  Cpu, Terminal, Database, Cloud, Settings, Wrench,
  Search, Filter, Eye, Layers, LayoutGrid, LayoutDashboard,
  Calendar, Clock, Bell, Send, Share2, Link,
  Folder, Archive, Bookmark, Tag, Flag, MapPin
};

// 图标颜色配置 - 每个图标对应一个独特的颜色
export const iconColorMap = {
  // 视频/媒体类 - 红橙色系
  Video: '#FF6B6B',
  Film: '#FF8787',
  Play: '#FA5252',
  Tv: '#E03131',
  Camera: '#FF922B',
  Mic: '#FD7E14',
  Radio: '#F76707',
  Headphones: '#E8590C',
  
  // 写作/编辑类 - 紫色系
  PenTool: '#DA77F2',
  Edit3: '#BE4BDB',
  Feather: '#AE3EC9',
  Type: '#9C36B5',
  AlignLeft: '#862E9C',
  
  // 创意/设计类 - 粉色系
  Sparkles: '#F783AC',
  Palette: '#E64980',
  Heart: '#D6336C',
  Star: '#C2255C',
  Gem: '#A61E4D',
  Crown: '#F06595',
  
  // 商务/办公类 - 蓝色系
  Briefcase: '#4DABF7',
  FileText: '#339AF0',
  Mail: '#228BE6',
  Calendar: '#1C7ED6',
  Clock: '#1971C2',
  Folder: '#1864AB',
  Archive: '#74C0FC',
  
  // 数据/分析类 - 青绿色系
  BarChart3: '#38D9A9',
  TrendingUp: '#20C997',
  PieChart: '#12B886',
  Activity: '#0CA678',
  Database: '#099268',
  
  // 营销/社交类 - 橙黄色系
  Megaphone: '#FFD43B',
  Target: '#FCC419',
  Users: '#FAB005',
  UserPlus: '#F59F00',
  Share2: '#F08C00',
  Globe: '#E67700',
  
  // 技术/开发类 - 靛蓝色系
  Code: '#748FFC',
  Terminal: '#5C7CFA',
  Cpu: '#4C6EF5',
  Cloud: '#4263EB',
  Settings: '#3B5BDB',
  Wrench: '#364FC7',
  
  // 学习/知识类 - 绿色系
  BookOpen: '#69DB7C',
  Lightbulb: '#51CF66',
  Award: '#40C057',
  Gift: '#37B24D',
  Rocket: '#2F9E44',
  Zap: '#8CE99A',
  
  // 通用/其他 - 灰蓝色系
  Bot: '#A5D8FF',
  MessageSquare: '#91A7FF',
  Search: '#96F2D7',
  Filter: '#B2F2BB',
  Eye: '#D0BFFF',
  Layers: '#EEBEFA',
  LayoutGrid: '#FFC9C9',
  LayoutDashboard: '#FFE066',
  Bell: '#FFA94D',
  Send: '#63E6BE',
  Link: '#74C0FC',
  Bookmark: '#F783AC',
  Tag: '#E599F7',
  Flag: '#FF8787',
  MapPin: '#69DB7C',
  Hash: '#FFD43B',
  Languages: '#4DABF7',
  Music: '#DA77F2',
  Image: '#38D9A9',
  CheckSquare: '#40C057',
  List: '#748FFC',
  DollarSign: '#20C997',
  ShoppingCart: '#FCC419',
};

// 获取图标颜色
export const getIconColor = (iconName) => {
  return iconColorMap[iconName] || '#FFD43B'; // 默认金黄色
};

// 图标分组配置（用于后台选择器）
export const iconGroups = [
  {
    label: '视频/媒体',
    icons: ['Video', 'Film', 'Play', 'Tv', 'Camera', 'Mic', 'Radio', 'Headphones']
  },
  {
    label: '写作/编辑',
    icons: ['PenTool', 'Edit3', 'Feather', 'Type', 'AlignLeft', 'FileText']
  },
  {
    label: '创意/设计',
    icons: ['Sparkles', 'Palette', 'Heart', 'Star', 'Gem', 'Crown']
  },
  {
    label: '商务/办公',
    icons: ['Briefcase', 'Mail', 'Calendar', 'Clock', 'Folder', 'Archive']
  },
  {
    label: '数据/分析',
    icons: ['BarChart3', 'TrendingUp', 'PieChart', 'Activity', 'Database']
  },
  {
    label: '营销/社交',
    icons: ['Megaphone', 'Target', 'Users', 'UserPlus', 'Share2', 'Globe']
  },
  {
    label: '技术/开发',
    icons: ['Code', 'Terminal', 'Cpu', 'Cloud', 'Settings', 'Wrench']
  },
  {
    label: '学习/知识',
    icons: ['BookOpen', 'Lightbulb', 'Award', 'Gift', 'Rocket', 'Zap']
  },
  {
    label: '通用/其他',
    icons: ['Bot', 'MessageSquare', 'Search', 'Languages', 'Music', 'Image', 'Hash', 'CheckSquare', 'List', 'Bell', 'Send', 'Link', 'Bookmark', 'Tag', 'Flag', 'MapPin']
  }
];

// 获取所有图标列表
export const getAllIcons = () => {
  return Object.keys(iconComponents);
};