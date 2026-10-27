import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/layout/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import PlaceholderPage from './pages/PlaceholderPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="applications" element={<PlaceholderPage title="Applications" />} />
        <Route path="applications/:id" element={<PlaceholderPage title="Application Details" />} />
        <Route path="new-application" element={<PlaceholderPage title="New Application" />} />
        <Route path="ai-review" element={<PlaceholderPage title="AI Review" />} />
        <Route path="review-history" element={<PlaceholderPage title="Review History" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
