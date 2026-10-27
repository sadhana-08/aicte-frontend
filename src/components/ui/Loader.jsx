export default function Loader() {
  return (
    <div className="loading-dashboard" role="status" aria-live="polite">
      <span className="loading-mark" />
      <span>Loading dashboard data</span>
    </div>
  );
}
