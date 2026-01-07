import { lazy } from 'react';
import __Layout from './Layout.jsx';

// 路由级代码分割 - 使用 React.lazy 实现按需加载
const Admin = lazy(() => import('./pages/Admin'));
const AdminAnnouncements = lazy(() => import('./pages/AdminAnnouncements'));
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
const Chat = lazy(() => import('./pages/Chat'));
const Home = lazy(() => import('./pages/Home'));
const Marketplace = lazy(() => import('./pages/Marketplace'));
const Profile = lazy(() => import('./pages/Profile'));
const Templates = lazy(() => import('./pages/Templates'));

export const PAGES = {
    "Admin": Admin,
    "AdminAnnouncements": AdminAnnouncements,
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
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};