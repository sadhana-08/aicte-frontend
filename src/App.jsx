import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/layout/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Applications from './pages/Applications.jsx';
import NewApplication from './pages/NewApplication.jsx';
import ApplicationDetails from './pages/ApplicationDetails.jsx';
import ReviewHistory from './pages/ReviewHistory.jsx';
import PlaceholderPage from './pages/PlaceholderPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="applications" element={<Applications />} />
        <Route path="applications/new" element={<NewApplication />} />
        <Route path="applications/:id" element={<ApplicationDetails />} />
        <Route path="ai-review" element={<PlaceholderPage title="AI Review" />} />
        <Route path="review-history" element={<ReviewHistory />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
