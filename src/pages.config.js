import Chat from './pages/Chat';
import Templates from './pages/Templates';
import Credits from './pages/Credits';
import Admin from './pages/Admin';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Chat": Chat,
    "Templates": Templates,
    "Credits": Credits,
    "Admin": Admin,
}

export const pagesConfig = {
    mainPage: "Chat",
    Pages: PAGES,
    Layout: __Layout,
};