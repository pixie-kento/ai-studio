import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../stores/authStore.js';
import useWorkspaceStore from '../stores/workspaceStore.js';

// Layouts
import { AppShell } from '../components/layout/AppShell.jsx';
import { PublicLayout } from '../components/layout/PublicLayout.jsx';
import { KidLayout } from '../components/layout/KidLayout.jsx';

// Public pages
import Landing from '../pages/public/Landing.jsx';
import Pricing from '../pages/public/Pricing.jsx';
import Login from '../pages/public/Login.jsx';
import Register from '../pages/public/Register.jsx';
import ForgotPassword from '../pages/public/ForgotPassword.jsx';

// Onboarding
import Welcome from '../pages/onboarding/Welcome.jsx';
import CreateShow from '../pages/onboarding/CreateShow.jsx';
import CreateCharacter from '../pages/onboarding/CreateCharacter.jsx';
import SetupComplete from '../pages/onboarding/SetupComplete.jsx';

// Dashboard
import Dashboard from '../pages/dashboard/Dashboard.jsx';

// Shows
import ShowList from '../pages/shows/ShowList.jsx';
import ShowDetail from '../pages/shows/ShowDetail.jsx';
import ShowCreate from '../pages/shows/ShowCreate.jsx';
import ShowSettings from '../pages/shows/ShowSettings.jsx';

// Characters
import CharacterList from '../pages/characters/CharacterList.jsx';
import CharacterDetail from '../pages/characters/CharacterDetail.jsx';
import CharacterCreate from '../pages/characters/CharacterCreate.jsx';

// Episodes
import EpisodeList from '../pages/episodes/EpisodeList.jsx';
import EpisodeDetail from '../pages/episodes/EpisodeDetail.jsx';
import EpisodeCreate from '../pages/episodes/EpisodeCreate.jsx';

// Pipeline
import PipelineView from '../pages/pipeline/PipelineView.jsx';

// Review
import ReviewQueue from '../pages/review/ReviewQueue.jsx';
import ReviewEpisode from '../pages/review/ReviewEpisode.jsx';

// Watch
import WatchHome from '../pages/watch/WatchHome.jsx';
import WatchShow from '../pages/watch/WatchShow.jsx';
import WatchEpisode from '../pages/watch/WatchEpisode.jsx';

// Kid
import KidHome from '../pages/kid/KidHome.jsx';
import KidWatch from '../pages/kid/KidWatch.jsx';
import KidCharacters from '../pages/kid/KidCharacters.jsx';

// Billing
import Plans from '../pages/billing/Plans.jsx';
import BillingPortal from '../pages/billing/BillingPortal.jsx';

// Settings
import WorkspaceSettings from '../pages/settings/WorkspaceSettings.jsx';
import ProfileSettings from '../pages/settings/ProfileSettings.jsx';
import TeamSettings from '../pages/settings/TeamSettings.jsx';

// SuperAdmin
import SuperDashboard from '../pages/superadmin/SuperDashboard.jsx';
import WorkspaceList from '../pages/superadmin/WorkspaceList.jsx';
import RenderInfra from '../pages/superadmin/RenderInfra.jsx';
import PlatformSettings from '../pages/superadmin/PlatformSettings.jsx';

// Guards
function AuthGuard() {
  const { isAuthenticated, user } = useAuthStore.getState();
  const { activeWorkspace } = useWorkspaceStore.getState();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user?.onboarding_completed && !window.location.pathname.startsWith('/onboarding')) {
    return <Navigate to="/onboarding/welcome" replace />;
  }
  return <Outlet />;
}

function PublicGuard() {
  const { isAuthenticated } = useAuthStore.getState();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

function SuperAdminGuard() {
  const { user } = useAuthStore.getState();
  if (user?.platform_role !== 'superadmin') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

export const router = createBrowserRouter([
  // Public routes
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <Landing /> },
      { path: '/pricing', element: <Pricing /> },
    ],
  },
  // Auth routes (redirect if logged in)
  {
    element: <PublicGuard />,
    children: [
      { path: '/login', element: <Login /> },
      { path: '/register', element: <Register /> },
      { path: '/forgot-password', element: <ForgotPassword /> },
    ],
  },
  // Protected app routes
  {
    element: <AuthGuard />,
    children: [
      // Onboarding
      { path: '/onboarding/welcome', element: <Welcome /> },
      { path: '/onboarding/create-show', element: <CreateShow /> },
      { path: '/onboarding/create-character', element: <CreateCharacter /> },
      { path: '/onboarding/setup-complete', element: <SetupComplete /> },

      // App shell
      {
        element: <AppShell />,
        children: [
          { path: '/dashboard', element: <Dashboard /> },
          { path: '/shows', element: <ShowList /> },
          { path: '/shows/new', element: <ShowCreate /> },
          { path: '/shows/:showId', element: <ShowDetail /> },
          { path: '/shows/:showId/settings', element: <ShowSettings /> },
          { path: '/shows/:showId/characters', element: <CharacterList /> },
          { path: '/shows/:showId/characters/new', element: <CharacterCreate /> },
          { path: '/shows/:showId/characters/:characterId', element: <CharacterDetail /> },
          { path: '/shows/:showId/episodes', element: <EpisodeList /> },
          { path: '/shows/:showId/episodes/new', element: <EpisodeCreate /> },
          { path: '/shows/:showId/episodes/:episodeId', element: <EpisodeDetail /> },
          { path: '/episodes', element: <EpisodeList /> },
          { path: '/pipeline', element: <PipelineView /> },
          { path: '/review', element: <ReviewQueue /> },
          { path: '/review/:episodeId', element: <ReviewEpisode /> },
          { path: '/watch', element: <WatchHome /> },
          { path: '/watch/:showId', element: <WatchShow /> },
          { path: '/watch/:showId/:episodeId', element: <WatchEpisode /> },
          { path: '/billing/plans', element: <Plans /> },
          { path: '/billing/portal', element: <BillingPortal /> },
          { path: '/settings/workspace', element: <WorkspaceSettings /> },
          { path: '/settings/profile', element: <ProfileSettings /> },
          { path: '/settings/team', element: <TeamSettings /> },
          // SuperAdmin
          {
            element: <SuperAdminGuard />,
            children: [
              { path: '/superadmin', element: <SuperDashboard /> },
              { path: '/superadmin/workspaces', element: <WorkspaceList /> },
              { path: '/superadmin/render', element: <RenderInfra /> },
              { path: '/superadmin/settings', element: <PlatformSettings /> },
            ],
          },
        ],
      },
    ],
  },
  // Kid UI
  {
    element: <AuthGuard />,
    children: [
      {
        element: <KidLayout />,
        children: [
          { path: '/kid', element: <KidHome /> },
          { path: '/kid/watch', element: <KidWatch /> },
          { path: '/kid/characters', element: <KidCharacters /> },
        ],
      },
    ],
  },
  // Catch-all
  { path: '*', element: <Navigate to="/" replace /> },
]);

export default router;
