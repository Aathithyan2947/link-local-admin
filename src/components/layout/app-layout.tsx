import type { ReactNode } from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Sidebar } from './sidebar';

export function AppLayout({ children }: { children: ReactNode }) {
  const { admin, logout } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-gray-100 bg-white px-6">
          <div className="text-sm text-gray-500">
            Welcome back, <span className="font-semibold text-gray-800">{admin?.name}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-600">
                {admin?.name?.slice(0, 1).toUpperCase()}
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold leading-tight">{admin?.name}</div>
                <div className="text-xs text-gray-400">{admin?.role}</div>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-red-500"
            >
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  breadcrumb,
  title,
  subtitle,
  actions,
}: {
  breadcrumb?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        {breadcrumb && <div className="mb-1 text-sm text-gray-400">{breadcrumb}</div>}
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
