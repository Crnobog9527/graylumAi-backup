import { Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

// 深色主题下的状态颜色映射
export const statusMap = {
  pending: {
    label: '待处理',
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    icon: Clock
  },
  in_progress: {
    label: '处理中',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    icon: AlertCircle
  },
  resolved: {
    label: '已解决',
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
    icon: CheckCircle
  },
  closed: {
    label: '已关闭',
    color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    icon: XCircle
  }
};

// 深色主题下的优先级颜色映射
export const priorityMap = {
  low: { label: '低', color: 'text-gray-400' },
  medium: { label: '中', color: 'text-blue-400' },
  high: { label: '高', color: 'text-orange-400' },
  urgent: { label: '紧急', color: 'text-red-400' }
};

export const categoryMap = {
  technical_support: '技术支持',
  feature_request: '功能建议',
  bug_report: 'Bug反馈',
  account_issue: '账户问题',
  other: '其他'
};

export const categoryOptions = [
  { value: 'technical_support', label: '技术支持' },
  { value: 'feature_request', label: '功能建议' },
  { value: 'bug_report', label: 'Bug反馈' },
  { value: 'account_issue', label: '账户问题' },
  { value: 'other', label: '其他' }
];

export const priorityOptions = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'urgent', label: '紧急' }
];

export const statusOptions = [
  { value: 'pending', label: '待处理' },
  { value: 'in_progress', label: '处理中' },
  { value: 'resolved', label: '已解决' },
  { value: 'closed', label: '已关闭' }
];
