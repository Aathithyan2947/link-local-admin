import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { api, type ApiResponse, type PaginationMeta } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/utils';
import { PageHeader } from '@/components/layout/app-layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

function ListPage({
  title,
  endpoint,
  queryKey,
  columns,
}: {
  title: string;
  endpoint: string;
  queryKey: string;
  columns: Column<Row>[];
}) {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const { data, isFetching } = useQuery({
    queryKey: [queryKey, page, q],
    queryFn: async () =>
      (
        await api.get<ApiResponse<Row[]> & { meta: PaginationMeta }>(endpoint, {
          params: { page, pageSize: 10, q: q || undefined },
        })
      ).data,
    placeholderData: keepPreviousData,
  });

  return (
    <div>
      <PageHeader breadcrumb="Admin" title={title} />
      <div className="mb-4 relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          placeholder={`Search ${title.toLowerCase()}...`}
          className="pl-10"
        />
      </div>
      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        meta={data?.meta}
        loading={isFetching && !data}
        onPageChange={setPage}
        rowKey={(r) => r.id}
      />
    </div>
  );
}

export function EventsPage() {
  return (
    <ListPage
      title="Events"
      endpoint="/admin/events"
      queryKey="admin-events"
      columns={[
        { header: 'Title', cell: (r) => <span className="font-medium text-gray-900">{r.title}</span> },
        { header: 'Host', cell: (r) => r.creator?.profile?.name ?? '—' },
        { header: 'Date', cell: (r) => formatDate(r.date) },
        { header: 'Mode', cell: (r) => r.mode },
        { header: 'Attendees', cell: (r) => r._count?.attendees ?? 0 },
        { header: 'Price', cell: (r) => (r.isPaid ? `₹${r.price ?? 0}` : <Badge tone="success">Free</Badge>) },
      ]}
    />
  );
}

export function GroupsPage() {
  return (
    <ListPage
      title="Groups"
      endpoint="/admin/groups"
      queryKey="admin-groups"
      columns={[
        { header: 'Title', cell: (r) => <span className="font-medium text-gray-900">{r.title}</span> },
        { header: 'Creator', cell: (r) => r.creator?.profile?.name ?? '—' },
        { header: 'Members', cell: (r) => r._count?.members ?? 0 },
        { header: 'Private', cell: (r) => (r.isPrivate ? 'Yes' : 'No') },
        { header: 'Created', cell: (r) => formatDate(r.createdAt) },
      ]}
    />
  );
}

export function ActivityLogsPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data, isFetching } = useQuery({
    queryKey: ['admin-logs', page, q, from, to],
    queryFn: async () =>
      (
        await api.get<ApiResponse<Row[]> & { meta: PaginationMeta }>('/admin/activity-logs', {
          params: { page, pageSize: 10, q: q || undefined, from: from || undefined, to: to || undefined },
        })
      ).data,
    placeholderData: keepPreviousData,
  });

  const reset = () => { setPage(1); setQ(''); setFrom(''); setTo(''); };

  const columns: Column<Row>[] = [
    { header: 'When', cell: (r) => formatDateTime(r.performedAt) },
    { header: 'Admin', cell: (r) => r.admin?.name ?? '—' },
    { header: 'Action', cell: (r) => <span className="font-mono text-xs">{r.action}</span> },
    { header: 'Entity', cell: (r) => [r.entityType, r.entityId].filter(Boolean).join(' #') || '—' },
  ];

  return (
    <div>
      <PageHeader breadcrumb="Admin" title="Activity Logs" subtitle="Every admin action, newest first." />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} placeholder="Search action, admin, entity..." className="pl-10" />
        </div>
        <label className="text-sm text-gray-500">From
          <Input type="date" value={from} onChange={(e) => { setPage(1); setFrom(e.target.value); }} className="mt-1 block" />
        </label>
        <label className="text-sm text-gray-500">To
          <Input type="date" value={to} onChange={(e) => { setPage(1); setTo(e.target.value); }} className="mt-1 block" />
        </label>
        {(q || from || to) && <Button variant="outline" onClick={reset}>Clear</Button>}
      </div>
      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        meta={data?.meta}
        loading={isFetching && !data}
        onPageChange={setPage}
        rowKey={(r) => r.id}
        emptyMessage="No activity in this range"
      />
    </div>
  );
}
