import { ArrowUpRight } from 'lucide-react';

export default function StatCard({ label, value, icon: Icon, tone }) {
  return (
    <article className="stat-card">
      <div className="stat-card-top">
        <span className="stat-label">{label}</span>
        <span className={`stat-icon ${tone}`}><Icon size={18} strokeWidth={1.8} /></span>
      </div>
      <div className="stat-card-bottom">
        <strong className="stat-value">{value}</strong>
        <span className="stat-context"><ArrowUpRight size={14} /> Current</span>
      </div>
    </article>
  );
}
