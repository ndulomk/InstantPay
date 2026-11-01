import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/app-shell';
import { DashboardPage } from '@/modules/overview/pages/dashboard-page';
import { ServicesListPage } from '@/modules/services/pages/services-list-page';
import { ServiceDetailPage } from '@/modules/services/pages/service-detail-page';
import { ServiceFormPage } from '@/modules/services/pages/service-form-page';
import { IncidentsListPage } from '@/modules/incidents/pages/incidents-list-page';
import { IncidentDetailPage } from '@/modules/incidents/pages/incident-detail-page';
import { IncidentFormPage } from '@/modules/incidents/pages/incident-form-page';
import { FeatureFlagsListPage } from '@/modules/feature-flags/pages/feature-flags-list-page';
import { FeatureFlagDetailPage } from '@/modules/feature-flags/pages/feature-flag-detail-page';
import { FeatureFlagFormPage } from '@/modules/feature-flags/pages/feature-flag-form-page';
import { HealthChecksPage } from '@/modules/health-checks/pages/health-checks-page';

export const App = () => (
  <BrowserRouter>
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="services" element={<ServicesListPage />} />
        <Route path="services/new" element={<ServiceFormPage />} />
        <Route path="services/:id" element={<ServiceDetailPage />} />
        <Route path="services/:id/edit" element={<ServiceFormPage />} />
        <Route path="incidents" element={<IncidentsListPage />} />
        <Route path="incidents/new" element={<IncidentFormPage />} />
        <Route path="incidents/:id" element={<IncidentDetailPage />} />
        <Route path="incidents/:id/edit" element={<IncidentFormPage />} />
        <Route path="feature-flags" element={<FeatureFlagsListPage />} />
        <Route path="feature-flags/new" element={<FeatureFlagFormPage />} />
        <Route path="feature-flags/:id" element={<FeatureFlagDetailPage />} />
        <Route path="feature-flags/:id/edit" element={<FeatureFlagFormPage />} />
        <Route path="health-checks" element={<HealthChecksPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  </BrowserRouter>
);
