import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { api, assetUrl, type ApiResponse, type PaginationMeta } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/layout/app-layout';
import { Badge } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/ui/data-table';
import { cn } from '@/lib/utils';

interface VerificationRow {
  id: number;
  name: string;
  email: string | null;
  mobile: string | null;
  userType: string;
  isVerified: boolean;
  completionPercent: number;
  fullAddress: string | null;
  docStatus: string;
  docUrl: string | null;
}

interface DocRow {
  id: number;
  userName: string;
  docType: string;
  docUrl: string;
  status: string;
  fullAddress: string;
  city: string;
  createdAt: string;
}

function ProfilesTab() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const { data, isFetching } = useQuery({
    queryKey: ['verifications', page],
    queryFn: async () =>
      (
        await api.get<ApiResponse<VerificationRow[]> & { meta: PaginationMeta }>(
          '/admin/verifications',
          { params: { page, pageSize: 10, status: 'pending' } },
        )
      ).data,
    placeholderData: keepPreviousData,
  });

  const review = useMutation({
    mutationFn: ({ userId, status }: { userId: number; status: 'approved' | 'rejected' }) =>
      api.patch(`/admin/verifications/${userId}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['verifications'] }),
  });

  const columns: Column<VerificationRow>[] = [
    {
      header: 'Member',
      cell: (r) => (
        <div>
          <div className="font-medium text-gray-900">{r.name}</div>
          <div className="text-xs text-gray-400">{r.email ?? r.mobile}</div>
        </div>
      ),
    },
    { header: 'Type', cell: (r) => (r.userType === 'service_provider' ? 'Service Provider' : 'Resident') },
    {
      header: 'Profile',
      cell: (r) => (
        <div className="flex items-center gap-2">
          <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${r.completionPercent}%` }} />
          </div>
          <span className="text-xs text-gray-500">{r.completionPercent}%</span>
        </div>
      ),
    },
    {
      header: 'Proof',
      cell: (r) =>
        r.docUrl ? (
          <a href={assetUrl(r.docUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-600 hover:underline">
            View <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <Badge>none</Badge>
        ),
    },
    {
      header: 'Action',
      cell: (r) => (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => review.mutate({ userId: r.id, status: 'approved' })}>
            Verify
          </Button>
          <Button size="sm" variant="outline" onClick={() => review.mutate({ userId: r.id, status: 'rejected' })}>
            Reject
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={data?.data ?? []}
      meta={data?.meta}
      loading={isFetching && !data}
      onPageChange={setPage}
      rowKey={(r) => r.id}
      emptyMessage="No pending profile verifications"
    />
  );
}

function DocsTab() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const { data, isFetching } = useQuery({
    queryKey: ['address-docs', page],
    queryFn: async () =>
      (
        await api.get<ApiResponse<DocRow[]> & { meta: PaginationMeta }>('/addresses/admin/docs', {
          params: { page, pageSize: 10, status: 'pending' },
        })
      ).data,
    placeholderData: keepPreviousData,
  });

  const review = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'approved' | 'rejected' }) =>
      api.patch(`/addresses/admin/docs/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['address-docs'] }),
  });

  const columns: Column<DocRow>[] = [
    { header: 'Member', cell: (r) => <span className="font-medium text-gray-900">{r.userName}</span> },
    { header: 'Doc Type', cell: (r) => r.docType },
    { header: 'Address', cell: (r) => <span className="max-w-xs truncate block">{r.fullAddress}</span> },
    { header: 'Submitted', cell: (r) => formatDate(r.createdAt) },
    {
      header: 'Proof',
      cell: (r) => (
        <a href={r.docUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-600 hover:underline">
          View <ExternalLink className="h-3 w-3" />
        </a>
      ),
    },
    {
      header: 'Action',
      cell: (r) => (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => review.mutate({ id: r.id, status: 'approved' })}>
            Approve
          </Button>
          <Button size="sm" variant="outline" onClick={() => review.mutate({ id: r.id, status: 'rejected' })}>
            Reject
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={data?.data ?? []}
      meta={data?.meta}
      loading={isFetching && !data}
      onPageChange={setPage}
      rowKey={(r) => r.id}
      emptyMessage="No pending address proofs"
    />
  );
}

export function VerificationsPage() {
  const [tab, setTab] = useState<'profiles' | 'docs'>('profiles');
  return (
    <div>
      <PageHeader breadcrumb="Admin" title="Verifications" subtitle="Review members and address proofs" />
      <div className="mb-4 inline-flex rounded-xl bg-gray-100 p-1">
        {(['profiles', 'docs'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
              tab === t ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500',
            )}
          >
            {t === 'profiles' ? 'Profile Verification' : 'Address Proofs'}
          </button>
        ))}
      </div>
      {tab === 'profiles' ? <ProfilesTab /> : <DocsTab />}
    </div>
  );
}
