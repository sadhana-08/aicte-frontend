export default function Loader({ label = 'Loading dashboard data' }) {
  return (
    <div className="loading-dashboard" role="status" aria-live="polite">
      <span className="loading-mark" />
      <span>{label}</span>
    </div>
  );
}
