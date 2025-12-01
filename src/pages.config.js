import Chat from './pages/Chat';
import Credits from './pages/Credits';
import AdminDashboard from './pages/AdminDashboard';
import AdminModels from './pages/AdminModels';
import AdminPrompts from './pages/AdminPrompts';
import AdminPackages from './pages/AdminPackages';
import AdminUsers from './pages/AdminUsers';
import AdminTransactions from './pages/AdminTransactions';
import AdminSettings from './pages/AdminSettings';
import Home from './pages/Home';
import Marketplace from './pages/Marketplace';
import Profile from './pages/Profile';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Chat": Chat,
    "Credits": Credits,
    "AdminDashboard": AdminDashboard,
    "AdminModels": AdminModels,
    "AdminPrompts": AdminPrompts,
    "AdminPackages": AdminPackages,
    "AdminUsers": AdminUsers,
    "AdminTransactions": AdminTransactions,
    "AdminSettings": AdminSettings,
    "Home": Home,
    "Marketplace": Marketplace,
    "Profile": Profile,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};