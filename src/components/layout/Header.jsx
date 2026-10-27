import { Bell, Menu } from 'lucide-react';

export default function Header({ title, onMenuClick }) {
  return (
    <div className="page-header">
      <div className="page-heading-group">
        <button className="icon-button menu-button" type="button" aria-label="Toggle navigation" onClick={onMenuClick}>
          <Menu size={19} strokeWidth={1.8} />
        </button>
        <div>
          <p className="eyebrow">APPLICATION WORKSPACE</p>
          <h1>{title}</h1>
        </div>
      </div>
      <button className="icon-button notification-button" type="button" aria-label="Notifications">
        <Bell size={19} strokeWidth={1.8} />
      </button>
    </div>
  );
}
