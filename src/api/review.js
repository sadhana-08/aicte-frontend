import reviewSample from '../data/mock/reviewSample.json';
import { API_BASE_URL, delay, ENDPOINTS, REQUEST_TIMEOUT_MS, USE_MOCK } from './client.js';

/**
 * @typedef {Object} ReviewResult
 * @property {string} applicationId
 * @property {string} documentName
 * @property {string} reviewedAt
 * @property {boolean} isSample
 * @property {{ needsReview: number, potentialMatch: number, insufficientEvidence: number }} summary
 * @property {{ name: string, value: string, page: number|string }[]} extractedFields
 * @property {{ id: string, title: string, page: number|string, excerpt: string, relevance: string|number }[]} references
 * @property {{ id: string, status: string, explanation: string, referenceId: string, page: number|string, evidence: string }[]} findings
 * @property {string} report
 */

const findingStatuses = new Set(['Needs review', 'Potential match', 'Insufficient evidence']);

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function firstArray(...values) {
  return values.find(Array.isArray) ?? [];
}

function stringValue(value) {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

function pageValue(item) {
  return item.page ?? item.page_number ?? item.pageNumber ?? '';
}

function normalizeFindingStatus(value) {
  const normalized = stringValue(value).trim().toLocaleLowerCase().replaceAll('_', ' ');
  if (normalized === 'needs review') return 'Needs review';
  if (normalized === 'potential match') return 'Potential match';
  if (normalized === 'insufficient evidence') return 'Insufficient evidence';
  return '';
}

function countValue(source, keys, findings, status) {
  for (const key of keys) {
    const value = source[key];
    if ((typeof value === 'number' || typeof value === 'string') && value !== '' && Number.isFinite(Number(value))) {
      return Math.max(0, Number(value));
    }
  }
  return findings.filter((finding) => finding.status === status).length;
}

/**
 * Convert the currently unconfirmed backend response into the page shape.
 * Update the aliases here once the backend response JSON is confirmed.
 * @param {unknown} raw
 * @param {{ applicationId?: string|number, documentName?: string }} context
 * @returns {ReviewResult}
 */
export function normalizeReviewResponse(raw, context = {}) {
  const response = isRecord(raw) ? raw : {};
  const payload = isRecord(response.result)
    ? response.result
    : isRecord(response.data)
      ? response.data
      : response;
  const findingsSource = firstArray(payload.findings, payload.issues, payload.review_findings);
  const referencesSource = firstArray(payload.references, payload.passages, payload.sources, payload.handbook_references, payload.handbookReferences);
  const fieldsSource = payload.extractedFields ?? payload.extracted_fields ?? payload.fields ?? [];
  const summarySource = isRecord(payload.summary)
    ? payload.summary
    : isRecord(payload.counts)
      ? payload.counts
      : isRecord(payload.finding_counts)
        ? payload.finding_counts
      : {};

  const findings = findingsSource.map((item, index) => {
    const finding = isRecord(item) ? item : {};
    return {
      id: stringValue(finding.id ?? finding.finding_id),
      status: normalizeFindingStatus(finding.status ?? finding.category ?? finding.type),
      explanation: stringValue(finding.explanation ?? finding.description ?? finding.message),
      referenceId: stringValue(finding.referenceId ?? finding.reference_id ?? finding.source_id),
      page: pageValue(finding),
      evidence: stringValue(finding.evidence ?? finding.evidence_excerpt ?? finding.excerpt),
      _sourceIndex: index,
    };
  }).filter((finding) => finding.status).map(({ _sourceIndex, ...finding }) => finding);

  const references = referencesSource.map((item) => {
    const reference = isRecord(item) ? item : { title: stringValue(item) };
    const relevance = reference.relevance ?? reference.score ?? reference.similarity ?? '';
    return {
      id: stringValue(reference.id ?? reference.reference_id ?? reference.source_id),
      title: stringValue(reference.title ?? reference.clause_title ?? reference.section_title ?? reference.section),
      page: pageValue(reference),
      excerpt: stringValue(reference.excerpt ?? reference.text ?? reference.content),
      relevance: typeof relevance === 'number' ? relevance : stringValue(relevance),
    };
  });

  const extractedFields = Array.isArray(fieldsSource)
    ? fieldsSource.map((item) => {
      const field = isRecord(item) ? item : {};
      return {
        name: stringValue(field.name ?? field.field ?? field.field_name ?? field.key),
        value: stringValue(field.value ?? field.extracted_value ?? field.extractedValue),
        page: pageValue(field),
      };
    })
    : isRecord(fieldsSource)
      ? Object.entries(fieldsSource).map(([name, value]) => ({
        name,
        value: stringValue(isRecord(value) ? value.value : value),
        page: isRecord(value) ? pageValue(value) : '',
      }))
      : [];

  return {
    applicationId: stringValue(payload.applicationId ?? payload.application_id ?? context.applicationId),
    documentName: stringValue(payload.documentName ?? payload.document_name ?? context.documentName),
    reviewedAt: stringValue(payload.reviewedAt ?? payload.reviewed_at ?? payload.timestamp),
    isSample: payload.isSample === true || payload.is_sample === true,
    summary: {
      needsReview: countValue(summarySource, ['needsReview', 'needs_review', 'needs_review_count'], findings, 'Needs review'),
      potentialMatch: countValue(summarySource, ['potentialMatch', 'potential_match', 'potential_match_count'], findings, 'Potential match'),
      insufficientEvidence: countValue(summarySource, ['insufficientEvidence', 'insufficient_evidence', 'insufficient_evidence_count'], findings, 'Insufficient evidence'),
    },
    extractedFields,
    references,
    findings,
    report: stringValue(payload.report ?? payload.review_report ?? payload.narrative),
  };
}

function makeAbortError() {
  const error = new Error('Review cancelled.');
  error.name = 'AbortError';
  return error;
}

function waitForMockReview(signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(makeAbortError());
      return;
    }
    const timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', handleAbort);
      resolve();
    }, 650);
    function handleAbort() {
      window.clearTimeout(timer);
      signal.removeEventListener('abort', handleAbort);
      reject(makeAbortError());
    }
    signal?.addEventListener('abort', handleAbort, { once: true });
  });
}

function makeReviewError(message, code, statusCode, rawResponse) {
  const error = new Error(message);
  error.code = code;
  if (statusCode !== undefined) error.statusCode = statusCode;
  if (rawResponse !== undefined) error.rawResponse = rawResponse;
  return error;
}

function httpErrorMessage(status, detail) {
  const descriptions = {
    404: 'Application or document not found.',
    422: 'Invalid request.',
    500: 'Server error. The AI service may have failed.',
  };
  const description = descriptions[status] ?? 'The backend returned an error.';
  return `HTTP ${status}: ${description}${detail ? ` ${detail}` : ''}`;
}

/**
 * @param {string|number} applicationId
 * @param {string|number} documentId
 * @param {{ signal?: AbortSignal, applicationName?: string, documentName?: string }} options
 */
export async function runReview(applicationId, documentId, options = {}) {
  if (USE_MOCK) {
    await waitForMockReview(options.signal);
    return {
      ...normalizeReviewResponse({}, {
        applicationId,
        documentName: options.documentName,
      }),
      rawResponse: null,
      isAvailable: false,
    };
  }

  const controller = new AbortController();
  let timedOut = false;
  const timeout = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  const forwardAbort = () => controller.abort();
  if (options.signal?.aborted) forwardAbort();
  else options.signal?.addEventListener('abort', forwardAbort, { once: true });

  try {
    const url = `${API_BASE_URL}${ENDPOINTS.ragReview(applicationId, documentId)}`;
    const response = await fetch(url, {
      method: 'POST',
      // Add a request body or headers here only after the backend contract is confirmed.
      signal: controller.signal,
    });
    const responseText = await response.text();
    let raw;
    try {
      raw = JSON.parse(responseText);
    } catch {
      if (response.ok) {
        throw makeReviewError('The backend response could not be read.', 'UNREADABLE_RESPONSE');
      }
    }

    if (!response.ok) {
      const detailValue = isRecord(raw) ? raw.detail : '';
      const detail = typeof detailValue === 'string' ? detailValue : detailValue === undefined ? '' : JSON.stringify(detailValue);
      throw makeReviewError(httpErrorMessage(response.status, detail), 'HTTP_ERROR', response.status, raw);
    }

    const result = normalizeReviewResponse(raw, {
      applicationId,
      documentName: options.documentName,
    });
    return { ...result, rawResponse: raw, isAvailable: true };
  } catch (error) {
    if (timedOut) throw makeReviewError('The review took too long.', 'TIMEOUT');
    if (options.signal?.aborted) throw makeAbortError();
    if (error.code) throw error;
    if (error instanceof TypeError) {
      throw makeReviewError('Cannot reach the backend. Check that it is running and that CORS allows this origin.', 'NETWORK');
    }
    throw makeReviewError('The backend response could not be read.', 'UNREADABLE_RESPONSE');
  } finally {
    window.clearTimeout(timeout);
    options.signal?.removeEventListener('abort', forwardAbort);
  }
}

export async function getSampleReview() {
  await delay(100);
  return {
    ...reviewSample,
    summary: { ...reviewSample.summary },
    extractedFields: reviewSample.extractedFields.map((field) => ({ ...field })),
    references: reviewSample.references.map((reference) => ({ ...reference })),
    findings: reviewSample.findings.map((finding) => ({ ...finding })),
  };
}
