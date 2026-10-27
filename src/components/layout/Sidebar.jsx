import { NavLink } from 'react-router-dom';
import {
  ClipboardList,
  FilePlus2,
  Files,
  History,
  LayoutDashboard,
  PanelLeftClose,
  Sparkles,
} from 'lucide-react';

const navigation = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard, end: true },
  { label: 'Applications', to: '/applications', icon: Files },
  { label: 'New Application', to: '/applications/new', icon: FilePlus2 },
  { label: 'AI Review', to: '/ai-review', icon: Sparkles },
  { label: 'Review History', to: '/review-history', icon: History },
];

export default function Sidebar({ collapsed, mobileOpen, onNavigate, onToggleCollapsed }) {
  return (
    <aside className={`sidebar${collapsed ? ' is-collapsed' : ''}${mobileOpen ? ' is-mobile-open' : ''}`}>
      <div className="sidebar-section-label">WORKSPACE</div>
      <nav className="sidebar-nav" aria-label="Main navigation">
        {navigation.map(({ label, to, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={label}
            aria-label={label}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            onClick={onNavigate}
          >
            <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
            <span className="nav-label">{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-foot">
        <div className="sidebar-foot-icon"><ClipboardList size={17} strokeWidth={1.8} /></div>
        <div className="sidebar-foot-copy">
          <strong>Portal workspace</strong>
          <span>Demo account</span>
        </div>
        <button className="icon-button collapse-button" type="button" aria-label="Collapse sidebar" onClick={onToggleCollapsed}>
          <PanelLeftClose size={17} strokeWidth={1.8} />
        </button>
      </div>
    </aside>
  );
}
