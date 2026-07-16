import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';

import Home from '@/pages/public/Home';
import MatchForm from '@/pages/public/MatchForm';
import Results from '@/pages/public/Results';
import OpportunityDetail from '@/pages/public/OpportunityDetail';

import AdminLogin from '@/pages/admin/AdminLogin';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminOpportunities from '@/pages/admin/AdminOpportunities';
import AdminOpportunityForm from '@/pages/admin/AdminOpportunityForm';
import AdminCandidates from '@/pages/admin/AdminCandidates';
import AdminCandidateDetail from '@/pages/admin/AdminCandidateDetail';

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/match" component={MatchForm} />
      <Route path="/results" component={Results} />
      <Route path="/opportunities/:id" component={OpportunityDetail} />

      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/opportunities" component={AdminOpportunities} />
      <Route path="/admin/opportunities/new" component={AdminOpportunityForm} />
      <Route path="/admin/opportunities/:id/edit" component={AdminOpportunityForm} />
      <Route path="/admin/candidates" component={AdminCandidates} />
      <Route path="/admin/candidates/:id" component={AdminCandidateDetail} />

      <Route component={NotFound} />
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
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
