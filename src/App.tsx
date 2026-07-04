import React from 'react';
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { DefaultProviders } from "./components/providers/default.tsx";
import AuthCallback from "./pages/auth/Callback.tsx";
import AppLayout from "./components/layout/AppLayout.tsx";
import Dashboard from "./pages/dashboard/page.tsx";
import StartupsPage from "./pages/startups/page.tsx";
import InvestorsPage from "./pages/investors/page.tsx";
import MatchesPage from "./pages/matches/page.tsx";
import InvitationsPage from "./pages/invitations/page.tsx";
import OnboardingPage from "./pages/onboarding/page.tsx";
import NotFound from "./pages/NotFound.tsx";
import TeamPage from "./pages/team/page.tsx";
import AdminProfilesPage from "./pages/profiles/page.tsx";
import StartupsDiscoveryPage from "./pages/discover/startups/page.tsx";
import InvestorsDiscoveryPage from "./pages/discover/investors/page.tsx";
import ConnectionsPage from "./pages/connections/page.tsx";
import AdminPartnersPage from "./pages/partners/page.tsx";
import PartnerPage from "./pages/partner/page.tsx";
import SignIn from "./components/ui/signin.tsx";

export default function App() {
  return (
    <DefaultProviders>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<SignIn />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/partner" element={<PartnerPage />} />
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/startups" element={<StartupsPage />} />
            <Route path="/investors" element={<InvestorsPage />} />
            <Route path="/matches" element={<MatchesPage />} />
            <Route path="/invitations" element={<InvitationsPage />} />
            <Route path="/team" element={<TeamPage />} />
            <Route path="/profiles" element={<AdminProfilesPage />} />
            <Route path="/discover/startups" element={<StartupsDiscoveryPage />} />
            <Route path="/discover/investors" element={<InvestorsDiscoveryPage />} />
            <Route path="/connections" element={<ConnectionsPage />} />
            <Route path="/partners" element={<AdminPartnersPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </DefaultProviders>
  );
}
