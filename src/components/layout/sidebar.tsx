import { Link, useRouterState } from '@tanstack/react-router';
import {
  LayoutDashboard,
  SlidersHorizontal,
  Users,
  Briefcase,
  CalendarDays,
  UsersRound,
  BarChart3,
  ScrollText,
  MapPin,
  ShieldCheck,
  BadgePlus,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
}

const mainNav: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Masters & Controls', to: '/masters', icon: SlidersHorizontal },
  { label: 'Address Capture', to: '/masters/addresses', icon: MapPin },
  { label: 'Members', to: '/members', icon: Users },
  { label: 'Verifications', to: '/verifications', icon: ShieldCheck },
  { label: 'Service Approvals', to: '/service-approvals', icon: BadgePlus },
  { label: 'New Members', to: '/new-members', icon: Sparkles },
  { label: 'Service Providers', to: '/service-providers', icon: Briefcase },
  { label: 'Events', to: '/events', icon: CalendarDays },
  { label: 'Groups', to: '/groups', icon: UsersRound },
  { label: 'Reports', to: '/reports', icon: BarChart3 },
  { label: 'Activity Logs', to: '/activity-logs', icon: ScrollText },
];

export function Sidebar() {
  const { location } = useRouterState();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gray-100 bg-white">
      <div className="flex items-center gap-2 px-6 py-5">
        <div className="rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 p-2">
          <MapPin className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-bold">
          <span className="text-brand-600">Link</span>Local
        </span>
      </div>

      <div className="px-4 pb-2 pt-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
        Main
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {mainNav.map((item) => {
          const active =
            item.to === '/masters'
              ? location.pathname === '/masters'
              : location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              )}
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-100 px-6 py-4 text-xs text-gray-400">
        © 2026 LinkLocal. All rights reserved.
      </div>
    </aside>
  );
}
