import React, { createContext, useContext, useState, useEffect } from 'react';

const translations = {
  zh: {
    // Common
    save: '保存',
    cancel: '取消',
    delete: '删除',
    edit: '编辑',
    create: '创建',
    update: '更新',
    add: '添加',
    search: '搜索',
    actions: '操作',
    status: '状态',
    active: '启用',
    inactive: '禁用',
    loading: '加载中...',
    
    // Sidebar
    adminPanel: '管理后台',
    dashboard: '仪表盘',
    aiModels: 'AI模型',
    promptModules: '提示词模块',
    creditPackages: '积分套餐',
    users: '用户管理',
    transactions: '交易记录',
    settings: '系统设置',
    backToApp: '返回应用',
    language: '语言',
    
    // Dashboard
    dashboardTitle: '仪表盘',
    dashboardSubtitle: '平台概览与统计数据',
    totalUsers: '总用户数',
    totalModels: '模型数量',
    totalModules: '模块数量',
    totalCreditsUsed: '已使用积分',
    recentTransactions: '最近交易',
    recentConversations: '最近对话',
    
    // Models
    modelsTitle: 'AI模型',
    modelsSubtitle: '管理可用的AI模型及其配置',
    addModel: '添加模型',
    editModel: '编辑模型',
    displayName: '显示名称',
    modelId: '模型ID',
    provider: '提供商',
    apiKey: 'API密钥',
    apiEndpoint: 'API端点（可选）',
    creditsPerMessage: '每条消息积分',
    maxTokens: '最大Token数',
    description: '描述',
    enableWebSearch: '启用联网搜索',
    webSearchNote: '开启后将使用内置集成，支持实时联网获取信息',
    deleteModel: '删除模型',
    deleteModelConfirm: '确定要删除这个模型吗？此操作无法撤销。',
    noModelsYet: '暂无AI模型配置。添加第一个模型以开始使用。',
    
    // Prompts
    promptsTitle: '提示词模块',
    promptsSubtitle: '管理AI提示词模块',
    addPrompt: '添加模块',
    editPrompt: '编辑模块',
    title: '标题',
    category: '分类',
    icon: '图标',
    color: '颜色',
    systemPrompt: '系统提示词',
    userPromptTemplate: '用户提示词模板（可选）',
    creditsMultiplier: '积分倍率',
    sortOrder: '排序',
    assignedModel: '指定模型',
    useUserModel: '使用用户选择的模型',
    deletePrompt: '删除模块',
    deletePromptConfirm: '确定要删除这个模块吗？此操作无法撤销。',
    noPromptsYet: '暂无提示词模块。添加第一个模块以开始使用。',
    
    // Packages
    packagesTitle: '积分套餐',
    packagesSubtitle: '管理积分套餐和定价',
    addPackage: '添加套餐',
    editPackage: '编辑套餐',
    packageName: '套餐名称',
    credits: '积分数量',
    price: '价格',
    bonusCredits: '赠送积分',
    isPopular: '热门标识',
    deletePackage: '删除套餐',
    deletePackageConfirm: '确定要删除这个套餐吗？此操作无法撤销。',
    noPackagesYet: '暂无积分套餐。添加第一个套餐以开始使用。',
    
    // Users
    usersTitle: '用户管理',
    usersSubtitle: '查看和管理用户账户',
    searchUsers: '搜索用户...',
    name: '姓名',
    email: '邮箱',
    role: '角色',
    creditBalance: '积分余额',
    joinDate: '注册日期',
    adjustCredits: '调整积分',
    adjustmentAmount: '调整数量',
    reason: '原因（可选）',
    currentBalance: '当前余额',
    newBalance: '调整后余额',
    noUsersFound: '未找到用户',
    
    // Transactions
    transactionsTitle: '交易记录',
    transactionsSubtitle: '查看所有积分交易',
    totalPurchased: '总购买',
    totalUsed: '总消耗',
    netCredits: '净积分',
    user: '用户',
    type: '类型',
    amount: '数量',
    date: '日期',
    filterByType: '按类型筛选',
    allTypes: '全部类型',
    purchase: '购买',
    usage: '消耗',
    bonus: '赠送',
    refund: '退款',
    adminAdjustment: '管理员调整',
    noTransactionsFound: '未找到交易记录',
    
    // Settings
    settingsTitle: '系统设置',
    settingsSubtitle: '配置平台设置',
    general: '通用',
    creditsSettings: '积分',
    features: '功能',
    platformName: '平台名称',
    welcomeMessage: '欢迎语',
    defaultCredits: '新用户默认积分',
    minCreditsWarning: '积分不足警告阈值',
    enableReferral: '启用推荐系统',
    enableDailyBonus: '启用每日签到奖励',
    maintenanceMode: '维护模式',
    saveSettings: '保存设置',
    saving: '保存中...',
  },
  en: {
    // Common
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    create: 'Create',
    update: 'Update',
    add: 'Add',
    search: 'Search',
    actions: 'Actions',
    status: 'Status',
    active: 'Active',
    inactive: 'Inactive',
    loading: 'Loading...',
    
    // Sidebar
    adminPanel: 'Admin Panel',
    dashboard: 'Dashboard',
    aiModels: 'AI Models',
    promptModules: 'Prompt Modules',
    creditPackages: 'Credit Packages',
    users: 'Users',
    transactions: 'Transactions',
    settings: 'Settings',
    backToApp: 'Back to App',
    language: 'Language',
    
    // Dashboard
    dashboardTitle: 'Dashboard',
    dashboardSubtitle: 'Platform overview and statistics',
    totalUsers: 'Total Users',
    totalModels: 'Total Models',
    totalModules: 'Total Modules',
    totalCreditsUsed: 'Credits Used',
    recentTransactions: 'Recent Transactions',
    recentConversations: 'Recent Conversations',
    
    // Models
    modelsTitle: 'AI Models',
    modelsSubtitle: 'Manage available AI models and their configurations',
    addModel: 'Add Model',
    editModel: 'Edit Model',
    displayName: 'Display Name',
    modelId: 'Model ID',
    provider: 'Provider',
    apiKey: 'API Key',
    apiEndpoint: 'API Endpoint (optional)',
    creditsPerMessage: 'Credits per Message',
    maxTokens: 'Max Tokens',
    description: 'Description',
    enableWebSearch: 'Enable Web Search',
    webSearchNote: 'When enabled, uses built-in integration for real-time internet access',
    deleteModel: 'Delete Model',
    deleteModelConfirm: 'Are you sure you want to delete this model? This action cannot be undone.',
    noModelsYet: 'No AI models configured yet. Add your first model to get started.',
    
    // Prompts
    promptsTitle: 'Prompt Modules',
    promptsSubtitle: 'Manage AI prompt modules',
    addPrompt: 'Add Module',
    editPrompt: 'Edit Module',
    title: 'Title',
    category: 'Category',
    icon: 'Icon',
    color: 'Color',
    systemPrompt: 'System Prompt',
    userPromptTemplate: 'User Prompt Template (optional)',
    creditsMultiplier: 'Credits Multiplier',
    sortOrder: 'Sort Order',
    assignedModel: 'Assigned Model',
    useUserModel: "Use user's selected model",
    deletePrompt: 'Delete Module',
    deletePromptConfirm: 'Are you sure you want to delete this module? This action cannot be undone.',
    noPromptsYet: 'No prompt modules yet. Add your first module to get started.',
    
    // Packages
    packagesTitle: 'Credit Packages',
    packagesSubtitle: 'Manage credit packages and pricing',
    addPackage: 'Add Package',
    editPackage: 'Edit Package',
    packageName: 'Package Name',
    credits: 'Credits',
    price: 'Price',
    bonusCredits: 'Bonus Credits',
    isPopular: 'Popular Badge',
    deletePackage: 'Delete Package',
    deletePackageConfirm: 'Are you sure you want to delete this package? This action cannot be undone.',
    noPackagesYet: 'No credit packages yet. Add your first package to get started.',
    
    // Users
    usersTitle: 'User Management',
    usersSubtitle: 'View and manage user accounts',
    searchUsers: 'Search users...',
    name: 'Name',
    email: 'Email',
    role: 'Role',
    creditBalance: 'Credit Balance',
    joinDate: 'Join Date',
    adjustCredits: 'Adjust Credits',
    adjustmentAmount: 'Adjustment Amount',
    reason: 'Reason (optional)',
    currentBalance: 'Current Balance',
    newBalance: 'New Balance',
    noUsersFound: 'No users found',
    
    // Transactions
    transactionsTitle: 'Transactions',
    transactionsSubtitle: 'View all credit transactions',
    totalPurchased: 'Total Purchased',
    totalUsed: 'Total Used',
    netCredits: 'Net Credits',
    user: 'User',
    type: 'Type',
    amount: 'Amount',
    date: 'Date',
    filterByType: 'Filter by type',
    allTypes: 'All Types',
    purchase: 'Purchase',
    usage: 'Usage',
    bonus: 'Bonus',
    refund: 'Refund',
    adminAdjustment: 'Admin Adjustment',
    noTransactionsFound: 'No transactions found',
    
    // Settings
    settingsTitle: 'System Settings',
    settingsSubtitle: 'Configure platform settings',
    general: 'General',
    creditsSettings: 'Credits',
    features: 'Features',
    platformName: 'Platform Name',
    welcomeMessage: 'Welcome Message',
    defaultCredits: 'Default Credits for New Users',
    minCreditsWarning: 'Low Credits Warning Threshold',
    enableReferral: 'Enable Referral System',
    enableDailyBonus: 'Enable Daily Bonus',
    maintenanceMode: 'Maintenance Mode',
    saveSettings: 'Save Settings',
    saving: 'Saving...',
  }
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('admin_language') || 'zh';
    }
    return 'zh';
  });

  useEffect(() => {
    localStorage.setItem('admin_language', language);
  }, [language]);

  const t = (key) => {
    return translations[language]?.[key] || translations.zh[key] || key;
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'zh' ? 'en' : 'zh');
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}