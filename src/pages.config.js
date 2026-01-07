import { lazy } from 'react';

// 懒加载所有页面组件
const Admin = lazy(() => import('./pages/Admin'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminFinance = lazy(() => import('./pages/AdminFinance'));
const AdminInvitations = lazy(() => import('./pages/AdminInvitations'));
const AdminModels = lazy(() => import('./pages/AdminModels'));
const AdminPackages = lazy(() => import('./pages/AdminPackages'));
const AdminPrompts = lazy(() => import('./pages/AdminPrompts'));
const AdminSettings = lazy(() => import('./pages/AdminSettings'));
const AdminTickets = lazy(() => import('./pages/AdminTickets'));
const AdminTransactions = lazy(() => import('./pages/AdminTransactions'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const AdminAnnouncements = lazy(() => import('./pages/AdminAnnouncements'));
const AdminFeatured = lazy(() => import('./pages/AdminFeatured'));
const Chat = lazy(() => import('./pages/Chat'));
const Home = lazy(() => import('./pages/Home'));
const Marketplace = lazy(() => import('./pages/Marketplace'));
const Profile = lazy(() => import('./pages/Profile'));
const Templates = lazy(() => import('./pages/Templates'));

// Layout 保持静态导入（布局组件不需要懒加载）
import __Layout from './Layout.jsx';

export const PAGES = {
    "Admin": Admin,
    "AdminDashboard": AdminDashboard,
    "AdminFinance": AdminFinance,
    "AdminInvitations": AdminInvitations,
    "AdminModels": AdminModels,
    "AdminPackages": AdminPackages,
    "AdminPrompts": AdminPrompts,
    "AdminSettings": AdminSettings,
    "AdminTickets": AdminTickets,
    "AdminTransactions": AdminTransactions,
    "AdminUsers": AdminUsers,
    "Chat": Chat,
    "Home": Home,
    "Marketplace": Marketplace,
    "Profile": Profile,
    "Templates": Templates,
    "AdminAnnouncements": AdminAnnouncements,
    "AdminFeatured": AdminFeatured,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};
