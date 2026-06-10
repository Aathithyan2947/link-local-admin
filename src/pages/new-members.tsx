import { useQuery } from '@tanstack/react-query';
import { api, type ApiResponse } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/layout/app-layout';
import { Card, Spinner, Badge } from '@/components/ui/card';

interface NewMember {
  id: number;
  name: string;
  photoUrl: string | null;
  aboutMe: string | null;
  userType: string;
  area: string | null;
  city: string | null;
  joinedAt: string;
}

export function NewMembersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['new-members'],
    queryFn: async () => (await api.get<ApiResponse<NewMember[]>>('/admin/new-members')).data.data,
  });

  return (
    <div>
      <PageHeader
        breadcrumb="Admin"
        title="New Members"
        subtitle="Recently joined members showcased to the community"
      />
      {isLoading ? (
        <Spinner />
      ) : !data?.length ? (
        <Card className="py-16 text-center text-gray-400">No new members in the last 30 days</Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((m) => (
            <Card key={m.id} className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-lg font-bold text-brand-600">
                  {m.photoUrl ? (
                    <img src={m.photoUrl} alt={m.name} className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    m.name.slice(0, 1).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-semibold text-gray-900">{m.name}</div>
                  <div className="text-xs text-gray-400">
                    {[m.area, m.city].filter(Boolean).join(', ') || '—'}
                  </div>
                </div>
              </div>
              {m.aboutMe && <p className="mt-3 line-clamp-2 text-sm text-gray-500">{m.aboutMe}</p>}
              <div className="mt-3 flex items-center justify-between">
                <Badge tone={m.userType === 'service_provider' ? 'success' : 'neutral'}>
                  {m.userType === 'service_provider' ? 'Service Provider' : 'Resident'}
                </Badge>
                <span className="text-xs text-gray-400">Joined {formatDate(m.joinedAt)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
