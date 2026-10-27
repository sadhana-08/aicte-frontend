import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, Sparkles } from 'lucide-react';
import { getApplicationById } from '../api/applications.js';
import EmptyState from '../components/ui/EmptyState.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import Loader from '../components/ui/Loader.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';

function formatDate(value, options = { day: '2-digit', month: 'short', year: 'numeric' }) {
  if (!value) return 'Not submitted';
  return new Intl.DateTimeFormat('en-IN', options).format(new Date(value));
}

function formatFileSize(sizeKb) {
  if (sizeKb >= 1024) return `${(sizeKb / 1024).toFixed(1)} MB`;
  return `${sizeKb} KB`;
}

function SummaryItem({ label, value }) {
  return (
    <div className="details-summary-item">
      <dt>{label}</dt>
      <dd>{value || 'Not provided'}</dd>
    </div>
  );
}

export default function ApplicationDetails() {
  const { id } = useParams();
  const [application, setApplication] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);
    setError('');
    setNotFound(false);
    setApplication(null);

    getApplicationById(id)
      .then((data) => {
        if (isCurrent) setApplication(data);
      })
      .catch((loadError) => {
        if (!isCurrent) return;
        if (loadError.message === 'Application not found') {
          setNotFound(true);
        } else {
          setError(loadError.message);
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [id, reloadKey]);

  if (isLoading) return <Loader label="Loading application details" />;
  if (notFound) {
    return (
      <section className="details-state-wrap">
        <EmptyState title="Application not found" message={`No application record was found for ${id}.`} />
        <Link className="details-back-link" to="/applications"><ArrowLeft size={15} /> Back to Applications</Link>
      </section>
    );
  }
  if (error) {
    return (
      <section className="details-state-wrap">
        <ErrorState
          title="Application details unavailable"
          message={error}
          onRetry={() => setReloadKey((key) => key + 1)}
        />
        <Link className="details-back-link" to="/applications"><ArrowLeft size={15} /> Back to Applications</Link>
      </section>
    );
  }

  const documents = application.documents ?? [];
  const events = [...(application.events ?? [])].sort((first, second) => new Date(second.date) - new Date(first.date));

  return (
    <section className="application-details-page">
      <Link className="details-back-link" to="/applications"><ArrowLeft size={15} /> Back to Applications</Link>

      <section className="panel details-summary-panel">
        <div className="details-summary-heading">
          <div className="details-summary-title">
            <p className="eyebrow">APPLICATION DETAILS</p>
            <h2>{application.institution}</h2>
            <span className="details-application-id">{application.id}</span>
          </div>
          <StatusBadge status={application.status} />
        </div>
        <dl className="details-summary-grid">
          <SummaryItem label="State" value={application.state} />
          <SummaryItem label="City" value={application.city} />
          <SummaryItem label="Institution type" value={application.institutionType} />
          <SummaryItem label="Application type" value={application.applicationType} />
          <SummaryItem label="Contact person" value={application.contactName} />
          <SummaryItem label="Submitted date" value={formatDate(application.submittedAt)} />
        </dl>
      </section>

      <section className="panel details-section" aria-labelledby="documents-heading">
        <div className="details-section-heading">
          <div>
            <h3 id="documents-heading">Documents</h3>
            <p>Files associated with this application</p>
          </div>
          <span className="details-count">{documents.length} {documents.length === 1 ? 'document' : 'documents'}</span>
        </div>
        {documents.length === 0 ? (
          <div className="details-empty-state">
            <EmptyState title="No documents uploaded" message="There are no documents attached to this application." />
          </div>
        ) : (
          <div className="table-scroll">
            <table className="applications-table detail-documents-table">
              <thead>
                <tr>
                  <th scope="col">Filename</th>
                  <th scope="col">Size</th>
                  <th scope="col">Uploaded</th>
                  <th scope="col">Document status</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((document) => (
                  <tr key={`${document.name}-${document.uploadedOn}`}>
                    <td className="detail-document-name">{document.name}</td>
                    <td>{formatFileSize(document.sizeKb)}</td>
                    <td className="date-cell">{formatDate(document.uploadedOn)}</td>
                    <td><StatusBadge status={document.status} /></td>
                    <td>
                      <span className="disabled-action-tooltip" title="Document preview not available in demo mode">
                        <button className="secondary-button detail-disabled-button" type="button" disabled aria-label={`View ${document.name}`}>
                          <Eye size={14} /> View
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="details-feature-grid">
        <section className="panel details-section" aria-labelledby="extraction-heading">
          <div className="details-section-heading">
            <div>
              <h3 id="extraction-heading">Extraction results</h3>
              <p>Text extraction status</p>
            </div>
          </div>
          <div className="details-empty-state">
            <EmptyState title="No extraction results" message="No text has been extracted yet. Extraction runs when the backend is connected." />
          </div>
        </section>

        <section className="panel details-section" aria-labelledby="handbook-heading">
          <div className="details-section-heading">
            <div>
              <h3 id="handbook-heading">AICTE handbook references</h3>
              <p>Reference status</p>
            </div>
          </div>
          <div className="details-empty-state">
            <EmptyState title="No handbook references yet." message="" />
          </div>
        </section>
      </section>

      <section className="panel details-section" aria-labelledby="findings-heading">
        <div className="details-section-heading">
          <div>
            <h3 id="findings-heading">AI review findings</h3>
            <p>Review status</p>
          </div>
          <Link className="secondary-button detail-disabled-button" to={`/applications/${application.id}/review`}>
            <Sparkles size={14} /> Run AI Review
          </Link>
        </div>
        <div className="details-empty-state">
          <EmptyState title="No AI review has been run for this application." message="" />
        </div>
      </section>

      <section className="panel details-section" aria-labelledby="timeline-heading">
        <div className="details-section-heading">
          <div>
            <h3 id="timeline-heading">Activity timeline</h3>
            <p>Application workflow events</p>
          </div>
        </div>
        {events.length === 0 ? (
          <div className="details-empty-state">
            <EmptyState title="No activity recorded" message="Workflow events will appear here when available." />
          </div>
        ) : (
          <ol className="activity-list details-timeline">
            {events.map((event, index) => (
              <li className="activity-item" key={`${event.date}-${event.label}-${index}`}>
                <span className="activity-marker" aria-hidden="true" />
                <div className="activity-content"><p>{event.label}</p></div>
                <time dateTime={event.date}>{formatDate(event.date, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>
              </li>
            ))}
          </ol>
        )}
      </section>
    </section>
  );
}
