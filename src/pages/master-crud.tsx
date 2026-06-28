import { useMemo, useState, type FormEvent } from 'react';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, Check } from 'lucide-react';
import { api, apiError, type ApiResponse, type PaginationMeta } from '@/lib/api';
import { PageHeader } from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/card';
import { Field, Input, Select } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { DataTable, type Column } from '@/components/ui/data-table';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export interface FieldConfig {
  name: string;
  label: string;
  type: 'text' | 'number' | 'checkbox' | 'select' | 'date';
  required?: boolean;
  options?: { value: string | number; label: string }[];
  /** Fetch select options from a master endpoint returning {id, ...}. */
  optionsEndpoint?: string;
  optionLabel?: (row: Row) => string;
}

export interface MasterCrudConfig {
  title: string;
  breadcrumb: string;
  subtitle?: string;
  endpoint: string;
  queryKey: string;
  columns: Column<Row>[];
  fields: FieldConfig[];
  searchPlaceholder?: string;
  /**
   * Enables verification/approval: shows an Active/Pending status column, a status filter,
   * and an Approve action. User-suggested rows arrive with `isActive: false` (pending).
   */
  approvable?: boolean;
  /**
   * Replaces the hard Delete with a reversible Deactivate / Activate toggle (`isActive`).
   * Used for entities that shouldn't be destroyed (e.g. whitelisted cities with linked data).
   */
  softDelete?: boolean;
}

function RemoteSelect({
  field,
  value,
  onChange,
}: {
  field: FieldConfig;
  value: string;
  onChange: (v: string) => void;
}) {
  const { data } = useQuery({
    queryKey: ['options', field.optionsEndpoint],
    queryFn: async () =>
      (await api.get<ApiResponse<Row[]>>(field.optionsEndpoint!, { params: { pageSize: 100 } })).data
        .data,
    enabled: !!field.optionsEndpoint,
  });
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} className="w-full">
      <option value="">Select...</option>
      {(data ?? []).map((o) => (
        <option key={o.id} value={o.id}>
          {field.optionLabel ? field.optionLabel(o) : (o.name ?? o.label ?? o.id)}
        </option>
      ))}
    </Select>
  );
}

export function MasterCrudPage({ config }: { config: MasterCrudConfig }) {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [active, setActive] = useState('all'); // approval filter: all | active | pending
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Row>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const { data, isFetching } = useQuery({
    queryKey: [config.queryKey, page, q, active],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Row[]> & { meta: PaginationMeta }>(config.endpoint, {
        params: {
          page,
          pageSize: 10,
          q: q || undefined,
          isActive:
            !config.approvable || active === 'all' ? undefined : active === 'active' ? 'true' : 'false',
        },
      });
      return res.data;
    },
    placeholderData: keepPreviousData,
  });

  const approve = useMutation({
    mutationFn: (id: number) => api.patch(`${config.endpoint}/${id}`, { isActive: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [config.queryKey] }),
  });

  // Reversible activate/deactivate (used in place of hard delete for softDelete configs).
  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      api.patch(`${config.endpoint}/${id}`, { isActive }),
    onSuccess: () => {
      setNotice(null);
      qc.invalidateQueries({ queryKey: [config.queryKey] });
    },
    onError: (err) => setNotice(apiError(err)),
  });

  const save = useMutation({
    mutationFn: async (payload: Row) => {
      if (editing) return api.patch(`${config.endpoint}/${editing.id}`, payload);
      return api.post(config.endpoint, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [config.queryKey] });
      closeModal();
    },
    onError: (err) => setError(apiError(err)),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`${config.endpoint}/${id}`),
    onSuccess: () => {
      setNotice(null);
      qc.invalidateQueries({ queryKey: [config.queryKey] });
    },
    // Surface the reason (e.g. "city has members — deactivate instead") instead of failing silently.
    onError: (err) => setNotice(apiError(err)),
  });

  function openCreate() {
    setEditing(null);
    // Admin-created master rows are approved by default (only user-suggested ones are pending).
    setForm(config.approvable ? { isActive: true } : {});
    setError(null);
    setModalOpen(true);
  }
  function openEdit(row: Row) {
    setEditing(row);
    setForm({ ...row });
    setError(null);
    setModalOpen(true);
  }
  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm({});
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const payload: Row = {};
    for (const f of config.fields) {
      const raw = form[f.name];
      // Treat null (a NULL value loaded from the DB into the edit form) like empty, so we
      // never PATCH `null` — the backend's z.string().optional() accepts undefined, not null.
      if (raw === undefined || raw === '' || raw === null) {
        if (f.type === 'checkbox') payload[f.name] = false;
        continue;
      }
      if (f.type === 'number' || (f.type === 'select' && f.optionsEndpoint)) {
        payload[f.name] = Number(raw);
      } else if (f.type === 'checkbox') {
        payload[f.name] = Boolean(raw);
      } else {
        payload[f.name] = raw;
      }
    }
    save.mutate(payload);
  }

  const columnsWithActions: Column<Row>[] = useMemo(
    () => [
      ...config.columns,
      ...(config.approvable
        ? [
            {
              header: 'Status',
              className: 'w-32',
              cell: (row: Row) =>
                row.isActive ? (
                  <Badge tone="success">Approved</Badge>
                ) : (
                  <Badge tone="warning">Pending</Badge>
                ),
            } as Column<Row>,
          ]
        : []),
      {
        header: 'Action',
        className: 'w-36',
        cell: (row: Row) => (
          <div className="flex gap-1">
            {config.approvable && !row.isActive && (
              <Button size="sm" onClick={() => approve.mutate(row.id)} title="Approve">
                <Check className="h-4 w-4" /> Approve
              </Button>
            )}
            <button
              onClick={() => openEdit(row)}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-brand-600"
              title="Edit"
            >
              <Pencil className="h-4 w-4" />
            </button>
            {config.softDelete ? (
              <Button
                size="sm"
                variant={row.isActive === false ? 'primary' : 'outline'}
                onClick={() => toggleActive.mutate({ id: row.id, isActive: row.isActive === false })}
              >
                {row.isActive === false ? 'Activate' : 'Deactivate'}
              </Button>
            ) : (
              <button
                onClick={() => {
                  if (confirm('Delete this record?')) remove.mutate(row.id);
                }}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.columns, config.approvable, config.softDelete],
  );

  return (
    <div>
      <PageHeader
        breadcrumb={config.breadcrumb}
        title={config.title}
        subtitle={config.subtitle}
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add New
          </Button>
        }
      />

      {notice && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative max-w-md flex-1 min-w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder={config.searchPlaceholder ?? 'Search...'}
            className="pl-10"
          />
        </div>
        {config.approvable && (
          <Select
            value={active}
            onChange={(e) => {
              setPage(1);
              setActive(e.target.value);
            }}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending Approval</option>
            <option value="active">Approved</option>
          </Select>
        )}
      </div>

      <DataTable
        columns={columnsWithActions}
        rows={data?.data ?? []}
        meta={data?.meta}
        loading={isFetching && !data}
        onPageChange={setPage}
        rowKey={(r) => r.id}
      />

      <Modal open={modalOpen} onClose={closeModal} title={`${editing ? 'Edit' : 'Add'} ${config.title}`}>
        <form onSubmit={submit} className="space-y-4">
          {config.fields.map((f) => (
            <div key={f.name}>
              {f.type === 'checkbox' ? (
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={!!form[f.name]}
                    onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-brand-500"
                  />
                  {f.label}
                </label>
              ) : (
                <Field label={f.label}>
                  {f.type === 'select' && f.optionsEndpoint ? (
                    <RemoteSelect
                      field={f}
                      value={form[f.name] ?? ''}
                      onChange={(v) => setForm((s) => ({ ...s, [f.name]: v }))}
                    />
                  ) : f.type === 'select' ? (
                    <Select
                      value={form[f.name] ?? ''}
                      onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.value }))}
                      className="w-full"
                    >
                      <option value="">Select...</option>
                      {f.options?.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                      value={form[f.name] ?? ''}
                      required={f.required}
                      onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.value }))}
                    />
                  )}
                </Field>
              )}
            </div>
          ))}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" loading={save.isPending}>
              {editing ? 'Save changes' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
