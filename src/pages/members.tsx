import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { api, type ApiResponse, type PaginationMeta } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/layout/app-layout';
import { Badge } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { DataTable, type Column } from '@/components/ui/data-table';

interface MemberRow {
  id: number;
  email: string | null;
  mobile: string | null;
  userType: string;
  isVerified: boolean;
  isActive: boolean;
  isBlocked: boolean;
  createdAt: string;
  profile: {
    name: string | null;
    address?: { area?: { areaName?: string; city?: { name?: string } } } | null;
  } | null;
}

export function MembersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [userType, setUserType] = useState('');

  const { data, isFetching } = useQuery({
    queryKey: ['members', page, q, userType],
    queryFn: async () => {
      const res = await api.get<ApiResponse<MemberRow[]> & { meta: PaginationMeta }>(
        '/admin/members',
        { params: { page, pageSize: 10, q: q || undefined, userType: userType || undefined } },
      );
      return res.data;
    },
    placeholderData: keepPreviousData,
  });

  const mutation = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Record<string, boolean> }) =>
      api.patch(`/admin/members/${id}/status`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  });

  const columns: Column<MemberRow>[] = [
    {
      header: 'Name',
      cell: (r) => (
        <div>
          <div className="font-medium text-gray-900">{r.profile?.name ?? '—'}</div>
          <div className="text-xs text-gray-400">{r.email ?? r.mobile ?? ''}</div>
        </div>
      ),
    },
    {
      header: 'Type',
      cell: (r) => (
        <Badge tone={r.userType === 'service_provider' ? 'success' : 'neutral'}>
          {r.userType === 'service_provider' ? 'Service Provider' : 'Resident'}
        </Badge>
      ),
    },
    {
      header: 'City',
      cell: (r) => r.profile?.address?.area?.city?.name ?? '—',
    },
    {
      header: 'Verified',
      cell: (r) => (r.isVerified ? <Badge tone="success">Verified</Badge> : <Badge>Pending</Badge>),
    },
    {
      header: 'Status',
      cell: (r) =>
        r.isBlocked ? (
          <Badge tone="danger">Blocked</Badge>
        ) : r.isActive ? (
          <Badge tone="success">Active</Badge>
        ) : (
          <Badge>Inactive</Badge>
        ),
    },
    { header: 'Joined', cell: (r) => formatDate(r.createdAt) },
    {
      header: 'Action',
      cell: (r) => (
        <div className="flex gap-2">
          {!r.isVerified && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => mutation.mutate({ id: r.id, patch: { isVerified: true } })}
            >
              Verify
            </Button>
          )}
          <Button
            size="sm"
            variant={r.isBlocked ? 'outline' : 'danger'}
            onClick={() => mutation.mutate({ id: r.id, patch: { isBlocked: !r.isBlocked } })}
          >
            {r.isBlocked ? 'Unblock' : 'Block'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader breadcrumb="Admin" title="Members" subtitle="Manage residents and service providers" />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Search by name, email, mobile..."
            className="pl-10"
          />
        </div>
        <Select
          value={userType}
          onChange={(e) => {
            setPage(1);
            setUserType(e.target.value);
          }}
        >
          <option value="">All Types</option>
          <option value="resident">Residents</option>
          <option value="service_provider">Service Providers</option>
        </Select>
      </div>

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        meta={data?.meta}
        loading={isFetching && !data}
        onPageChange={setPage}
        rowKey={(r) => r.id}
        emptyMessage="No members found"
      />
    </div>
  );
}
