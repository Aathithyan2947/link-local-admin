import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, SlidersHorizontal, ChevronRight, Eye } from 'lucide-react';
import { api, apiError, type ApiResponse } from '@/lib/api';
import { PageHeader } from '@/components/layout/app-layout';
import { Badge, Card, Spinner } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { OnboardingPreview } from '@/components/onboarding-preview';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

// 'menu' and 'booking' are feature markers rather than questions — they turn on the SP's
// item catalogue / slot booking and render as a link into that editor. Put them under
// Service Type. 'date' is an ordinary date question.
const FIELD_TYPES = ['text', 'number', 'date', 'dropdown', 'boolean', 'file', 'image', 'menu', 'booking', 'pincode'];

const CATEGORY_OPTIONS = [
  { value: 'basic_details', label: 'Basic Details' },
  { value: 'travel', label: 'Travel' },
  { value: 'payment', label: 'Payment' },
  { value: 'service_type', label: 'Service Type' },
  { value: 'delivery', label: 'Delivery' },
] as const;
const fieldCategoryLabel = (v?: string) => CATEGORY_OPTIONS.find((c) => c.value === v)?.label ?? v ?? '—';
const optionsOf = (raw?: string | null) => (raw ?? '').split(',').map((s) => s.trim()).filter(Boolean);

/** Fields in the order a service provider meets them: by step, then by sortOrder. */
const orderedFields = (rows: Row[]) =>
  [...rows].sort((a, b) => {
    const ca = CATEGORY_OPTIONS.findIndex((c) => c.value === a.category);
    const cb = CATEGORY_OPTIONS.findIndex((c) => c.value === b.category);
    if (ca !== cb) return ca - cb;
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });

const list = (endpoint: string, params: Record<string, unknown>) =>
  api.get<ApiResponse<Row[]>>(endpoint, { params: { pageSize: 100, ...params } }).then((r) => r.data.data);

export function ServiceCategoriesPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Row | null>(null);
  // Delete confirmation (modern modal, not the native confirm)
  const [pendingDelete, setPendingDelete] = useState<{ kind: 'cat' | 'sub'; row: Row } | null>(null);
  const [delError, setDelError] = useState<string | null>(null);

  const cats = useQuery({ queryKey: ['svc-cats'], queryFn: () => list('/masters/service-categories', {}) });
  const selectedId = selected?.id;
  const subs = useQuery({
    queryKey: ['svc-subs', selectedId],
    queryFn: () => list('/masters/service-subcategories', { categoryId: selectedId }),
    enabled: selectedId != null,
  });

  // ── Category modal ──
  const [catModal, setCatModal] = useState(false);
  const [catForm, setCatForm] = useState<Row>({});
  const [catErr, setCatErr] = useState<string | null>(null);
  const saveCat = useMutation({
    mutationFn: (f: Row) => {
      const body = { name: f.name, isActive: f.isActive ?? true };
      return f.id ? api.patch(`/masters/service-categories/${f.id}`, body) : api.post('/masters/service-categories', body);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['svc-cats'] }); setCatModal(false); },
    onError: (e) => setCatErr(apiError(e)),
  });
  const delCat = useMutation({
    mutationFn: (id: number) => api.delete(`/masters/service-categories/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['svc-cats'] }); setSelected(null); setPendingDelete(null); },
    onError: (e) => setDelError(apiError(e)),
  });

  // ── Subcategory modal ──
  const [subModal, setSubModal] = useState(false);
  const [subForm, setSubForm] = useState<Row>({});
  const [subErr, setSubErr] = useState<string | null>(null);
  const saveSub = useMutation({
    mutationFn: (f: Row) => {
      const type = f.type || null;
      const body = { categoryId: selectedId, name: f.name, type, isActive: f.isActive ?? true };
      return f.id ? api.patch(`/masters/service-subcategories/${f.id}`, { name: f.name, type, isActive: f.isActive }) : api.post('/masters/service-subcategories', body);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['svc-subs', selectedId] }); qc.invalidateQueries({ queryKey: ['svc-cats'] }); setSubModal(false); },
    onError: (e) => setSubErr(apiError(e)),
  });
  const delSub = useMutation({
    mutationFn: (id: number) => api.delete(`/masters/service-subcategories/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['svc-subs', selectedId] }); qc.invalidateQueries({ queryKey: ['svc-cats'] }); setPendingDelete(null); },
    onError: (e) => setDelError(apiError(e)),
  });

  // ── Onboarding fields modal (per subcategory) ──
  const [fieldsFor, setFieldsFor] = useState<Row | null>(null);

  const delPending = pendingDelete?.kind === 'cat' ? delCat.isPending : delSub.isPending;
  function confirmDelete() {
    if (!pendingDelete) return;
    setDelError(null);
    (pendingDelete.kind === 'cat' ? delCat : delSub).mutate(pendingDelete.row.id);
  }

  const openCatCreate = () => { setCatForm({ isActive: true }); setCatErr(null); setCatModal(true); };
  const openCatEdit = (c: Row) => { setCatForm({ id: c.id, name: c.name, isActive: c.isActive }); setCatErr(null); setCatModal(true); };
  const openSubCreate = () => { setSubForm({ isActive: true }); setSubErr(null); setSubModal(true); };
  const openSubEdit = (s: Row) => { setSubForm({ id: s.id, name: s.name, isActive: s.isActive }); setSubErr(null); setSubModal(true); };

  return (
    <div>
      <PageHeader
        breadcrumb="Admin › Masters & Controls"
        title="Service Categories"
        subtitle="Categories, their sub-categories, and the extra onboarding fields each sub-category asks service providers."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[340px_1fr]">
        {/* Categories */}
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Categories</h3>
            <Button size="sm" onClick={openCatCreate}><Plus className="h-4 w-4" /> Add</Button>
          </div>
          {cats.isLoading ? <Spinner /> : (
            <div className="space-y-1">
              {(cats.data ?? []).map((c) => (
                <div
                  key={c.id}
                  className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm ${selectedId === c.id ? 'bg-brand-50 text-brand-700' : 'hover:bg-gray-50'}`}
                  onClick={() => setSelected(c)}
                >
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-xs text-gray-400">{c.subcategories?.length ?? 0}</span>
                    {c.isActive === false && <Badge>Off</Badge>}
                  </span>
                  <span className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); openCatEdit(c); }} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-brand-600"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={(e) => { e.stopPropagation(); setPendingDelete({ kind: 'cat', row: c }); }} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                    <ChevronRight className="h-4 w-4 text-gray-300" />
                  </span>
                </div>
              ))}
              {cats.data?.length === 0 && <p className="px-3 py-6 text-center text-sm text-gray-400">No categories yet</p>}
            </div>
          )}
        </Card>

        {/* Subcategories of selected category */}
        <Card className="p-4">
          {!selected ? (
            <p className="py-16 text-center text-sm text-gray-400">Select a category to manage its sub-categories</p>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Sub-categories of “{selected.name}”</h3>
                <Button size="sm" onClick={openSubCreate}><Plus className="h-4 w-4" /> Add sub-category</Button>
              </div>
              {subs.isLoading ? <Spinner /> : (
                <div className="overflow-hidden rounded-xl border border-gray-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/60 text-xs uppercase tracking-wide text-gray-500">
                        <th className="px-4 py-2.5 text-left font-semibold">Sub-category</th>
                        <th className="px-4 py-2.5 text-left font-semibold">Feature type</th>
                        <th className="px-4 py-2.5 text-left font-semibold">Status</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Onboarding fields</th>
                        <th className="px-4 py-2.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {(subs.data ?? []).map((s) => (
                        <tr key={s.id} className="border-b border-gray-50 last:border-0">
                          <td className="px-4 py-2 font-medium text-gray-900">{s.name}</td>
                          <td className="px-4 py-2">
                            {s.fields?.some((f: Row) => f.fieldType === 'menu') && <Badge tone="success">Menu</Badge>}
                            {s.fields?.some((f: Row) => f.fieldType === 'booking') && <Badge tone="warning">Booking</Badge>}
                            {!s.fields?.length && <span className="text-xs text-gray-400">—</span>}
                          </td>
                          <td className="px-4 py-2">{s.isActive === false ? <Badge>Inactive</Badge> : <Badge tone="success">Active</Badge>}</td>
                          <td className="px-4 py-2 text-right">
                            <Button size="sm" variant="outline" onClick={() => setFieldsFor(s)}>
                              <SlidersHorizontal className="h-4 w-4" /> Fields
                            </Button>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <button onClick={() => openSubEdit(s)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-brand-600"><Pencil className="h-4 w-4" /></button>
                            <button onClick={() => setPendingDelete({ kind: 'sub', row: s })} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                          </td>
                        </tr>
                      ))}
                      {subs.data?.length === 0 && (
                        <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">No sub-categories yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {/* Category modal */}
      <Modal open={catModal} onClose={() => setCatModal(false)} title={`${catForm.id ? 'Edit' : 'Add'} category`}>
        <form onSubmit={(e) => { e.preventDefault(); saveCat.mutate(catForm); }} className="space-y-4">
          <Field label="Category name"><Input value={catForm.name ?? ''} required onChange={(e) => setCatForm((s) => ({ ...s, name: e.target.value }))} /></Field>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input type="checkbox" checked={catForm.isActive ?? true} onChange={(e) => setCatForm((s) => ({ ...s, isActive: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-brand-500" /> Active
          </label>
          {catErr && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">{catErr}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setCatModal(false)}>Cancel</Button>
            <Button type="submit" loading={saveCat.isPending}>{catForm.id ? 'Save' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      {/* Subcategory modal */}
      <Modal open={subModal} onClose={() => setSubModal(false)} title={`${subForm.id ? 'Edit' : 'Add'} sub-category`}>
        <form onSubmit={(e) => { e.preventDefault(); saveSub.mutate(subForm); }} className="space-y-4">
          <Field label="Sub-category name"><Input value={subForm.name ?? ''} required onChange={(e) => setSubForm((s) => ({ ...s, name: e.target.value }))} /></Field>
          <p className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-500">
            Menu and booking are set up in <strong>Fields</strong> now — add a field of type
            <code className="mx-1">menu</code> or <code>booking</code> under Service Type, so a
            sub-category's whole onboarding lives in one place.
          </p>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input type="checkbox" checked={subForm.isActive ?? true} onChange={(e) => setSubForm((s) => ({ ...s, isActive: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-brand-500" /> Active
          </label>
          {subErr && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">{subErr}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setSubModal(false)}>Cancel</Button>
            <Button type="submit" loading={saveSub.isPending}>{subForm.id ? 'Save' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      {fieldsFor && <FieldsModal subcategory={fieldsFor} onClose={() => setFieldsFor(null)} />}

      {pendingDelete && (
        <ConfirmDialog
          open
          destructive
          title={pendingDelete.kind === 'cat' ? 'Delete category' : 'Delete sub-category'}
          confirmLabel="Delete"
          loading={delPending}
          error={delError}
          message={
            <>
              Delete{' '}
              <span className="font-semibold text-gray-900">“{pendingDelete.row.name}”</span>?{' '}
              {pendingDelete.kind === 'cat'
                ? 'Its sub-categories and onboarding fields will be affected.'
                : 'Its onboarding fields will be removed too.'}{' '}
              This can’t be undone.
            </>
          }
          onConfirm={confirmDelete}
          onClose={() => { setPendingDelete(null); setDelError(null); }}
        />
      )}
    </div>
  );
}

// ── Per-subcategory onboarding fields manager ──
function FieldsModal({ subcategory, onClose }: { subcategory: Row; onClose: () => void }) {
  const qc = useQueryClient();
  const subId = subcategory.id;
  const key = ['subcat-fields', subId];
  const fields = useQuery({ queryKey: key, queryFn: () => list('/masters/subcategory-fields', { subcategoryId: subId }) });
  const [previewOpen, setPreviewOpen] = useState(false);
  const reorder = useMutation({
    mutationFn: (ordered: Row[]) =>
      api.patch('/masters/subcategory-fields/reorder', {
        items: ordered.map((f, i) => ({ id: f.id, sortOrder: i })),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const [form, setForm] = useState<Row>({ fieldType: 'text', isRequired: false, category: 'basic_details' });
  const [err, setErr] = useState<string | null>(null);

  // ── Prefill: copy fields from another sub-category ──
  const [copyFrom, setCopyFrom] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const allSubs = useQuery({ queryKey: ['all-subs'], queryFn: () => list('/masters/service-subcategories', {}) });
  const copy = useMutation({
    mutationFn: (fromId: number) =>
      api.post<ApiResponse<{ copied: number; skipped: number }>>('/masters/subcategory-fields/copy', {
        fromSubcategoryId: fromId,
        toSubcategoryId: subId,
      }),
    onSuccess: (res) => {
      const { copied, skipped } = res.data.data;
      setNotice(`Copied ${copied} field${copied === 1 ? '' : 's'}${skipped ? `, skipped ${skipped} already present` : ''}.`);
      setCopyFrom('');
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e) => setErr(apiError(e)),
  });

  const copySources = (allSubs.data ?? []).filter((s) => s.id !== subId);

  const save = useMutation({
    mutationFn: (f: Row) => {
      const body: Row = {
        subcategoryId: subId,
        fieldName: f.fieldName,
        fieldType: f.fieldType || 'text',
        category: f.category || 'basic_details',
        isRequired: f.isRequired ?? false,
        sortOrder: f.sortOrder ? Number(f.sortOrder) : 0,
        dependsOnFieldId: f.dependsOnFieldId ?? null,
        dependsOnValue: f.dependsOnFieldId ? (f.dependsOnValue ?? null) : null,
      };
      if (f.fieldType === 'dropdown' && f.fieldOptions) body.fieldOptions = f.fieldOptions;
      return f.id
        ? api.patch(`/masters/subcategory-fields/${f.id}`, { fieldName: body.fieldName, fieldType: body.fieldType, category: body.category, isRequired: body.isRequired, sortOrder: body.sortOrder, fieldOptions: body.fieldOptions, dependsOnFieldId: body.dependsOnFieldId, dependsOnValue: body.dependsOnValue })
        : api.post('/masters/subcategory-fields', body);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); setForm({ fieldType: 'text', isRequired: false, category: 'basic_details' }); setErr(null); },
    onError: (e) => setErr(apiError(e)),
  });
  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/masters/subcategory-fields/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
  const [pendingFieldDelete, setPendingFieldDelete] = useState<Row | null>(null);

  return (
    <Modal open onClose={onClose} title={`Onboarding fields — ${subcategory.name}`}>
      <p className="mb-3 text-sm text-gray-500">Extra questions service providers answer for this sub-category during onboarding.</p>

      {copySources.length > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50/60 p-2">
          <Select value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} className="min-w-0 flex-1">
            <option value="">Prefill fields from another sub-category…</option>
            {copySources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.category?.name ? `${s.category.name} › ${s.name}` : s.name}
              </option>
            ))}
          </Select>
          <Button
            type="button"
            variant="outline"
            disabled={!copyFrom}
            loading={copy.isPending}
            onClick={() => copy.mutate(Number(copyFrom))}
            className="shrink-0"
          >
            Prefill
          </Button>
        </div>
      )}
      {notice && (
        <div className="mb-3 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-700">{notice}</div>
      )}

      {fields.isLoading ? <Spinner /> : (
        <div className="mb-4 max-h-56 overflow-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <tbody>
              {/* Grouped by step, then sort order — the order a service provider actually sees,
                  and what the preview's drag-and-drop writes. A flat sortOrder list interleaved
                  the categories, so the table never matched the app. */}
              {orderedFields(fields.data ?? []).map((f, i, all) => (
                <tr key={f.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-3 py-2 font-medium text-gray-800">
                    {all[i - 1]?.category !== f.category && (
                      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                        {fieldCategoryLabel(f.category)}
                      </span>
                    )}
                    {f.fieldName}
                  </td>
                  <td className="px-3 py-2"><Badge>{fieldCategoryLabel(f.category)}</Badge></td>
                  <td className="px-3 py-2 text-gray-500">{f.fieldType}{f.isRequired ? ' • required' : ''}</td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => setForm({ id: f.id, fieldName: f.fieldName, fieldType: f.fieldType, fieldOptions: f.fieldOptions, category: f.category, isRequired: f.isRequired, sortOrder: f.sortOrder, dependsOnFieldId: f.dependsOnFieldId, dependsOnValue: f.dependsOnValue })} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-brand-600"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setPendingFieldDelete(f)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              ))}
              {fields.data?.length === 0 && <tr><td className="px-3 py-6 text-center text-sm text-gray-400">No fields yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <form onSubmit={(e: FormEvent) => { e.preventDefault(); save.mutate(form); }} className="space-y-3 border-t border-gray-100 pt-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Field name"><Input value={form.fieldName ?? ''} required onChange={(e) => setForm((s) => ({ ...s, fieldName: e.target.value }))} /></Field>
          <Field label="Type">
            <Select value={form.fieldType ?? 'text'} onChange={(e) => setForm((s) => ({ ...s, fieldType: e.target.value }))} className="w-full">
              {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
        </div>
        {form.fieldType === 'dropdown' && (
          <Field label="Options (comma-separated)"><Input value={form.fieldOptions ?? ''} placeholder="e.g. Small, Medium, Large" onChange={(e) => setForm((s) => ({ ...s, fieldOptions: e.target.value }))} /></Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <Select value={form.category ?? 'basic_details'} onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))} className="w-full">
              {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
          </Field>
          <Field label="Sort order"><Input type="number" value={form.sortOrder ?? ''} onChange={(e) => setForm((s) => ({ ...s, sortOrder: e.target.value }))} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Show only if">
            <Select
              value={form.dependsOnFieldId ?? ''}
              onChange={(e) => setForm((s) => ({ ...s, dependsOnFieldId: e.target.value ? Number(e.target.value) : null, dependsOnValue: null }))}
              className="w-full"
            >
              <option value="">Always shown</option>
              {(fields.data ?? []).filter((f) => f.id !== form.id).map((f) => (
                <option key={f.id} value={f.id}>{f.fieldName}</option>
              ))}
            </Select>
          </Field>
          {form.dependsOnFieldId && (() => {
            const target = (fields.data ?? []).find((f) => f.id === form.dependsOnFieldId);
            const opts = target?.fieldType === 'boolean' ? ['true', 'false'] : (target ? optionsOf(target.fieldOptions) : []);
            return opts.length > 0 ? (
              <Field label="...equals">
                <Select value={form.dependsOnValue ?? ''} onChange={(e) => setForm((s) => ({ ...s, dependsOnValue: e.target.value }))} className="w-full">
                  <option value="">Select</option>
                  {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                </Select>
              </Field>
            ) : (
              <Field label="...equals">
                <Input value={form.dependsOnValue ?? ''} onChange={(e) => setForm((s) => ({ ...s, dependsOnValue: e.target.value }))} />
              </Field>
            );
          })()}
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input type="checkbox" checked={form.isRequired ?? false} onChange={(e) => setForm((s) => ({ ...s, isRequired: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-brand-500" /> Required
        </label>
        {err && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{err}</div>}
        <div className="flex justify-end gap-2">
          {form.id && <Button type="button" variant="ghost" onClick={() => setForm({ fieldType: 'text', isRequired: false, category: 'basic_details' })}>Clear</Button>}
          <Button type="button" variant="outline" onClick={() => setPreviewOpen(true)}>
            <Eye className="h-4 w-4" /> Preview
          </Button>
          <Button type="submit" loading={save.isPending}>{form.id ? 'Save field' : 'Add field'}</Button>
        </div>
      </form>

      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title={`Preview — ${subcategory.name}`}>
        <p className="mb-4 text-sm text-gray-500">
          How a service provider fills this in on their phone. Steps, order and conditional
          fields all come from what's configured here.
        </p>
        <OnboardingPreview
          fields={fields.data ?? []}
          onReorder={(ordered) => reorder.mutate(ordered)}
          saving={reorder.isPending}
        />
      </Modal>

      {pendingFieldDelete && (
        <ConfirmDialog
          open
          destructive
          title="Delete field"
          confirmLabel="Delete"
          loading={del.isPending}
          message={
            <>
              Remove the field{' '}
              <span className="font-semibold text-gray-900">“{pendingFieldDelete.fieldName}”</span> from this
              sub-category?
            </>
          }
          onConfirm={() => del.mutate(pendingFieldDelete.id, { onSettled: () => setPendingFieldDelete(null) })}
          onClose={() => setPendingFieldDelete(null)}
        />
      )}
    </Modal>
  );
}
