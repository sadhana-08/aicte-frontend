import mockDashboard from '../data/mock/dashboard.json';
import { API_BASE_URL, delay, USE_MOCK } from './client.js';

export async function getDashboardData() {
  if (USE_MOCK) {
    await delay(950);
    return mockDashboard;
  }

  const response = await fetch(`${API_BASE_URL}/dashboard`);
  if (!response.ok) {
    throw new Error('Dashboard data could not be loaded. Please try again.');
  }

  return response.json();
}
