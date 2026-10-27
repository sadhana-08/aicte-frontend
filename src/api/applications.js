import mockApplications from '../data/mock/applications.json';
import { API_BASE_URL, delay, USE_MOCK } from './client.js';

let sessionApplications = [...mockApplications];

export async function getApplications() {
  if (USE_MOCK) {
    await delay(700);
    return sessionApplications.map((application) => ({ ...application }));
  }

  // TODO: Confirm the applications list endpoint with the backend developer.
  const response = await fetch(`${API_BASE_URL}/applications`);
  if (!response.ok) throw new Error('Applications could not be loaded. Please try again.');
  return response.json();
}

export async function getApplicationById(id) {
  if (USE_MOCK) {
    await delay(500);
    const application = sessionApplications.find((item) => item.id === id);
    if (!application) throw new Error('Application not found');
    return {
      ...application,
      documents: (application.documents ?? []).map((document) => ({ ...document })),
      events: (application.events ?? []).map((event) => ({ ...event })),
    };
  }

  // TODO: Confirm the application details endpoint with the backend developer.
  const response = await fetch(`${API_BASE_URL}/applications/${encodeURIComponent(id)}`);
  if (response.status === 404) throw new Error('Application not found');
  if (!response.ok) throw new Error('Application details could not be loaded. Please try again.');
  return response.json();
}

export async function createApplication(formData) {
  if (USE_MOCK) {
    await delay(500);
    const createdAt = new Date().toISOString();
    const documents = (formData.documents ?? []).map((document) => ({ ...document }));
    const events = [
      { date: createdAt, label: 'Application created' },
      ...(documents.length ? [{ date: createdAt, label: 'Documents uploaded' }] : []),
      { date: createdAt, label: `Status changed to ${formData.status}` },
    ];
    const application = {
      ...formData,
      submittedAt: formData.status === 'Draft' ? null : createdAt.slice(0, 10),
      documents,
      documentCount: documents.length,
      events,
    };
    sessionApplications = [application, ...sessionApplications];
    return { ...application };
  }

  // TODO: Confirm the application creation endpoint and payload with the backend developer.
  const response = await fetch(`${API_BASE_URL}/applications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });
  if (!response.ok) throw new Error('The application could not be saved. Please try again.');
  return response.json();
}

export async function uploadDocument(applicationId, file) {
  if (USE_MOCK) {
    await delay(850);
    return {
      applicationId,
      fileName: file.name,
      size: file.size,
      status: 'Uploaded',
    };
  }

  // TODO: Confirm the document upload endpoint and multipart field with the backend developer.
  const payload = new FormData();
  payload.append('file', file);
  const response = await fetch(`${API_BASE_URL}/applications/${applicationId}/documents`, {
    method: 'POST',
    body: payload,
  });
  if (!response.ok) throw new Error('The document could not be uploaded. Please try again.');
  return response.json();
}
