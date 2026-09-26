import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { SubmitRequest } from './pages/SubmitRequest';
import { RequestDetail } from './pages/RequestDetail';
import { Customers } from './pages/Customers';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/submit" element={<SubmitRequest />} />
          <Route path="/requests/:id" element={<RequestDetail />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
