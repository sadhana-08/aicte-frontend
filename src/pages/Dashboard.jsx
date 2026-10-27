import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileText,
  UserRoundCheck,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getDashboardData } from '../api/dashboard.js';
import EmptyState from '../components/ui/EmptyState.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import Loader from '../components/ui/Loader.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';

const statusOrder = [
  'Draft',
  'Ready for Submission',
  'Under Review',
  'Issues Found',
  'Pending Human Review',
];

function formatDate(value, options = { day: '2-digit', month: 'short', year: 'numeric' }) {
  return new Intl.DateTimeFormat('en-IN', options).format(new Date(value));
}

function buildStatistics(applications) {
  const counts = applications.reduce((totals, application) => {
    totals[application.status] = (totals[application.status] ?? 0) + 1;
    return totals;
  }, {});

  return [
    { label: 'Total Applications', value: applications.length, icon: FileText, tone: 'tone-blue' },
    { label: 'Ready for Submission', value: counts['Ready for Submission'] ?? 0, icon: CheckCircle2, tone: 'tone-green' },
    { label: 'Issues Found', value: counts['Issues Found'] ?? 0, icon: AlertTriangle, tone: 'tone-amber' },
    { label: 'Pending Human Review', value: counts['Pending Human Review'] ?? 0, icon: UserRoundCheck, tone: 'tone-slate' },
  ];
}

function buildChartData(applications) {
  return statusOrder.map((status) => ({
    status,
    count: applications.filter((application) => application.status === status).length,
    shortLabel: {
      Draft: 'Draft',
      'Ready for Submission': 'Ready',
      'Under Review': 'Review',
      'Issues Found': 'Issues',
      'Pending Human Review': 'Human review',
    }[status],
  }));
}

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);
    setError('');

    getDashboardData()
      .then((data) => {
        if (isCurrent) setDashboard(data);
      })
      .catch((loadError) => {
        if (isCurrent) setError(loadError.message);
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [reloadKey]);

  if (isLoading) return <Loader />;
  if (error) return <ErrorState message={error} onRetry={() => setReloadKey((key) => key + 1)} />;

  const applications = dashboard?.applications ?? [];
  const activity = dashboard?.activity ?? [];

  if (applications.length === 0) return <EmptyState />;

  const statistics = buildStatistics(applications);
  const chartData = buildChartData(applications);
  const recentApplications = applications.slice(0, 5);

  return (
    <div className="dashboard-page">
      <div className="dashboard-intro">
        <div>
          <p className="eyebrow">OVERVIEW</p>
          <h2>Application dashboard</h2>
          <p className="intro-copy">A current view of application status across the demo workspace.</p>
        </div>
        <span className="updated-label"><Clock3 size={14} /> Updated {formatDate(applications[0].updatedAt)}</span>
      </div>

      <section className="stats-grid" aria-label="Application statistics">
        {statistics.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </section>

      <div className="dashboard-main-grid">
        <section className="panel applications-panel">
          <div className="panel-heading">
            <div>
              <h2>Recent applications</h2>
              <p>Latest activity across the workspace</p>
            </div>
            <Link className="text-link" to="/applications">View applications <span aria-hidden="true">&rarr;</span></Link>
          </div>
          <div className="table-scroll">
            <table className="applications-table">
              <thead>
                <tr>
                  <th scope="col">Application ID</th>
                  <th scope="col">Institution</th>
                  <th scope="col">State</th>
                  <th scope="col">Updated</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentApplications.map((application) => (
                  <tr key={application.id}>
                    <td><Link className="application-id" to={`/applications/${application.id}`}>{application.id}</Link></td>
                    <td className="institution-cell">{application.institution}</td>
                    <td>{application.state}</td>
                    <td className="date-cell">{formatDate(application.updatedAt)}</td>
                    <td><StatusBadge status={application.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <h2>Application status</h2>
              <p>Applications by current status</p>
            </div>
            <span className="chart-total">{applications.length} total</span>
          </div>
          <div className="chart-wrap" role="img" aria-label="Bar chart showing the number of applications by status">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 8, left: -20, bottom: 4 }}>
                <CartesianGrid vertical={false} stroke="#e7ebef" />
                <XAxis dataKey="shortLabel" tick={{ fill: '#697586', fontSize: 11 }} axisLine={false} tickLine={false} interval={0} />
                <YAxis allowDecimals={false} tick={{ fill: '#697586', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: '#f1f5f8' }}
                  contentStyle={{ border: '1px solid #dfe4e9', borderRadius: 4, fontSize: 12 }}
                  formatter={(value) => [value, 'Applications']}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.status ?? ''}
                />
                <Bar dataKey="count" fill="#245b83" radius={[2, 2, 0, 0]} maxBarSize={34} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <h2>Recent activity</h2>
              <p>Latest application updates</p>
            </div>
            <Link className="text-link" to="/review-history">View history <span aria-hidden="true">&rarr;</span></Link>
          </div>
          {activity.length === 0 ? (
            <p className="activity-empty">No recent activity.</p>
          ) : (
            <ol className="activity-list">
              {activity.slice(0, 4).map((item) => (
                <li className="activity-item" key={item.id}>
                  <span className="activity-marker" aria-hidden="true" />
                  <div className="activity-content">
                    <p>{item.message}</p>
                    <Link to={`/applications/${item.applicationId}`}>{item.applicationId}</Link>
                  </div>
                  <time dateTime={item.timestamp}>{formatDate(item.timestamp, { day: '2-digit', month: 'short' })}</time>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <div className="demo-notice" role="note">
        <span className="demo-notice-mark">i</span>
        <p><strong>Fictional demo data.</strong> All institutions, application IDs, statuses, and activity shown here are sample data for demonstration only.</p>
      </div>
    </div>
  );
}
