import { useEffect, useRef, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Upload, SlidersHorizontal, ArrowUp, ArrowDown, Trash2, Plus } from 'lucide-react';
import { api, apiError, type ApiResponse, type PaginationMeta } from '@/lib/api';
import { cn, formatDateTime } from '@/lib/utils';
import { PageHeader } from '@/components/layout/app-layout';
import { Badge, Card, Spinner } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Select, Field } from '@/components/ui/input';
import { DataTable, type Column } from '@/components/ui/data-table';

export function AddressesPage() {
  const [tab, setTab] = useState<'list' | 'format'>('list');
  return (
    <div>
      <PageHeader
        breadcrumb="Admin › Masters & Controls"
        title="Address Capture"
        subtitle="Manage all addresses and the per-city address form"
      />
      <div className="mb-5 inline-flex rounded-xl bg-gray-100 p-1">
        {([['list', 'Addresses'], ['format', 'Form Format']] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
              tab === k ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'list' ? <AddressList /> : <FormFormatEditor />}
    </div>
  );
}

// ── Addresses tab ────────────────────────────────────────────
interface AddressRow {
  id: number;
  userName: string;
  mobile: string | null;
  fullAddress: string;
  pincode: string | null;
  city: string;
  isActive: boolean;
  createdAt: string;
}

function AddressList() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['addresses', page, q, status],
    queryFn: async () =>
      (
        await api.get<ApiResponse<AddressRow[]> & { meta: PaginationMeta }>('/addresses/admin/list', {
          params: { page, pageSize: 10, q: q || undefined, status },
        })
      ).data,
    placeholderData: keepPreviousData,
  });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      api.patch(`/addresses/admin/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['addresses'] }),
  });

  const importMut = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return api.post<ApiResponse<{ created: number; skipped: number }>>('/addresses/admin/import', form);
    },
    onSuccess: (res) => {
      const { created, skipped } = res.data.data;
      setNotice(`Imported ${created} address(es)${skipped ? `, skipped ${skipped}` : ''}.`);
      qc.invalidateQueries({ queryKey: ['addresses'] });
    },
    onError: (err) => setNotice(apiError(err)),
  });

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) importMut.mutate(file);
    e.target.value = '';
  };

  const columns: Column<AddressRow>[] = [
    { header: '#', cell: (_r, i) => (page - 1) * 10 + i + 1, className: 'w-12 text-gray-400' },
    {
      header: 'User Name',
      cell: (r) => (
        <div>
          <div className="font-medium text-gray-900">{r.userName}</div>
          {r.mobile && <div className="text-xs text-gray-400">{r.mobile}</div>}
        </div>
      ),
    },
    { header: 'Address', cell: (r) => <div className="max-w-md truncate">{r.fullAddress}</div> },
    { header: 'Pin Code', cell: (r) => r.pincode ?? '—' },
    { header: 'City', cell: (r) => r.city },
    { header: 'Status', cell: (r) => (r.isActive ? <Badge tone="success">Active</Badge> : <Badge tone="warning">Pending</Badge>) },
    { header: 'Created on', cell: (r) => formatDateTime(r.createdAt) },
    {
      header: 'Action',
      className: 'w-32',
      cell: (r) => (
        <Button
          size="sm"
          variant={r.isActive ? 'outline' : 'primary'}
          onClick={() => toggle.mutate({ id: r.id, isActive: !r.isActive })}
        >
          {r.isActive ? 'Deactivate' : 'Activate'}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFile} />
      {notice && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm text-brand-700">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-brand-500 hover:text-brand-700">✕</button>
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} placeholder="Search address, locality, area..." className="pl-10" />
        </div>
        <Select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Pending / Inactive</option>
        </Select>
        <Button variant="outline" onClick={() => refetch()}>
          <SlidersHorizontal className="h-4 w-4" /> Filter
        </Button>
        <Button onClick={() => fileRef.current?.click()} loading={importMut.isPending}>
          <Upload className="h-4 w-4" /> Upload Excel Sheet
        </Button>
      </div>
      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        meta={data?.meta}
        loading={isFetching && !data}
        onPageChange={setPage}
        rowKey={(r) => r.id}
        emptyMessage="No addresses found"
      />
    </div>
  );
}

// ── Form Format tab ──────────────────────────────────────────
interface FieldConfig {
  fieldKey: string;
  label: string;
  isRequired: boolean;
  isVisible: boolean;
  sortOrder: number;
}

const FIELD_CATALOG: Record<string, string> = {
  flat_wing: 'Flat No. / Wing / House / Plot',
  house_no: 'House No.',
  building: 'Building / Apartment name',
  lane1: 'Lane 1',
  lane2: 'Lane 2',
  street: 'Street',
  sector: 'Sector',
  area: 'Area',
  suburb: 'Suburb',
  district: 'District',
  landmark: 'Landmark',
  pincode: 'Pincode',
  state: 'State',
};

interface City { id: number; name: string; state: string | null }

function FormFormatEditor() {
  const [cityId, setCityId] = useState<number | null>(null);
  const [fields, setFields] = useState<FieldConfig[]>([]);
  const [saved, setSaved] = useState(false);

  const { data: cities } = useQuery({
    queryKey: ['cities-all'],
    queryFn: async () =>
      (await api.get<ApiResponse<City[]>>('/masters/cities', { params: { pageSize: 100 } })).data.data,
  });

  useEffect(() => {
    if (cityId == null && cities && cities.length) setCityId(cities[0].id);
  }, [cities, cityId]);

  const { isFetching } = useQuery({
    queryKey: ['city-fields', cityId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<FieldConfig[]>>(`/addresses/admin/city-fields/${cityId}`);
      setFields(res.data.data);
      return res.data.data;
    },
    enabled: cityId != null,
  });

  const save = useMutation({
    mutationFn: () =>
      api.put(`/addresses/admin/city-fields/${cityId}`, {
        fields: fields.map((f, i) => ({ ...f, sortOrder: i + 1 })),
      }),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const update = (i: number, patch: Partial<FieldConfig>) =>
    setFields((fs) => fs.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  const move = (i: number, dir: -1 | 1) =>
    setFields((fs) => {
      const j = i + dir;
      if (j < 0 || j >= fs.length) return fs;
      const next = [...fs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const remove = (i: number) => setFields((fs) => fs.filter((_, idx) => idx !== i));
  const addField = (key: string) =>
    setFields((fs) => [...fs, { fieldKey: key, label: FIELD_CATALOG[key] ?? key, isRequired: false, isVisible: true, sortOrder: fs.length + 1 }]);

  const available = Object.keys(FIELD_CATALOG).filter((k) => !fields.some((f) => f.fieldKey === k));

  return (
    <Card className="p-6">
      <div className="mb-5 flex flex-wrap items-end gap-4">
        <Field label="City">
          <Select value={cityId ?? ''} onChange={(e) => setCityId(Number(e.target.value))} className="min-w-56">
            {(cities ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.state ? `, ${c.state}` : ''}</option>
            ))}
          </Select>
        </Field>
        <p className="text-sm text-gray-500">
          Configure which fields the app's address form shows for this city, and which are required.
        </p>
      </div>

      {isFetching && fields.length === 0 ? (
        <Spinner />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60 text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 text-left font-semibold">Order</th>
                  <th className="px-4 py-3 text-left font-semibold">Field</th>
                  <th className="px-4 py-3 text-left font-semibold">Label (shown to user)</th>
                  <th className="px-4 py-3 text-center font-semibold">Visible</th>
                  <th className="px-4 py-3 text-center font-semibold">Required</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {fields.map((f, i) => (
                  <tr key={f.fieldKey} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                        <button onClick={() => move(i, 1)} disabled={i === fields.length - 1} className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                      </div>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-500">{f.fieldKey}</td>
                    <td className="px-4 py-2">
                      <Input value={f.label} onChange={(e) => update(i, { label: e.target.value })} className="h-9" />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <input type="checkbox" checked={f.isVisible} onChange={(e) => update(i, { isVisible: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-brand-500" />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <input type="checkbox" checked={f.isRequired} onChange={(e) => update(i, { isRequired: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-brand-500" />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => remove(i)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            {available.length > 0 ? (
              <Select value="" onChange={(e) => e.target.value && addField(e.target.value)} className="max-w-xs">
                <option value="">+ Add a field…</option>
                {available.map((k) => (<option key={k} value={k}>{FIELD_CATALOG[k]}</option>))}
              </Select>
            ) : <span />}
            <div className="flex items-center gap-3">
              {saved && <span className="text-sm font-medium text-brand-600">Saved ✓</span>}
              <Button onClick={() => save.mutate()} loading={save.isPending} disabled={cityId == null}>
                <Plus className="hidden" /> Save form format
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
