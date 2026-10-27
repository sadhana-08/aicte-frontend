import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ClipboardCopy, FileText, Play, Sparkles, X } from 'lucide-react';
import { getApplications } from '../api/applications.js';
import { getSampleReview, runReview } from '../api/review.js';
import { ENDPOINTS, API_BASE_URL, USE_MOCK } from '../api/client.js';
import { logReviewRun } from '../api/reviewHistory.js';
import EmptyState from '../components/ui/EmptyState.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import Loader from '../components/ui/Loader.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';

const emptySummary = { needsReview: 0, potentialMatch: 0, insufficientEvidence: 0 };

function documentKey(document) {
  return String(document.id ?? document.documentId ?? document.document_id ?? document.name ?? '');
}

function getDocumentName(document) {
  return document.name ?? document.fileName ?? document.file_name ?? document.document_name ?? 'Unnamed document';
}

function getInstitutionName(application) {
  return application.institution ?? application.institutionName ?? application.institution_name ?? '';
}

function formatDate(value) {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
}

function hasRecognizableResults(result) {
  const summaryTotal = Object.values(result.summary ?? emptySummary).reduce((total, count) => total + count, 0);
  return Boolean(
    result.report
    || result.extractedFields?.length
    || result.references?.length
    || result.findings?.length
    || summaryTotal,
  );
}

function SampleTag({ isSample }) {
  return isSample ? <span className="review-sample-tag">Sample</span> : null;
}

function SampleBanner({ onClear }) {
  return (
    <div className="review-sample-banner" role="status">
      <strong>SAMPLE DATA - illustrative only, NOT a real AI result</strong>
      <button className="secondary-button" type="button" onClick={onClear}>Clear sample</button>
    </div>
  );
}

function ResultsPanel({ result, isSample, onCopy, copyStatus }) {
  const referencesById = new Map((result.references ?? []).map((reference) => [reference.id, reference]));
  const summary = result.summary ?? emptySummary;

  return (
    <div className="ai-review-results">
      <section className="panel ai-review-section">
        <div className="ai-review-section-heading">
          <div>
            <h3>Review summary</h3>
            <p>Run time: {formatDate(result.reviewedAt)}</p>
          </div>
          <SampleTag isSample={isSample} />
        </div>
        <div className="review-summary-counts">
          <div><span>Needs review</span><strong>{summary.needsReview ?? 0}</strong></div>
          <div><span>Potential match</span><strong>{summary.potentialMatch ?? 0}</strong></div>
          <div><span>Insufficient evidence</span><strong>{summary.insufficientEvidence ?? 0}</strong></div>
        </div>
      </section>

      <section className="panel ai-review-section">
        <div className="ai-review-section-heading">
          <div>
            <h3>Extracted document information</h3>
            <p>Fields returned by the review service</p>
          </div>
          <SampleTag isSample={isSample} />
        </div>
        {!result.extractedFields?.length ? (
          <div className="ai-review-inline-empty">No extracted fields were returned.</div>
        ) : (
          <div className="table-scroll">
            <table className="applications-table ai-review-data-table">
              <thead><tr><th scope="col">Field name</th><th scope="col">Extracted value</th><th scope="col">Source page</th></tr></thead>
              <tbody>
                {result.extractedFields.map((field, index) => (
                  <tr key={`${field.name}-${index}`}>
                    <td>{field.name || '—'}</td>
                    <td className="ai-review-value-cell">{field.value || '—'}</td>
                    <td>{field.page || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel ai-review-section">
        <div className="ai-review-section-heading">
          <div>
            <h3>Relevant handbook references</h3>
            <p>References returned by the review service</p>
          </div>
          <SampleTag isSample={isSample} />
        </div>
        {!result.references?.length ? (
          <div className="ai-review-inline-empty">No handbook references were returned.</div>
        ) : (
          <div className="review-reference-grid">
            {result.references.map((reference, index) => (
              <article className="review-reference-card" key={reference.id || `${reference.title}-${index}`}>
                <div className="review-reference-heading">
                  <h4>{reference.title || '—'}</h4>
                  <span className="reference-page">Page {reference.page || '—'}</span>
                </div>
                <p>{reference.excerpt || '—'}</p>
                <div className="reference-relevance">
                  <span>Relevance</span>
                  <strong>{reference.relevance === '' ? '—' : reference.relevance}</strong>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel ai-review-section">
        <div className="ai-review-section-heading">
          <div>
            <h3>Findings</h3>
            <p>Items requiring human interpretation</p>
          </div>
          <SampleTag isSample={isSample} />
        </div>
        {!result.findings?.length ? (
          <div className="ai-review-inline-empty">No findings were returned for this run.</div>
        ) : (
          <div className="review-findings-list">
            {result.findings.map((finding, index) => {
              const reference = referencesById.get(finding.referenceId);
              return (
                <article className="review-finding" key={finding.id || `${finding.status}-${index}`}>
                  <div className="review-finding-heading">
                    <StatusBadge status={finding.status} />
                    <span>Source page {finding.page || '—'}</span>
                  </div>
                  <p>{finding.explanation || '—'}</p>
                  <dl className="review-finding-evidence">
                    <div><dt>Handbook reference</dt><dd>{reference?.title || finding.referenceId || '—'}</dd></div>
                    <div><dt>Evidence excerpt</dt><dd>{finding.evidence || '—'}</dd></div>
                  </dl>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="panel ai-review-section">
        <div className="ai-review-section-heading">
          <div>
            <h3>RAG review report</h3>
            <p>Readable report returned by the review service</p>
          </div>
          <SampleTag isSample={isSample} />
        </div>
        {result.report ? (
          <div className="review-report-block">
            <pre>{result.report}</pre>
            <div className="review-report-actions">
              <button className="secondary-button" type="button" onClick={onCopy}>
                <ClipboardCopy size={15} /> Copy report
              </button>
              {copyStatus && <span role="status">{copyStatus}</span>}
            </div>
          </div>
        ) : (
          <div className="ai-review-inline-empty">No report was returned.</div>
        )}
      </section>

    </div>
  );
}

export default function AIReview() {
  const { id: routeApplicationId } = useParams();
  const [applications, setApplications] = useState([]);
  const [isLoadingApplications, setIsLoadingApplications] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedApplicationId, setSelectedApplicationId] = useState(routeApplicationId ?? '');
  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const [runState, setRunState] = useState('idle');
  const [result, setResult] = useState(null);
  const [rawResponse, setRawResponse] = useState(null);
  const [runError, setRunError] = useState(null);
  const [requestIds, setRequestIds] = useState({ applicationId: '1', documentId: '1' });
  const [copyStatus, setCopyStatus] = useState('');
  const [historyMessage, setHistoryMessage] = useState('');
  const controllerRef = useRef(null);
  const lastRunRef = useRef(null);

  useEffect(() => {
    let isCurrent = true;
    setIsLoadingApplications(true);
    getApplications()
      .then((data) => {
        if (!isCurrent) return;
        setApplications(data);
        const initialApplication = routeApplicationId
          ? data.find((application) => String(application.id) === routeApplicationId)
          : null;
        if (initialApplication) {
          setSelectedApplicationId(String(initialApplication.id));
          const firstDocument = initialApplication.documents?.[0];
          setSelectedDocumentId(firstDocument ? documentKey(firstDocument) : '');
        } else if (!routeApplicationId) {
          setSelectedApplicationId('');
        }
      })
      .catch((error) => {
        if (isCurrent) setLoadError(error.message);
      })
      .finally(() => {
        if (isCurrent) setIsLoadingApplications(false);
      });
    return () => {
      isCurrent = false;
      controllerRef.current?.abort();
    };
  }, [routeApplicationId]);

  const selectedApplication = applications.find((application) => String(application.id) === selectedApplicationId);
  const documents = Array.isArray(selectedApplication?.documents) ? selectedApplication.documents : [];
  const selectedDocument = documents.find((document) => documentKey(document) === selectedDocumentId);
  const selectedApplicationUnavailable = Boolean(routeApplicationId && !isLoadingApplications && !loadError && !selectedApplication);
  const resultHasContent = result ? hasRecognizableResults(result) : false;
  const isSample = Boolean(result?.isSample);

  const connectionUrl = useMemo(() => {
    const applicationId = Number(requestIds.applicationId);
    const documentId = Number(requestIds.documentId);
    return Number.isInteger(applicationId) && Number.isInteger(documentId) && applicationId > 0 && documentId > 0
      ? `${API_BASE_URL}${ENDPOINTS.ragReview(applicationId, documentId)}`
      : '';
  }, [requestIds]);

  async function recordRun(outcome, runResult, context) {
    if (runResult?.isSample) return;
    const findingCounts = USE_MOCK || !runResult ? null : runResult.summary;
    try {
      await logReviewRun({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        applicationId: String(context.applicationId),
        institutionName: context.institutionName ?? '',
        documentName: context.documentName ?? '',
        runTime: runResult?.reviewedAt || new Date().toISOString(),
        outcome,
        findingsCounts: findingCounts,
      });
      setHistoryMessage('Run added to Review History.');
    } catch (error) {
      setHistoryMessage(`Run finished, but history could not be updated: ${error.message}`);
    }
  }

  async function executeReview({ applicationId, documentId, applicationName, institutionName, documentName }) {
    const controller = new AbortController();
    controllerRef.current = controller;
    lastRunRef.current = { applicationId, documentId, applicationName, institutionName, documentName };
    setRunState('loading');
    setRunError(null);
    setResult(null);
    setRawResponse(null);
    setCopyStatus('');
    setHistoryMessage('');

    try {
      const response = await runReview(applicationId, documentId, {
        signal: controller.signal,
        applicationName,
        documentName,
      });
      if (controller.signal.aborted) return;
      const { rawResponse: raw, isAvailable, ...normalizedResult } = response;
      setResult(normalizedResult);
      setRawResponse(raw ?? null);
      setRunState('success');
      const outcome = USE_MOCK
        ? 'Not available (demo mode)'
        : normalizedResult.findings.length
          ? 'Completed'
          : 'Completed - no findings';
      await recordRun(outcome, USE_MOCK ? null : normalizedResult, {
        applicationId: normalizedResult.applicationId || applicationId,
        institutionName,
        documentName: normalizedResult.documentName || documentName,
      });
      if (!isAvailable) setHistoryMessage('Demo mode run recorded; no AI result was generated.');
    } catch (error) {
      if (error.name === 'AbortError') {
        setRunState('cancelled');
        await recordRun('Cancelled', null, { applicationId, institutionName, documentName });
        return;
            }
            setRunState('error');
      setRunError(error);
      setRawResponse(error.rawResponse ?? null);
      await recordRun('Failed', null, { applicationId, institutionName, documentName });
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }

  function runSelectedReview() {
    if (!selectedApplication || !selectedDocument) return;
    if (!USE_MOCK && (!/^\d+$/.test(String(selectedApplication.id)) || !/^\d+$/.test(String(selectedDocument.id ?? selectedDocument.documentId ?? selectedDocument.document_id ?? '')))) {
      setRunState('error');
      setRunError(new Error('Select application and document records with numeric backend IDs, or use the connection test panel.'));
      return;
    }
    void executeReview({
      applicationId: selectedApplication.id,
      documentId: selectedDocument.id ?? selectedDocument.documentId ?? selectedDocument.document_id ?? selectedDocument.name,
      applicationName: getInstitutionName(selectedApplication),
      institutionName: getInstitutionName(selectedApplication),
      documentName: getDocumentName(selectedDocument),
    });
  }

  function runConnectionTest() {
    if (!connectionUrl) return;
    void executeReview({
      applicationId: Number(requestIds.applicationId),
      documentId: Number(requestIds.documentId),
      applicationName: `Application ${requestIds.applicationId}`,
      institutionName: selectedApplication ? getInstitutionName(selectedApplication) : '',
      documentName: selectedDocument ? getDocumentName(selectedDocument) : '',
    });
  }

  async function previewSample() {
    controllerRef.current?.abort();
    setRunState('idle');
    setRunError(null);
    setRawResponse(null);
    setHistoryMessage('');
    setResult(await getSampleReview());
    setRunState('success');
  }

  function clearSample() {
    setResult(null);
    setRunState('idle');
    setCopyStatus('');
  }

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(result.report);
      setCopyStatus('Report copied.');
    } catch {
      setCopyStatus('Clipboard access is unavailable in this browser.');
    }
  }

  function cancelReview() {
    controllerRef.current?.abort();
  }

  if (isLoadingApplications) return <Loader label="Loading applications" />;
  if (loadError) {
    return <ErrorState title="Applications unavailable" message={loadError} onRetry={() => window.location.reload()} />;
  }
  if (selectedApplicationUnavailable) {
    return <EmptyState title="Application not found" message="The selected application is not available in this workspace." />;
  }

  const selectableDocuments = documents.map((document) => ({
    key: documentKey(document),
    label: getDocumentName(document),
  }));

  return (
    <section className="ai-review-page">
      <div className="page-section-heading ai-review-page-heading">
        <div>
          <p className="eyebrow">AI REVIEW</p>
          <h2>AI Review</h2>
          <p>Review an application document against the AICTE Approval Process Handbook.</p>
        </div>
        <button className="secondary-button sample-preview-button" type="button" disabled={runState === 'loading'} onClick={previewSample}>
          Preview layout with sample data
        </button>
      </div>

      {result?.isSample && <SampleBanner onClear={clearSample} />}

      <section className="panel ai-review-selector" aria-label="Select review document">
        <label className="form-field">
          <span className="field-label">Application</span>
          <select
            value={selectedApplicationId}
            onChange={(event) => {
              const application = applications.find((item) => String(item.id) === event.target.value);
              setSelectedApplicationId(event.target.value);
              const firstDocument = application?.documents?.[0];
              setSelectedDocumentId(firstDocument ? documentKey(firstDocument) : '');
              setResult(null);
              setRunState('idle');
              setHistoryMessage('');
            }}
            disabled={Boolean(result?.isSample) || runState === 'loading'}
          >
            <option value="">Select an application</option>
            {applications.map((application) => (
              <option key={application.id} value={application.id}>{application.id} - {getInstitutionName(application)}</option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span className="field-label">Document</span>
          <select
            value={selectedDocumentId}
            onChange={(event) => {
              setSelectedDocumentId(event.target.value);
              setResult(null);
              setRunState('idle');
              setHistoryMessage('');
            }}
            disabled={!selectedApplication || Boolean(result?.isSample) || runState === 'loading'}
          >
            <option value="">Select a document</option>
            {selectableDocuments.map((document) => <option key={document.key} value={document.key}>{document.label}</option>)}
          </select>
        </label>
        {runState === 'loading' ? (
          <div className="ai-review-run-loading" role="status" aria-live="polite">
            <span className="loading-mark" />
            <span>Reviewing document, this can take up to a minute</span>
            <button className="secondary-button" type="button" onClick={cancelReview}><X size={14} /> Cancel</button>
          </div>
        ) : (
          <button className="primary-button ai-review-run-button" type="button" disabled={!selectedApplication || !selectedDocument || Boolean(result?.isSample)} onClick={runSelectedReview}>
            <Play size={15} /> Run AI Review
          </button>
        )}
        {selectedApplication && documents.length === 0 && <p className="ai-review-selector-note">This application has no documents available to review.</p>}
      </section>

      {!USE_MOCK && (
        <section className="panel ai-connection-panel" aria-labelledby="connection-test-heading">
          <div className="ai-review-section-heading">
            <div><h3 id="connection-test-heading">Connection test</h3><p>Use numeric backend identifiers for a direct request.</p></div>
          </div>
          <div className="connection-test-controls">
            <label className="form-field" htmlFor="test-application-id"><span className="field-label">Application ID</span><input id="test-application-id" type="number" min="1" value={requestIds.applicationId} onChange={(event) => setRequestIds((current) => ({ ...current, applicationId: event.target.value }))} /></label>
            <label className="form-field" htmlFor="test-document-id"><span className="field-label">Document ID</span><input id="test-document-id" type="number" min="1" value={requestIds.documentId} onChange={(event) => setRequestIds((current) => ({ ...current, documentId: event.target.value }))} /></label>
            <button className="primary-button" type="button" disabled={!connectionUrl || runState === 'loading'} onClick={runConnectionTest}><Play size={15} /> Run</button>
            <label className="connection-url-field"><span>Request URL</span><input type="text" readOnly value={connectionUrl} /></label>
          </div>
          {rawResponse !== null && (
            <details className="raw-response-details">
              <summary>Show raw response (debug)</summary>
              <pre>{JSON.stringify(rawResponse, null, 2)}</pre>
            </details>
          )}
        </section>
      )}

      {runState === 'error' && (
        <ErrorState
          title="Review could not be completed"
          message={runError?.message ?? 'The review could not be completed.'}
          onRetry={() => lastRunRef.current && void executeReview(lastRunRef.current)}
        />
      )}
      {runState === 'cancelled' && <div className="review-cancelled-message" role="status">Review cancelled.</div>}
      {historyMessage && <p className="review-history-feedback" role="status">{historyMessage}</p>}

      {runState === 'success' && !result?.isSample && result && !resultHasContent && (
        <EmptyState
          title={result.isAvailable ? 'No recognizable review data was returned.' : 'Review unavailable in demo mode.'}
          message={result.isAvailable ? 'The response did not contain review fields the page can display.' : 'No AI result was generated. Connect the backend to run a review.'}
        />
      )}
      {runState === 'success' && result?.isSample && <ResultsPanel result={result} isSample onCopy={copyReport} copyStatus={copyStatus} />}
      {runState === 'success' && result && !result.isSample && resultHasContent && (
        <ResultsPanel result={result} isSample={false} onCopy={copyReport} copyStatus={copyStatus} />
      )}

      {runState !== 'success' && (
        <div className="ai-review-guidance">
          <FileText size={17} />
          <span>Select an application and document to begin. Results appear here after a run.</span>
        </div>
      )}
      {routeApplicationId && selectedApplication && (
        <Link className="ai-review-back-link" to={`/applications/${selectedApplication.id}`}><Sparkles size={14} /> Back to application</Link>
      )}
      <div className="demo-notice ai-review-human-notice" role="note">
        <span className="demo-notice-mark">i</span>
        <p>AI-assisted findings require human verification. This tool does not make approval decisions.</p>
      </div>
    </section>
  );
}
