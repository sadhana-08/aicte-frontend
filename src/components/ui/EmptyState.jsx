import { Files } from 'lucide-react';

export default function EmptyState() {
  return (
    <div className="state-panel">
      <span className="state-icon"><Files size={21} strokeWidth={1.7} /></span>
      <h2>No applications yet</h2>
      <p>Applications will appear here when they are added to this workspace.</p>
    </div>
  );
}
