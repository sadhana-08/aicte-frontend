import { AlertCircle, RefreshCw } from 'lucide-react';

export default function ErrorState({ title = 'Dashboard unavailable', message, onRetry }) {
  return (
    <div className="state-panel error-state">
      <span className="state-icon"><AlertCircle size={21} strokeWidth={1.7} /></span>
      <h2>{title}</h2>
      <p>{message || 'Dashboard data could not be loaded.'}</p>
      <button className="secondary-button" type="button" onClick={onRetry}>
        <RefreshCw size={15} /> Try again
      </button>
    </div>
  );
}
