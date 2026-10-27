import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header.jsx';
import Sidebar from './Sidebar.jsx';

function getPageTitle(pathname) {
  if (pathname === '/') return 'Dashboard';
  if (pathname === '/applications/new') return 'New Application';
  if (pathname.startsWith('/applications/')) return 'Application Details';
  if (pathname.startsWith('/applications')) return 'Applications';
  if (pathname === '/ai-review') return 'AI Review';
  if (pathname === '/review-history') return 'Review History';
  return 'Dashboard';
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();

  function toggleSidebar() {
    if (window.matchMedia('(max-width: 760px)').matches) {
      setMobileOpen((isOpen) => !isOpen);
    } else {
      setCollapsed((isCollapsed) => !isCollapsed);
    }
  }

  return (
    <div className="app-shell">
      <header className="brand-bar">
        <div className="brand-mark" aria-hidden="true">A</div>
        <div className="brand-copy">
          <span className="brand-title">AICTE Document Validation &amp; Compliance Portal</span>
          <span className="brand-subtitle">Institutional application workspace</span>
        </div>
        <span className="demo-label">DEMO ENVIRONMENT</span>
      </header>
      <div className="workspace">
        <Sidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onNavigate={() => setMobileOpen(false)}
          onToggleCollapsed={() => setCollapsed((isCollapsed) => !isCollapsed)}
        />
        {mobileOpen && (
          <button
            className="sidebar-backdrop"
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
        )}
        <main className="main-panel">
          <Header title={getPageTitle(pathname)} onMenuClick={toggleSidebar} />
          <div className="page-content">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
