import Admin from './pages/Admin';
import AdminAnnouncements from './pages/AdminAnnouncements';
import AdminDashboard from './pages/AdminDashboard';
import AdminFinance from './pages/AdminFinance';
import AdminModels from './pages/AdminModels';
import AdminPackages from './pages/AdminPackages';
import AdminPrompts from './pages/AdminPrompts';
import AdminSettings from './pages/AdminSettings';
import AdminTransactions from './pages/AdminTransactions';
import AdminUsers from './pages/AdminUsers';
import Chat from './pages/Chat';
import Credits from './pages/Credits';
import Home from './pages/Home';
import Landing from './pages/Landing';
import Marketplace from './pages/Marketplace';
import Profile from './pages/Profile';
import Templates from './pages/Templates';
import TokenOptimizationTest from './pages/TokenOptimizationTest';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Admin": Admin,
    "AdminAnnouncements": AdminAnnouncements,
    "AdminDashboard": AdminDashboard,
    "AdminFinance": AdminFinance,
    "AdminModels": AdminModels,
    "AdminPackages": AdminPackages,
    "AdminPrompts": AdminPrompts,
    "AdminSettings": AdminSettings,
    "AdminTransactions": AdminTransactions,
    "AdminUsers": AdminUsers,
    "Chat": Chat,
    "Credits": Credits,
    "Home": Home,
    "Landing": Landing,
    "Marketplace": Marketplace,
    "Profile": Profile,
    "Templates": Templates,
    "TokenOptimizationTest": TokenOptimizationTest,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};