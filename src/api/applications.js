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

export async function createApplication(formData) {
  if (USE_MOCK) {
    await delay(500);
    const application = {
      ...formData,
      submittedAt: new Date().toISOString().slice(0, 10),
      documentCount: formData.documentCount ?? 0,
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
