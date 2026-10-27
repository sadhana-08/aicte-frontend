import { API_BASE_URL, delay, USE_MOCK } from './client.js';

const allowedOutcomes = new Set([
  'Completed',
  'Completed - no findings',
  'Failed',
  'Cancelled',
  'Not available (demo mode)',
]);
const USE_REVIEW_HISTORY_ENDPOINT = false;

let sessionReviewHistory = [];

export async function getReviewHistory() {
  if (USE_MOCK || !USE_REVIEW_HISTORY_ENDPOINT) {
    await delay(450);
    return sessionReviewHistory
      .map((entry) => ({ ...entry, findingsCounts: entry.findingsCounts ? { ...entry.findingsCounts } : null }))
      .sort((first, second) => new Date(second.runTime) - new Date(first.runTime));
  }

  // TODO: Confirm whether the backend provides a review history endpoint.
  const response = await fetch(`${API_BASE_URL}/review-history`);
  if (!response.ok) throw new Error('Review history could not be loaded. Please try again.');
  return response.json();
}

export async function logReviewRun(entry) {
  if (!allowedOutcomes.has(entry.outcome)) {
    throw new Error('Unsupported review outcome.');
  }

  await delay(150);
  const logEntry = {
    ...entry,
    runTime: entry.runTime ?? new Date().toISOString(),
    findingsCounts: entry.findingsCounts ? { ...entry.findingsCounts } : null,
  };
  sessionReviewHistory = [logEntry, ...sessionReviewHistory];
  return { ...logEntry, findingsCounts: logEntry.findingsCounts ? { ...logEntry.findingsCounts } : null };
}
