import { Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

export const statusMap = {
  pending: { label: '待处理', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
  in_progress: { label: '处理中', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: AlertCircle },
  resolved: { label: '已解决', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
  closed: { label: '已关闭', color: 'bg-slate-100 text-slate-800 border-slate-200', icon: XCircle }
};

export const priorityMap = {
  low: { label: '低', color: 'text-slate-500' },
  medium: { label: '中', color: 'text-blue-600' },
  high: { label: '高', color: 'text-orange-600' },
  urgent: { label: '紧急', color: 'text-red-600' }
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
