import { useState, type FormEvent } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil } from 'lucide-react';
import { api, apiError, type ApiResponse, type PaginationMeta } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/layout/app-layout';
import { Badge } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { DataTable, type Column } from '@/components/ui/data-table';
import { useAuth } from '@/lib/auth';

interface AdminRow {
  id: number;
  name: string;
  email: string;
  role: string | null;
  isActive: boolean;
  createdAt: string;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Form = Record<string, any>;

const ROLE_LABEL: Record<string, string> = { super_admin: 'Super Admin', ops_admin: 'Ops Admin' };

export function AdminsPage() {
  const qc = useQueryClient();
  const { admin: me } = useAuth();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Form>({});
  const [err, setErr] = useState<string | null>(null);

  const { data, isFetching } = useQuery({
    queryKey: ['admins', page, q],
    queryFn: async () =>
      (await api.get<ApiResponse<AdminRow[]> & { meta: PaginationMeta }>('/admin/admins', {
        params: { page, pageSize: 10, q: q || undefined },
      })).data,
    placeholderData: keepPreviousData,
  });

  const save = useMutation({
    mutationFn: (f: Form) => {
      if (f.id) {
        const body: Form = { name: f.name, role: f.role, isActive: f.isActive };
        if (f.password) body.password = f.password;
        return api.patch(`/admin/admins/${f.id}`, body);
      }
      return api.post('/admin/admins', { name: f.name, email: f.email, password: f.password, role: f.role || 'ops_admin' });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admins'] }); setModal(false); },
    onError: (e) => setErr(apiError(e)),
  });

  const openCreate = () => { setForm({ role: 'ops_admin', isActive: true }); setErr(null); setModal(true); };
  const openEdit = (a: AdminRow) => { setForm({ id: a.id, name: a.name, email: a.email, role: a.role ?? 'ops_admin', isActive: a.isActive }); setErr(null); setModal(true); };

  const columns: Column<AdminRow>[] = [
    { header: 'Name', cell: (r) => (
      <div>
        <div className="font-medium text-gray-900">{r.name}{r.id === me?.id && <span className="ml-1 text-xs text-gray-400">(you)</span>}</div>
        <div className="text-xs text-gray-400">{r.email}</div>
      </div>
    ) },
    { header: 'Role', cell: (r) => <Badge tone={r.role === 'super_admin' ? 'success' : 'neutral'}>{ROLE_LABEL[r.role ?? ''] ?? r.role ?? '—'}</Badge> },
    { header: 'Status', cell: (r) => (r.isActive ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>) },
    { header: 'Added', cell: (r) => formatDate(r.createdAt) },
    { header: 'Action', className: 'w-20', cell: (r) => (
      <button onClick={() => openEdit(r)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-brand-600" title="Edit"><Pencil className="h-4 w-4" /></button>
    ) },
  ];

  return (
    <div>
      <PageHeader
        breadcrumb="Admin"
        title="Admins"
        subtitle="Manage admin accounts and their roles. Super Admins manage everything; Ops Admins handle day-to-day moderation (no masters or admin management)."
        actions={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Add admin</Button>}
      />

      <div className="mb-4 max-w-md">
        <Input value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} placeholder="Search admins..." />
      </div>

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        meta={data?.meta}
        loading={isFetching && !data}
        onPageChange={setPage}
        rowKey={(r) => r.id}
        emptyMessage="No admins found"
      />

      <Modal open={modal} onClose={() => setModal(false)} title={`${form.id ? 'Edit' : 'Add'} admin`}>
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); save.mutate(form); }} className="space-y-4">
          <Field label="Name"><Input value={form.name ?? ''} required onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} /></Field>
          <Field label="Email">
            <Input type="email" value={form.email ?? ''} required disabled={!!form.id} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
          </Field>
          <Field label={form.id ? 'New password (leave blank to keep)' : 'Password (min 8 chars)'}>
            <Input type="password" value={form.password ?? ''} required={!form.id} onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))} />
          </Field>
          <Field label="Role">
            <Select value={form.role ?? 'ops_admin'} onChange={(e) => setForm((s) => ({ ...s, role: e.target.value }))} className="w-full">
              <option value="ops_admin">Ops Admin</option>
              <option value="super_admin">Super Admin</option>
            </Select>
          </Field>
          {form.id && (
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input type="checkbox" checked={form.isActive ?? true} onChange={(e) => setForm((s) => ({ ...s, isActive: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-brand-500" /> Active
            </label>
          )}
          {err && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">{err}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit" loading={save.isPending}>{form.id ? 'Save' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
