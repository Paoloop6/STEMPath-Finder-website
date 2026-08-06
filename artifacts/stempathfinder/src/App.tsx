import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Analytics } from '@vercel/analytics/react';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { PublicLayout } from '@/components/layout/PublicLayout';

import Home from '@/pages/public/Home';
import FindMatches from '@/pages/public/FindMatches';
import DatabasePage from '@/pages/public/DatabasePage';
import HowItWorksPage from '@/pages/public/HowItWorksPage';
import DifferencePage from '@/pages/public/DifferencePage';
import Documentation from '@/pages/public/Documentation';
import MatchForm from '@/pages/public/MatchForm';
import Results from '@/pages/public/Results';
import OpportunityDetail from '@/pages/public/OpportunityDetail';
import StudentPathways from '@/pages/public/StudentPathways';
import BrowsePageView from '@/pages/public/BrowsePage';
import GuidePage, { GuidesIndex } from '@/pages/public/GuidePage';
import { BROWSE_PAGES } from '@/lib/browse-pages';

import AdminLogin from '@/pages/admin/AdminLogin';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminOpportunities from '@/pages/admin/AdminOpportunities';
import AdminOpportunityForm from '@/pages/admin/AdminOpportunityForm';
import AdminCandidates from '@/pages/admin/AdminCandidates';
import AdminCandidateDetail from '@/pages/admin/AdminCandidateDetail';
import AdminPathways from '@/pages/admin/AdminPathways';

const queryClient = new QueryClient();

/** Public pages share one persistent shell (background + liquid-glass top bar);
 * only the inner content is keyed by location, so it replays the page-enter
 * transition on every navigation without resetting the flow-field canvas. */
function PublicShell() {
  const [location] = useLocation();
  return (
    <PublicLayout>
      <div key={location} className="page-enter">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/find" component={FindMatches} />
          <Route path="/database" component={DatabasePage} />
          <Route path="/student-pathways" component={StudentPathways} />
          <Route path="/how" component={HowItWorksPage} />
          <Route path="/different" component={DifferencePage} />
          <Route path="/docs" component={Documentation} />
          {/* Indexable category, location, and grade pages (config-driven). */}
          {BROWSE_PAGES.map((page) => (
            <Route key={page.path} path={page.path}>
              <BrowsePageView path={page.path} />
            </Route>
          ))}
          <Route path="/guides" component={GuidesIndex} />
          <Route path="/guides/:slug" component={GuidePage} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </PublicLayout>
  );
}

function Router() {
  return (
    <Switch>
      {/* Legacy public pages with their own layouts */}
      <Route path="/match" component={MatchForm} />
      <Route path="/results" component={Results} />
      <Route path="/opportunities/:id" component={OpportunityDetail} />

      {/* Admin — separate layout, no public shell */}
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/opportunities" component={AdminOpportunities} />
      <Route path="/admin/opportunities/new" component={AdminOpportunityForm} />
      <Route path="/admin/opportunities/:id/edit" component={AdminOpportunityForm} />
      <Route path="/admin/candidates" component={AdminCandidates} />
      <Route path="/admin/candidates/:id" component={AdminCandidateDetail} />
      <Route path="/admin/pathways" component={AdminPathways} />

      {/* Everything else → shared public shell with page transitions */}
      <Route component={PublicShell} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
        <Analytics />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
