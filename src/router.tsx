import type { ReactNode } from 'react';
import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  Outlet,
  useParams,
} from '@tanstack/react-router';
import { isAuthenticated } from '@/lib/auth';
import { AppLayout } from '@/components/layout/app-layout';
import { LoginPage } from '@/pages/login';
import { DashboardPage } from '@/pages/dashboard';
import { MastersPage } from '@/pages/masters';
import { AddressesPage } from '@/pages/addresses';
import { MembersPage } from '@/pages/members';
import { MasterCrudPage } from '@/pages/master-crud';
import { masterConfigs } from '@/pages/master-configs';
import { PlaceholderPage } from '@/pages/placeholder';
import { VerificationsPage } from '@/pages/verifications';
import { PendingServicesPage } from '@/pages/pending-services';
import { NewMembersPage } from '@/pages/new-members';
import { ReportsPage } from '@/pages/reports';
import { EventsPage, GroupsPage, ActivityLogsPage } from '@/pages/events-groups';

const rootRoute = createRootRoute({ component: () => <Outlet /> });

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});

const authLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'authenticated',
  beforeLoad: () => {
    if (!isAuthenticated()) throw redirect({ to: '/login' });
  },
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/dashboard' });
  },
});

const dashboardRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/dashboard',
  component: DashboardPage,
});

const mastersRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/masters',
  component: MastersPage,
});

const addressesRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/masters/addresses',
  component: AddressesPage,
});

function ResourceRoute() {
  const { resource } = useParams({ strict: false }) as { resource: string };
  const config = masterConfigs[resource];
  if (!config) return <PlaceholderPage title="Unknown section" />;
  return <MasterCrudPage config={config} />;
}

const masterResourceRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/masters/$resource',
  component: ResourceRoute,
});

const membersRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/members',
  component: MembersPage,
});

const placeholder = (path: string, title: string) =>
  createRoute({
    getParentRoute: () => authLayoutRoute,
    path,
    component: () => <PlaceholderPage title={title} />,
  });

const route = (path: string, component: () => ReactNode) =>
  createRoute({ getParentRoute: () => authLayoutRoute, path, component });

const verificationsRoute = route('/verifications', VerificationsPage);
const serviceApprovalsRoute = route('/service-approvals', PendingServicesPage);
const newMembersRoute = route('/new-members', NewMembersPage);
const serviceProvidersRoute = placeholder('/service-providers', 'Service Providers');
const eventsRoute = route('/events', EventsPage);
const groupsRoute = route('/groups', GroupsPage);
const reportsRoute = route('/reports', ReportsPage);
const activityLogsRoute = route('/activity-logs', ActivityLogsPage);

const routeTree = rootRoute.addChildren([
  loginRoute,
  authLayoutRoute.addChildren([
    indexRoute,
    dashboardRoute,
    mastersRoute,
    addressesRoute,
    masterResourceRoute,
    membersRoute,
    verificationsRoute,
    serviceApprovalsRoute,
    newMembersRoute,
    serviceProvidersRoute,
    eventsRoute,
    groupsRoute,
    reportsRoute,
    activityLogsRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
