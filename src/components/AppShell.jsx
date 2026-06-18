import HomeOpsSidebar from "./HomeOpsSidebar";

export default function AppShell({ activePage, children, setActivePage }) {
    return (
        <div className="app-shell">
            <HomeOpsSidebar activePage={activePage} setActivePage={setActivePage} />
            <div className="app-main">{children}</div>
        </div>
    );
}
