import { useQuery } from '@tanstack/react-query';
import { Users, Briefcase, CalendarDays, UsersRound, FileText, Clock } from 'lucide-react';
import { api, type ApiResponse } from '@/lib/api';
import { Card, Spinner } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/app-layout';

interface Dashboard {
  members: { residents: number; serviceProviders: number; total: number };
  events: number;
  groups: number;
  posts: number;
  pending: { addressDocs: number; profileVerifications: number };
}

function StatCard({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
  tint: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500">{label}</div>
          <div className="mt-1 text-3xl font-bold text-gray-900">{value}</div>
        </div>
        <div className={`rounded-xl p-3 ${tint}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </Card>
  );
}

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get<ApiResponse<Dashboard>>('/admin/dashboard')).data.data,
  });

  return (
    <div>
      <PageHeader
        breadcrumb="Admin"
        title="Dashboard"
        subtitle="Overview of your community platform"
      />
      {isLoading || !data ? (
        <Spinner />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Users}
              label="Residents"
              value={data.members.residents}
              tint="bg-brand-50 text-brand-600"
            />
            <StatCard
              icon={Briefcase}
              label="Service Providers"
              value={data.members.serviceProviders}
              tint="bg-violet-50 text-violet-600"
            />
            <StatCard
              icon={CalendarDays}
              label="Events"
              value={data.events}
              tint="bg-amber-50 text-amber-600"
            />
            <StatCard
              icon={UsersRound}
              label="Groups"
              value={data.groups}
              tint="bg-sky-50 text-sky-600"
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              icon={FileText}
              label="Total Posts"
              value={data.posts}
              tint="bg-gray-100 text-gray-600"
            />
            <StatCard
              icon={Clock}
              label="Pending Address Docs"
              value={data.pending.addressDocs}
              tint="bg-amber-50 text-amber-600"
            />
            <StatCard
              icon={Clock}
              label="Pending Verifications"
              value={data.pending.profileVerifications}
              tint="bg-red-50 text-red-600"
            />
          </div>
        </>
      )}
    </div>
  );
}
