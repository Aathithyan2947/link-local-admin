import type { ReactNode } from 'react';
import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  Outlet,
  useParams,
} from '@tanstack/react-router';
import { isAuthenticated, isSuperAdmin } from '@/lib/auth';
import { AppLayout } from '@/components/layout/app-layout';
import { AdminsPage } from '@/pages/admins';
import { LoginPage } from '@/pages/login';
import { DashboardPage } from '@/pages/dashboard';
import { MastersPage } from '@/pages/masters';
import { AddressesPage } from '@/pages/addresses';
import { ServiceCategoriesPage } from '@/pages/service-categories';
import { MembersPage } from '@/pages/members';
import { MemberDetailPage } from '@/pages/member-detail';
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

// Master data + admin management are super-admin only; ops_admins land on the dashboard.
const requireSuper = () => {
  if (!isSuperAdmin()) throw redirect({ to: '/dashboard' });
};

const dashboardRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/dashboard',
  component: DashboardPage,
});

const mastersRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/masters',
  beforeLoad: requireSuper,
  component: MastersPage,
});

const addressesRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/masters/addresses',
  beforeLoad: requireSuper,
  component: AddressesPage,
});

const serviceCategoriesRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/masters/service-categories',
  beforeLoad: requireSuper,
  component: ServiceCategoriesPage,
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
  beforeLoad: requireSuper,
  component: ResourceRoute,
});

const adminsRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/admins',
  beforeLoad: requireSuper,
  component: AdminsPage,
});

const membersRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/members',
  component: MembersPage,
});

const memberDetailRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/members/$id',
  component: MemberDetailPage,
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
    serviceCategoriesRoute,
    masterResourceRoute,
    adminsRoute,
    membersRoute,
    memberDetailRoute,
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
