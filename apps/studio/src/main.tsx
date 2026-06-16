import { AppToastProvider } from '@/lib/app-toast';
import { ApiError } from '@/lib/api-client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AppLayout } from '@/components/layout/app-layout';
import { EmailVerificationGate } from '@/components/auth/email-verification-gate';
import { ManageOrgRoute } from '@/components/auth/manage-org-route';
import { OrgGate } from '@/components/auth/org-gate';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { ThemeProvider } from '@/components/theme-provider';
import { AcceptInvitationPage } from '@/pages/accept-invitation-page';
import { AuthPage } from '@/pages/auth-page';
import { ConnectionsAddDbPage } from '@/pages/connections-add-db-page';
import { ConnectionsAddMarketplacePage } from '@/pages/connections-add-marketplace-page';
import { ConnectionsPage } from '@/pages/connections-page';
import {
  ConnectionsUploadCsvPage,
  OnboardingUploadCsvPage,
} from '@/pages/connections-upload-csv-page';
import { DashboardDetailPage, DashboardsListPage } from '@/pages/dashboards-page';
import { ForgotPasswordPage } from '@/pages/forgot-password-page';
import { HomePage } from '@/pages/home-page';
import { InsightDetailPage } from '@/pages/insight-detail-page';
import { InsightsHistoryPage } from '@/pages/insights-history-page';
import { InsightsPage } from '@/pages/insights-page';
import { InsightsSettingsPage } from '@/pages/insights-settings-page';
import { OnboardingConnectPage } from '@/pages/onboarding-connect-page';
import { OnboardingPage } from '@/pages/onboarding-page';
import { ResetPasswordPage } from '@/pages/reset-password-page';
import { SemanticCubePage } from '@/pages/semantic-cube-page';
import { SemanticListPage } from '@/pages/semantic-list-page';
import { SemanticViewPage } from '@/pages/semantic-view-page';
import { SettingsPage } from '@/pages/settings-page';
import { SettingsBillingPage } from '@/pages/settings-billing-page';
import { SettingsAuditPage } from '@/pages/settings-audit-page';
import { SettingsBillingInvoicesPage } from '@/pages/settings-billing-invoices-page';
import { SettingsEnterpriseLlmPage } from '@/pages/settings-enterprise-llm-page';
import { SettingsSsoPage } from '@/pages/settings-sso-page';
import { SettingsBillingPaymentPage } from '@/pages/settings-billing-payment-page';
import { SettingsBillingPlansPage } from '@/pages/settings-billing-plans-page';
import { SettingsCompanyPage } from '@/pages/settings-company-page';
import { SettingsPrivacyPage } from '@/pages/settings-privacy-page';
import { SettingsProfilePage } from '@/pages/settings-profile-page';
import { SettingsSecurityPage } from '@/pages/settings-security-page';
import { AccessDeniedPage } from '@/pages/access-denied-page';
import { NotFoundPage } from '@/pages/not-found-page';
import { TeamPage } from '@/pages/team-page';
import { VerifyEmailPage } from '@/pages/verify-email-page';

import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status < 500) return false;
        return failureCount < 1;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppToastProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/accept-invitation/:invitationId" element={<AcceptInvitationPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route element={<EmailVerificationGate />}>
            <Route element={<OrgGate />}>
              <Route element={<ManageOrgRoute />}>
                <Route path="/onboarding/connect" element={<OnboardingConnectPage />} />
                <Route path="/onboarding/upload-csv" element={<OnboardingUploadCsvPage />} />
              </Route>
              <Route element={<AppLayout />}>
                <Route index element={<HomePage />} />
                <Route path="insights" element={<InsightsPage />} />
                <Route path="insights/history" element={<InsightsHistoryPage />} />
                <Route element={<ManageOrgRoute />}>
                  <Route path="insights/settings" element={<InsightsSettingsPage />} />
                </Route>
                <Route path="insights/:id" element={<InsightDetailPage />} />
                <Route path="dashboards" element={<DashboardsListPage />} />
                <Route path="dashboards/:id" element={<DashboardDetailPage />} />
                <Route path="team" element={<TeamPage />} />
                <Route path="access-denied" element={<AccessDeniedPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="settings/profile" element={<SettingsProfilePage />} />
                <Route path="settings/privacy" element={<SettingsPrivacyPage />} />
                <Route path="settings/security" element={<SettingsSecurityPage />} />
                <Route element={<ManageOrgRoute />}>
                  <Route path="semantic" element={<SemanticListPage />} />
                  <Route path="semantic/cubes/:cubeName" element={<SemanticCubePage />} />
                  <Route path="semantic/views/:viewName" element={<SemanticViewPage />} />
                  <Route path="settings/company" element={<SettingsCompanyPage />} />
                  <Route path="settings/billing" element={<SettingsBillingPage />} />
                  <Route path="settings/billing/plans" element={<SettingsBillingPlansPage />} />
                  <Route path="settings/connections" element={<ConnectionsPage />} />
                  <Route path="settings/connections/upload-csv" element={<ConnectionsUploadCsvPage />} />
                  <Route
                    path="settings/connections/add-marketplace"
                    element={<ConnectionsAddMarketplacePage />}
                  />
                  <Route path="settings/connections/add-db" element={<ConnectionsAddDbPage />} />
                  <Route path="settings/billing/payment" element={<SettingsBillingPaymentPage />} />
                  <Route path="settings/billing/invoices" element={<SettingsBillingInvoicesPage />} />
                  <Route
                    path="settings/billing/upgrade"
                    element={<Navigate to="/settings/billing/plans" replace />}
                  />
                  <Route path="settings/audit" element={<SettingsAuditPage />} />
                  <Route path="settings/sso" element={<SettingsSsoPage />} />
                  <Route path="settings/enterprise/llm" element={<SettingsEnterpriseLlmPage />} />
                </Route>
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </BrowserRouter>
        </AppToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>
);
