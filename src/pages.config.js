import Admin from './pages/Admin';
import AdminAnnouncements from './pages/AdminAnnouncements';
import AdminDashboard from './pages/AdminDashboard';
import AdminFinance from './pages/AdminFinance';
import AdminInvitations from './pages/AdminInvitations';
import AdminModels from './pages/AdminModels';
import AdminPackages from './pages/AdminPackages';
import AdminPrompts from './pages/AdminPrompts';
import AdminSettings from './pages/AdminSettings';
import AdminTicketDetail from './pages/AdminTicketDetail';
import AdminTickets from './pages/AdminTickets';
import AdminTransactions from './pages/AdminTransactions';
import AdminUsers from './pages/AdminUsers';
import CreateTicket from './pages/CreateTicket';
import Templates from './pages/Templates';
import TicketDetail from './pages/TicketDetail';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import Tickets from './pages/Tickets';
import Credits from './pages/Credits';
import Marketplace from './pages/Marketplace';
import Home from './pages/Home';
import __Layout from './Layout.jsx';


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
    "AdminTicketDetail": AdminTicketDetail,
    "AdminTickets": AdminTickets,
    "AdminTransactions": AdminTransactions,
    "AdminUsers": AdminUsers,
    "CreateTicket": CreateTicket,
    "Templates": Templates,
    "TicketDetail": TicketDetail,
    "Chat": Chat,
    "Profile": Profile,
    "Tickets": Tickets,
    "Credits": Credits,
    "Marketplace": Marketplace,
    "Home": Home,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};