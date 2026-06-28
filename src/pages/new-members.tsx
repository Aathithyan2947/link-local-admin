import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { api, assetUrl, type ApiResponse } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/layout/app-layout';
import { Card, Spinner, Badge } from '@/components/ui/card';
import { Select } from '@/components/ui/input';

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
  const [days, setDays] = useState(30);
  const { data, isLoading } = useQuery({
    queryKey: ['new-members', days],
    queryFn: async () =>
      (await api.get<ApiResponse<NewMember[]>>('/admin/new-members', { params: { days } })).data.data,
  });

  return (
    <div>
      <PageHeader
        breadcrumb="Admin"
        title="New Members"
        subtitle={`Members who joined in the last ${days} days`}
      />
      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm text-gray-500">Joined in the last</span>
        <Select value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-32">
          <option value={7}>7 days</option>
          <option value={30}>30 days</option>
          <option value={90}>90 days</option>
        </Select>
      </div>
      {isLoading ? (
        <Spinner />
      ) : !data?.length ? (
        <Card className="py-16 text-center text-gray-400">No new members in the last {days} days</Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((m) => (
            <Link key={m.id} to="/members/$id" params={{ id: String(m.id) }}>
              <Card className="group h-full p-5 transition-shadow hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-lg font-bold text-brand-600">
                  {m.photoUrl ? (
                    <img src={assetUrl(m.photoUrl)} alt={m.name} className="h-12 w-12 rounded-full object-cover" />
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
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
