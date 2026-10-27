import { Files } from 'lucide-react';

export default function EmptyState({ title = 'No applications yet', message = 'Applications will appear here when they are added to this workspace.' }) {
  return (
    <div className="state-panel">
      <span className="state-icon"><Files size={21} strokeWidth={1.7} /></span>
      <h2>{title}</h2>
      <p>{message}</p>
    </div>
  );
}
