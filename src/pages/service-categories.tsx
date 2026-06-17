import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, SlidersHorizontal, ChevronRight } from 'lucide-react';
import { api, apiError, type ApiResponse } from '@/lib/api';
import { PageHeader } from '@/components/layout/app-layout';
import { Badge, Card, Spinner } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const FIELD_TYPES = ['text', 'number', 'date', 'dropdown', 'boolean'];

const list = (endpoint: string, params: Record<string, unknown>) =>
  api.get<ApiResponse<Row[]>>(endpoint, { params: { pageSize: 100, ...params } }).then((r) => r.data.data);

export function ServiceCategoriesPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Row | null>(null);

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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['svc-cats'] }); setSelected(null); },
  });

  // ── Subcategory modal ──
  const [subModal, setSubModal] = useState(false);
  const [subForm, setSubForm] = useState<Row>({});
  const [subErr, setSubErr] = useState<string | null>(null);
  const saveSub = useMutation({
    mutationFn: (f: Row) => {
      const body = { categoryId: selectedId, name: f.name, isActive: f.isActive ?? true };
      return f.id ? api.patch(`/masters/service-subcategories/${f.id}`, { name: f.name, isActive: f.isActive }) : api.post('/masters/service-subcategories', body);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['svc-subs', selectedId] }); qc.invalidateQueries({ queryKey: ['svc-cats'] }); setSubModal(false); },
    onError: (e) => setSubErr(apiError(e)),
  });
  const delSub = useMutation({
    mutationFn: (id: number) => api.delete(`/masters/service-subcategories/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['svc-subs', selectedId] }); qc.invalidateQueries({ queryKey: ['svc-cats'] }); },
  });

  // ── Onboarding fields modal (per subcategory) ──
  const [fieldsFor, setFieldsFor] = useState<Row | null>(null);

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
                    <button onClick={(e) => { e.stopPropagation(); if (confirm(`Delete category "${c.name}"?`)) delCat.mutate(c.id); }} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
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
                        <th className="px-4 py-2.5 text-left font-semibold">Status</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Onboarding fields</th>
                        <th className="px-4 py-2.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {(subs.data ?? []).map((s) => (
                        <tr key={s.id} className="border-b border-gray-50 last:border-0">
                          <td className="px-4 py-2 font-medium text-gray-900">{s.name}</td>
                          <td className="px-4 py-2">{s.isActive === false ? <Badge>Inactive</Badge> : <Badge tone="success">Active</Badge>}</td>
                          <td className="px-4 py-2 text-right">
                            <Button size="sm" variant="outline" onClick={() => setFieldsFor(s)}>
                              <SlidersHorizontal className="h-4 w-4" /> Fields
                            </Button>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <button onClick={() => openSubEdit(s)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-brand-600"><Pencil className="h-4 w-4" /></button>
                            <button onClick={() => { if (confirm(`Delete sub-category "${s.name}"?`)) delSub.mutate(s.id); }} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
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
    </div>
  );
}

// ── Per-subcategory onboarding fields manager ──
function FieldsModal({ subcategory, onClose }: { subcategory: Row; onClose: () => void }) {
  const qc = useQueryClient();
  const subId = subcategory.id;
  const key = ['subcat-fields', subId];
  const fields = useQuery({ queryKey: key, queryFn: () => list('/masters/subcategory-fields', { subcategoryId: subId }) });

  const [form, setForm] = useState<Row>({ fieldType: 'text', isRequired: false });
  const [err, setErr] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: (f: Row) => {
      const body: Row = {
        subcategoryId: subId,
        fieldName: f.fieldName,
        fieldType: f.fieldType || 'text',
        isRequired: f.isRequired ?? false,
        sortOrder: f.sortOrder ? Number(f.sortOrder) : 0,
      };
      if (f.fieldType === 'dropdown' && f.fieldOptions) body.fieldOptions = f.fieldOptions;
      return f.id
        ? api.patch(`/masters/subcategory-fields/${f.id}`, { fieldName: body.fieldName, fieldType: body.fieldType, isRequired: body.isRequired, sortOrder: body.sortOrder, fieldOptions: body.fieldOptions })
        : api.post('/masters/subcategory-fields', body);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); setForm({ fieldType: 'text', isRequired: false }); setErr(null); },
    onError: (e) => setErr(apiError(e)),
  });
  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/masters/subcategory-fields/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return (
    <Modal open onClose={onClose} title={`Onboarding fields — ${subcategory.name}`}>
      <p className="mb-3 text-sm text-gray-500">Extra questions service providers answer for this sub-category during onboarding.</p>
      {fields.isLoading ? <Spinner /> : (
        <div className="mb-4 max-h-56 overflow-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <tbody>
              {(fields.data ?? []).map((f) => (
                <tr key={f.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-3 py-2 font-medium text-gray-800">{f.fieldName}</td>
                  <td className="px-3 py-2 text-gray-500">{f.fieldType}{f.isRequired ? ' • required' : ''}</td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => setForm({ id: f.id, fieldName: f.fieldName, fieldType: f.fieldType, fieldOptions: f.fieldOptions, isRequired: f.isRequired, sortOrder: f.sortOrder })} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-brand-600"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => del.mutate(f.id)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
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
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input type="checkbox" checked={form.isRequired ?? false} onChange={(e) => setForm((s) => ({ ...s, isRequired: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-brand-500" /> Required
          </label>
          <Field label="Sort order"><Input type="number" value={form.sortOrder ?? ''} onChange={(e) => setForm((s) => ({ ...s, sortOrder: e.target.value }))} className="w-24" /></Field>
        </div>
        {err && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{err}</div>}
        <div className="flex justify-end gap-2">
          {form.id && <Button type="button" variant="ghost" onClick={() => setForm({ fieldType: 'text', isRequired: false })}>Clear</Button>}
          <Button type="submit" loading={save.isPending}>{form.id ? 'Save field' : 'Add field'}</Button>
        </div>
      </form>
    </Modal>
  );
}
