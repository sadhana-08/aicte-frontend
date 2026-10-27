export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
export const USE_MOCK = true;
export const REQUEST_TIMEOUT_MS = 90000;
export const ENDPOINTS = {
  ragReview: (applicationId, documentId) => `/applications/${applicationId}/documents/${documentId}/rag-review`,
};

export const delay = (duration = 800) =>
  new Promise((resolve) => window.setTimeout(resolve, duration));
