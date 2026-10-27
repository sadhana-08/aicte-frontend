import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FilePlus2, Search } from 'lucide-react';
import { getApplications } from '../api/applications.js';
import EmptyState from '../components/ui/EmptyState.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import Loader from '../components/ui/Loader.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';

const statuses = [
  'Draft',
  'Ready for Submission',
  'Under Review',
  'Issues Found',
  'Pending Human Review',
];

function formatDate(value) {
  return value
    ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`))
    : 'Not submitted';
}

export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);
    setError('');

    getApplications()
      .then((data) => {
        if (isCurrent) setApplications(data);
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

  const filteredApplications = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    return applications.filter((application) => {
      const matchesSearch = !normalizedSearch
        || application.institution.toLocaleLowerCase().includes(normalizedSearch)
        || application.id.toLocaleLowerCase().includes(normalizedSearch);
      const matchesStatus = statusFilter === 'All statuses' || application.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [applications, search, statusFilter]);

  if (isLoading) return <Loader label="Loading applications" />;
  if (error) {
    return (
      <ErrorState
        title="Applications unavailable"
        message={error}
        onRetry={() => setReloadKey((key) => key + 1)}
      />
    );
  }
  if (applications.length === 0) {
    return <EmptyState title="No applications yet" message="Applications will appear here when they are added to this workspace." />;
  }

  return (
    <section className="applications-page">
      <div className="page-section-heading">
        <div>
          <p className="eyebrow">APPLICATION WORKSPACE</p>
          <h2>Applications</h2>
          <p>Review and find institution applications in this workspace.</p>
        </div>
        <Link className="primary-button" to="/applications/new">
          <FilePlus2 size={16} /> New Application
        </Link>
      </div>

      <section className="panel applications-list-panel" aria-label="Applications list">
        <div className="list-toolbar">
          <label className="search-field">
            <Search size={16} aria-hidden="true" />
            <span className="sr-only">Search by institution or application ID</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search institution or ID"
            />
          </label>
          <label className="status-filter-label">
            <span>Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option>All statuses</option>
              {statuses.map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
          <span className="result-count">{filteredApplications.length} of {applications.length} applications</span>
        </div>

        {filteredApplications.length === 0 ? (
          <div className="no-results-state">
            <Search size={21} strokeWidth={1.7} />
            <h3>No matching applications</h3>
            <p>Try changing the search term or status filter.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="applications-table applications-list-table">
              <thead>
                <tr>
                  <th scope="col">Application ID</th>
                  <th scope="col">Institution</th>
                  <th scope="col">State</th>
                  <th scope="col">Submitted date</th>
                  <th scope="col">Documents</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map((application) => (
                  <tr key={application.id}>
                    <td><Link className="application-id" to={`/applications/${application.id}`}>{application.id}</Link></td>
                    <td className="institution-cell">{application.institution}</td>
                    <td>{application.state}</td>
                    <td className="date-cell">{formatDate(application.submittedAt)}</td>
                    <td>{application.documentCount}</td>
                    <td><StatusBadge status={application.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="applications-demo-note">All application records shown are fictional demo data.</p>
    </section>
  );
}
