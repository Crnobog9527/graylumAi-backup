import Admin from './pages/Admin';
import AdminDashboard from './pages/AdminDashboard';
import AdminFinance from './pages/AdminFinance';
import AdminInvitations from './pages/AdminInvitations';
import AdminModels from './pages/AdminModels';
import AdminPackages from './pages/AdminPackages';
import AdminPrompts from './pages/AdminPrompts';
import AdminSettings from './pages/AdminSettings';
import AdminTransactions from './pages/AdminTransactions';
import AdminUsers from './pages/AdminUsers';
import Chat from './pages/Chat';
import Home from './pages/Home';
import Marketplace from './pages/Marketplace';
import Profile from './pages/Profile';
import Templates from './pages/Templates';
import AdminAnnouncements from './pages/AdminAnnouncements';
import AdminTickets from './pages/AdminTickets';
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
    "AdminTransactions": AdminTransactions,
    "AdminUsers": AdminUsers,
    "Chat": Chat,
    "Home": Home,
    "Marketplace": Marketplace,
    "Profile": Profile,
    "Templates": Templates,
    "AdminAnnouncements": AdminAnnouncements,
    "AdminTickets": AdminTickets,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};