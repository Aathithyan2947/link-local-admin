import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Tag } from 'lucide-react';
import { api, apiError, type ApiResponse, type PaginationMeta } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/layout/app-layout';
import { Badge, Spinner } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { DataTable, type Column } from '@/components/ui/data-table';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = Record<string, any>;

interface MemberRow {
  id: number;
  email: string | null;
  mobile: string | null;
  userType: string;
  isVerified: boolean;
  verificationStatus: 'verified' | 'pending' | 'rejected' | 'none';
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
  // Pre-filter from the URL (e.g. dashboard "Residents" card → /members?userType=resident).
  const [userType, setUserType] = useState(
    () => new URLSearchParams(window.location.search).get('userType') ?? '',
  );
  const [tagsFor, setTagsFor] = useState<MemberRow | null>(null);

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
    // Verification status is shared across tabs — refresh the verification queues too.
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] });
      qc.invalidateQueries({ queryKey: ['verifications'] });
      qc.invalidateQueries({ queryKey: ['address-docs'] });
    },
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
      cell: (r) =>
        r.verificationStatus === 'verified' ? (
          <Badge tone="success">Verified</Badge>
        ) : r.verificationStatus === 'rejected' ? (
          <Badge tone="danger">Rejected</Badge>
        ) : r.verificationStatus === 'pending' ? (
          <Badge tone="warning">Pending</Badge>
        ) : (
          <Badge>Not submitted</Badge>
        ),
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
          {r.verificationStatus !== 'verified' && (
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
          <Button size="sm" variant="ghost" onClick={() => setTagsFor(r)} title="Assign profile tags">
            <Tag className="h-4 w-4" />
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

      {tagsFor && <MemberTagsModal member={tagsFor} onClose={() => setTagsFor(null)} />}
    </div>
  );
}

// ── Assign profile tags to a member ──────────────────────────
function MemberTagsModal({ member, onClose }: { member: MemberRow; onClose: () => void }) {
  const allTags = useQuery({
    queryKey: ['m-profile-tags'],
    queryFn: () => api.get<ApiResponse<Any[]>>('/masters/profile-tags', { params: { pageSize: 100 } }).then((r) => r.data.data),
  });
  const current = useQuery({
    queryKey: ['member-tags', member.id],
    queryFn: () => api.get<ApiResponse<{ tagIds: number[] }>>(`/admin/members/${member.id}/tags`).then((r) => r.data.data.tagIds),
  });

  const [selected, setSelected] = useState<Set<number> | null>(null);
  const chosen = selected ?? new Set(current.data ?? []);
  const [err, setErr] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => api.put(`/admin/members/${member.id}/tags`, { tagIds: Array.from(chosen) }),
    onSuccess: onClose,
    onError: (e) => setErr(apiError(e)),
  });

  const toggle = (id: number) => {
    const next = new Set(chosen);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  return (
    <Modal open onClose={onClose} title={`Tags — ${member.profile?.name ?? 'Member'}`}>
      {allTags.isLoading || current.isLoading ? <Spinner /> : (
        <div className="space-y-2">
          {(allTags.data ?? []).length === 0 && (
            <p className="text-sm text-gray-400">No tags defined yet. Create them in Masters → Profile Tags.</p>
          )}
          {(allTags.data ?? []).map((t) => (
            <label key={t.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-gray-50">
              <input type="checkbox" checked={chosen.has(t.id)} onChange={() => toggle(t.id)} className="h-4 w-4 rounded border-gray-300 text-brand-500" />
              {t.tagName}
            </label>
          ))}
        </div>
      )}
      {err && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">{err}</div>}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => save.mutate()} loading={save.isPending}>Save tags</Button>
      </div>
    </Modal>
  );
}
