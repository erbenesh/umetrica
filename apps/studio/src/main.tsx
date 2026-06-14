import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AppLayout } from '@/components/layout/app-layout';
import { OrgGate } from '@/components/auth/org-gate';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { AcceptInvitationPage } from '@/pages/accept-invitation-page';
import { AuthPage } from '@/pages/auth-page';
import { DashboardDetailPage, DashboardsListPage } from '@/pages/dashboards-page';
import { ForgotPasswordPage } from '@/pages/forgot-password-page';
import { HomePage } from '@/pages/home-page';
import { InsightsPage } from '@/pages/insights-page';
import { OnboardingPage } from '@/pages/onboarding-page';
import { ResetPasswordPage } from '@/pages/reset-password-page';
import { TeamPage } from '@/pages/team-page';
import { VerifyEmailPage } from '@/pages/verify-email-page';

import './index.css';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/accept-invitation/:invitationId" element={<AcceptInvitationPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route element={<OrgGate />}>
              <Route element={<AppLayout />}>
                <Route index element={<HomePage />} />
                <Route path="insights" element={<InsightsPage />} />
                <Route path="dashboards" element={<DashboardsListPage />} />
                <Route path="dashboards/:id" element={<DashboardDetailPage />} />
                <Route path="team" element={<TeamPage />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
