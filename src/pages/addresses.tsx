import { useEffect, useRef, useState, type FormEvent } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Upload, SlidersHorizontal, ArrowUp, ArrowDown, Trash2, Plus, Check, X, Pencil } from 'lucide-react';
import { api, apiError, type ApiResponse, type PaginationMeta } from '@/lib/api';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/app-layout';
import { Badge, Card, Spinner } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Select, Field } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable, type Column } from '@/components/ui/data-table';

export function AddressesPage() {
  const [tab, setTab] = useState<'list' | 'format'>('list');
  return (
    <div>
      <PageHeader
        breadcrumb="Admin › Masters & Controls"
        title="Address Master"
        subtitle="Curated directory of complexes & localities — the source of truth for the app's search autocomplete & 2 km nearby autofill. Residents' flat / plot numbers are never stored here."
      />
      <div className="mb-5 inline-flex rounded-xl bg-gray-100 p-1">
        {([['list', 'Localities'], ['format', 'Form Format']] as const).map(([k, label]) => (
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
      {tab === 'list' ? <MasterList /> : <FormFormatEditor />}
    </div>
  );
}

// ── Localities (Address Master) tab ──────────────────────────
interface MasterRow {
  id: number;
  complex: string | null;
  lane1: string | null;
  lane2: string | null;
  area: string | null;
  suburb: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  status: 'pending' | 'approved' | 'rejected';
  source: string;
  city: string;
  state: string | null;
  createdAt: string;
}

type MasterForm = {
  id?: number;
  cityId?: number;
  complex?: string;
  lane1?: string;
  lane2?: string;
  area?: string;
  suburb?: string;
  pincode?: string;
  latitude?: string;
  longitude?: string;
};

const STATUS_TONE: Record<MasterRow['status'], 'success' | 'warning' | 'danger'> = {
  approved: 'success',
  pending: 'warning',
  rejected: 'danger',
};

// Every field in the admin "Add locality" form is mandatory. The per-city Form Format only
// governs the resident-facing address form in the app — it does NOT apply to this curated
// master, where a complete locality record is always required.
const REQUIRED_TEXT_FIELDS: { key: keyof MasterForm; label: string }[] = [
  { key: 'complex', label: 'Complex / Building name' },
  { key: 'lane1', label: 'Lane 1' },
  { key: 'lane2', label: 'Lane 2' },
  { key: 'area', label: 'Area' },
  { key: 'suburb', label: 'Suburb' },
  { key: 'pincode', label: 'Pincode' },
];

function MasterList() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [notice, setNotice] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<MasterForm>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<MasterRow | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['address-master', page, q, status],
    queryFn: async () =>
      (
        await api.get<ApiResponse<MasterRow[]> & { meta: PaginationMeta }>('/addresses/admin/master', {
          params: { page, pageSize: 10, q: q || undefined, status },
        })
      ).data,
    placeholderData: keepPreviousData,
  });

  const { data: cities } = useQuery({
    queryKey: ['cities-all'],
    queryFn: async () =>
      (await api.get<ApiResponse<City[]>>('/masters/cities', { params: { pageSize: 100 } })).data.data,
  });

  const review = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'approved' | 'rejected' }) =>
      api.patch(`/addresses/admin/master/${id}/review`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['address-master'] }),
  });

  const save = useMutation({
    mutationFn: (payload: MasterForm) => {
      const body = {
        cityId: payload.cityId,
        complex: payload.complex || undefined,
        lane1: payload.lane1 || undefined,
        lane2: payload.lane2 || undefined,
        area: payload.area || undefined,
        suburb: payload.suburb || undefined,
        pincode: payload.pincode || undefined,
        latitude: Number(payload.latitude),
        longitude: Number(payload.longitude),
      };
      return payload.id
        ? api.patch(`/addresses/admin/master/${payload.id}`, body)
        : api.post('/addresses/admin/master', body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['address-master'] });
      setModalOpen(false);
      setForm({});
    },
    onError: (err) => setFormError(apiError(err)),
  });

  const importMut = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return api.post<ApiResponse<{ created: number; skipped: number }>>('/addresses/admin/import', form);
    },
    onSuccess: (res) => {
      const { created, skipped } = res.data.data;
      setNotice(`Imported ${created} locality(ies)${skipped ? `, skipped ${skipped}` : ''}.`);
      qc.invalidateQueries({ queryKey: ['address-master'] });
    },
    onError: (err) => setNotice(apiError(err)),
  });

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) importMut.mutate(file);
    e.target.value = '';
  };

  function openCreate() {
    setForm({ cityId: cities?.[0]?.id });
    setFormError(null);
    setModalOpen(true);
  }
  function openEdit(r: MasterRow) {
    setForm({
      id: r.id,
      cityId: cities?.find((c) => c.name === r.city)?.id,
      complex: r.complex ?? '',
      lane1: r.lane1 ?? '',
      lane2: r.lane2 ?? '',
      area: r.area ?? '',
      suburb: r.suburb ?? '',
      pincode: r.pincode ?? '',
      latitude: r.latitude != null ? String(r.latitude) : '',
      longitude: r.longitude != null ? String(r.longitude) : '',
    });
    setFormError(null);
    setModalOpen(true);
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.cityId) {
      setFormError('City is required');
      return;
    }
    // Every locality field is required in the admin form.
    for (const { key, label } of REQUIRED_TEXT_FIELDS) {
      const val = form[key];
      if (!val || !String(val).trim()) {
        setFormError(`${label} is required`);
        return;
      }
    }
    // Latitude / Longitude are always mandatory and must be valid coordinates.
    if (!form.latitude?.trim()) {
      setFormError('Latitude is required');
      return;
    }
    const lat = Number(form.latitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      setFormError('Latitude must be a number between -90 and 90');
      return;
    }
    if (!form.longitude?.trim()) {
      setFormError('Longitude is required');
      return;
    }
    const lng = Number(form.longitude);
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      setFormError('Longitude must be a number between -180 and 180');
      return;
    }
    setFormError(null);
    save.mutate(form);
  }

  const dash = (v: string | null) => (v && v.trim() ? v : '—');

  const columns: Column<MasterRow>[] = [
    { header: '#', cell: (_r, i) => (page - 1) * 10 + i + 1, className: 'w-12 text-gray-400' },
    { header: 'Complex / Building', cell: (r) => <span className="font-medium text-gray-900">{dash(r.complex)}</span> },
    { header: 'Lane 1', cell: (r) => dash(r.lane1) },
    { header: 'Lane 2', cell: (r) => dash(r.lane2) },
    { header: 'Area', cell: (r) => dash(r.area) },
    { header: 'Suburb', cell: (r) => dash(r.suburb) },
    { header: 'City', cell: (r) => <div>{r.city}{r.state ? <div className="text-xs text-gray-400">{r.state}</div> : null}</div> },
    { header: 'Pincode', cell: (r) => dash(r.pincode) },
    { header: 'Status', cell: (r) => <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge> },
    {
      header: 'Action',
      className: 'w-40',
      cell: (r) => (
        <div className="flex items-center gap-1">
          {r.status !== 'approved' && (
            <Button size="sm" onClick={() => review.mutate({ id: r.id, status: 'approved' })} title="Approve">
              <Check className="h-4 w-4" /> Approve
            </Button>
          )}
          {r.status !== 'rejected' && (
            <button
              onClick={() => setRejectTarget(r)}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"
              title="Reject"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => openEdit(r)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-brand-600"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>
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
          <Input value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} placeholder="Search lane, area, suburb, city, pincode..." className="pl-10" />
        </div>
        <Select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
          <option value="all">All Status</option>
          <option value="pending">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </Select>
        <Button variant="outline" onClick={() => refetch()}>
          <SlidersHorizontal className="h-4 w-4" /> Filter
        </Button>
        <Button variant="outline" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add Locality
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
        emptyMessage="No localities found"
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={`${form.id ? 'Edit' : 'Add'} locality`}>
        <form onSubmit={submit} className="space-y-4">
          <Field label="City" required>
            <Select
              value={form.cityId ?? ''}
              onChange={(e) => setForm((s) => ({ ...s, cityId: Number(e.target.value) }))}
              className="w-full"
            >
              <option value="">Select...</option>
              {(cities ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.state ? `, ${c.state}` : ''}</option>
              ))}
            </Select>
          </Field>
          <Field label="Complex / Building name" required>
            <Input value={form.complex ?? ''} onChange={(e) => setForm((s) => ({ ...s, complex: e.target.value }))} placeholder="e.g. Sudarshan Sky Garden" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Lane 1" required><Input value={form.lane1 ?? ''} onChange={(e) => setForm((s) => ({ ...s, lane1: e.target.value }))} /></Field>
            <Field label="Lane 2" required><Input value={form.lane2 ?? ''} onChange={(e) => setForm((s) => ({ ...s, lane2: e.target.value }))} /></Field>
            <Field label="Area" required><Input value={form.area ?? ''} onChange={(e) => setForm((s) => ({ ...s, area: e.target.value }))} /></Field>
            <Field label="Suburb" required><Input value={form.suburb ?? ''} onChange={(e) => setForm((s) => ({ ...s, suburb: e.target.value }))} /></Field>
            <Field label="Pincode" required><Input value={form.pincode ?? ''} onChange={(e) => setForm((s) => ({ ...s, pincode: e.target.value }))} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude" required><Input value={form.latitude ?? ''} onChange={(e) => setForm((s) => ({ ...s, latitude: e.target.value }))} placeholder="e.g. 19.2700000" /></Field>
            <Field label="Longitude" required><Input value={form.longitude ?? ''} onChange={(e) => setForm((s) => ({ ...s, longitude: e.target.value }))} placeholder="e.g. 72.9690000" /></Field>
          </div>
          <p className="text-xs text-gray-400">The complex/building name powers search autofill; latitude / longitude power the app's 2&nbsp;km nearby-autofill. Residents' flat / plot numbers are never stored here.</p>
          {formError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">{formError}</div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={save.isPending}>{form.id ? 'Save changes' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      {rejectTarget && (
        <ConfirmDialog
          open
          destructive
          title="Reject locality"
          confirmLabel="Reject"
          loading={review.isPending}
          message={
            <>
              Reject{' '}
              <span className="font-semibold text-gray-900">
                “{rejectTarget.complex || rejectTarget.area || rejectTarget.lane2 || rejectTarget.lane1 || rejectTarget.suburb || rejectTarget.city}”
              </span>
              ? It will no longer be suggested to users in the app.
            </>
          }
          onConfirm={() =>
            review.mutate(
              { id: rejectTarget.id, status: 'rejected' },
              { onSettled: () => setRejectTarget(null) },
            )
          }
          onClose={() => setRejectTarget(null)}
        />
      )}
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
