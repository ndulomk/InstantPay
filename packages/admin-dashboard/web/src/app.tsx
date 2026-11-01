import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/app-shell';
import { DashboardPage } from '@/modules/overview/pages/dashboard-page';
import { ServicesListPage } from '@/modules/services/pages/services-list-page';
import { ServiceDetailPage } from '@/modules/services/pages/service-detail-page';
import { ServiceFormPage } from '@/modules/services/pages/service-form-page';

export const App = () => (
  <BrowserRouter>
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="services" element={<ServicesListPage />} />
        <Route path="services/new" element={<ServiceFormPage />} />
        <Route path="services/:id" element={<ServiceDetailPage />} />
        <Route path="services/:id/edit" element={<ServiceFormPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  </BrowserRouter>
);
