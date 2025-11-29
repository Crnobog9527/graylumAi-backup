import Chat from './pages/Chat';
import Credits from './pages/Credits';
import AdminDashboard from './pages/AdminDashboard';
import AdminModels from './pages/AdminModels';
import AdminPrompts from './pages/AdminPrompts';
import AdminPackages from './pages/AdminPackages';
import AdminUsers from './pages/AdminUsers';
import AdminTransactions from './pages/AdminTransactions';
import AdminSettings from './pages/AdminSettings';


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
}

export const pagesConfig = {
    mainPage: "Chat",
    Pages: PAGES,
};