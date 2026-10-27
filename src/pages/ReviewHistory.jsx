import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { getReviewHistory } from '../api/reviewHistory.js';
import EmptyState from '../components/ui/EmptyState.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import Loader from '../components/ui/Loader.jsx';

const outcomes = [
  'Completed',
  'Completed - no findings',
  'Failed',
  'Cancelled',
  'Not available (demo mode)',
];

function formatRunTime(value) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function getOutcomeClass(outcome) {
  if (outcome === 'Completed') return 'outcome-completed';
  if (outcome === 'Completed - no findings') return 'outcome-no-findings';
  if (outcome === 'Failed') return 'outcome-failed';
  if (outcome === 'Cancelled') return 'outcome-cancelled';
  return 'outcome-demo';
}

function FindingCount({ counts, field }) {
  return <td className="review-count-cell">{counts ? counts[field] ?? 0 : '—'}</td>;
}

export default function ReviewHistory() {
  const [runs, setRuns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('All outcomes');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);
    setError('');

    getReviewHistory()
      .then((data) => {
        if (isCurrent) setRuns(data);
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

  const filteredRuns = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    return runs.filter((run) => {
      const matchesSearch = !normalizedSearch
        || run.applicationId.toLocaleLowerCase().includes(normalizedSearch)
        || run.institutionName.toLocaleLowerCase().includes(normalizedSearch);
      const matchesOutcome = outcomeFilter === 'All outcomes' || run.outcome === outcomeFilter;
      return matchesSearch && matchesOutcome;
    });
  }, [runs, search, outcomeFilter]);

  if (isLoading) return <Loader label="Loading review history" />;
  if (error) {
    return (
      <ErrorState
        title="Review history unavailable"
        message={error}
        onRetry={() => setReloadKey((key) => key + 1)}
      />
    );
  }
  if (runs.length === 0) {
    return (
      <section className="review-history-page">
        <div className="page-section-heading review-history-heading">
          <div>
            <p className="eyebrow">AI REVIEW</p>
            <h2>Review History</h2>
            <p>A log of review runs for applications in this workspace.</p>
          </div>
        </div>
        <EmptyState
          title="No reviews have been run yet."
          message="Reviews you run from the AI Review page will appear here."
        />
        <ReviewHistoryNotice />
      </section>
    );
  }

  return (
    <section className="review-history-page">
      <div className="page-section-heading review-history-heading">
        <div>
          <p className="eyebrow">AI REVIEW</p>
          <h2>Review History</h2>
          <p>A log of review runs for applications in this workspace.</p>
        </div>
        <span className="review-run-count">{filteredRuns.length} of {runs.length} runs</span>
      </div>

      <section className="panel review-history-panel" aria-label="Review history">
        <div className="list-toolbar review-history-toolbar">
          <label className="search-field">
            <Search size={16} aria-hidden="true" />
            <span className="sr-only">Search by application ID or institution name</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search application ID or institution"
            />
          </label>
          <label className="status-filter-label">
            <span>Outcome</span>
            <select value={outcomeFilter} onChange={(event) => setOutcomeFilter(event.target.value)}>
              <option>All outcomes</option>
              {outcomes.map((outcome) => <option key={outcome}>{outcome}</option>)}
            </select>
          </label>
        </div>

        {filteredRuns.length === 0 ? (
          <div className="no-results-state">
            <Search size={21} strokeWidth={1.7} />
            <h3>No matching review runs</h3>
            <p>Try changing the search term or outcome filter.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="applications-table review-history-table">
              <thead>
                <tr>
                  <th scope="col">Run time</th>
                  <th scope="col">Application ID</th>
                  <th scope="col">Institution</th>
                  <th scope="col">Document</th>
                  <th scope="col">Outcome</th>
                  <th scope="col">Needs review</th>
                  <th scope="col">Potential match</th>
                  <th scope="col">Insufficient evidence</th>
                  <th scope="col">View</th>
                </tr>
              </thead>
              <tbody>
                {filteredRuns.map((run) => (
                  <tr key={run.id}>
                    <td className="date-cell">{formatRunTime(run.runTime)}</td>
                    <td><Link className="application-id" to={`/applications/${run.applicationId}`}>{run.applicationId}</Link></td>
                    <td className="institution-cell">{run.institutionName}</td>
                    <td className="review-document-name">{run.documentName || '—'}</td>
                    <td><span className={`review-outcome ${getOutcomeClass(run.outcome)}`}>{run.outcome}</span></td>
                    <FindingCount counts={run.findingsCounts} field="needsReview" />
                    <FindingCount counts={run.findingsCounts} field="potentialMatch" />
                    <FindingCount counts={run.findingsCounts} field="insufficientEvidence" />
                    <td><Link className="review-view-link" to={`/applications/${run.applicationId}/review`}>View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <ReviewHistoryNotice />
    </section>
  );
}

function ReviewHistoryNotice() {
  return (
    <div className="demo-notice review-history-notice" role="note">
      <span className="demo-notice-mark">i</span>
      <p>Review history lists runs only. AI-assisted findings require human verification.</p>
    </div>
  );
}
