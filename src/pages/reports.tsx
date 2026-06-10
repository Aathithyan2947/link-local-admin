import { useQuery } from '@tanstack/react-query';
import { api, type ApiResponse } from '@/lib/api';
import { PageHeader } from '@/components/layout/app-layout';
import { Card, Spinner } from '@/components/ui/card';

interface Reports {
  membersByCity: { city: string; members: number }[];
  membersByType: { userType: string; count: number }[];
  topServiceCategories: { name: string; providers: number }[];
  totalAddresses: number;
}

function Bars({ data, color = 'bg-brand-500' }: { data: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.label}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-gray-600">{d.label}</span>
            <span className="font-semibold text-gray-900">{d.value}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
            <div className={`h-full rounded-full ${color}`} style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ReportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: async () => (await api.get<ApiResponse<Reports>>('/admin/reports')).data.data,
  });

  return (
    <div>
      <PageHeader breadcrumb="Admin" title="Reports" subtitle="Platform analytics" />
      {isLoading || !data ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="p-6">
            <h3 className="mb-4 font-semibold text-gray-900">Members by type</h3>
            <Bars
              data={data.membersByType.map((d) => ({
                label: d.userType === 'service_provider' ? 'Service Providers' : d.userType === 'resident' ? 'Residents' : d.userType,
                value: d.count,
              }))}
            />
          </Card>
          <Card className="p-6">
            <h3 className="mb-4 font-semibold text-gray-900">Members by city</h3>
            <Bars data={data.membersByCity.map((d) => ({ label: d.city, value: d.members }))} color="bg-violet-500" />
          </Card>
          <Card className="p-6 lg:col-span-2">
            <h3 className="mb-4 font-semibold text-gray-900">Top service categories</h3>
            <Bars
              data={data.topServiceCategories.map((d) => ({ label: d.name, value: d.providers }))}
              color="bg-amber-500"
            />
          </Card>
        </div>
      )}
    </div>
  );
}
