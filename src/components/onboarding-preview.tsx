import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Image as ImageIcon, MapPin, Upload, CalendarClock, Store, GripVertical } from 'lucide-react';

/**
 * The SP's onboarding flow as they'll see it on a phone, rendered from this sub-category's
 * configured fields.
 *
 * MIRRORS the Flutter renderer in
 * `app/lib/features/services/presentation/category_fields_form_screen.dart` — the
 * `_fieldWidget` switch, the step chain in `onboardingCategories`/`pushOnboardingStep`, and
 * the `_isVisible` dependency rule. Adding a field type means updating BOTH this map and
 * that switch, or the preview quietly stops matching the app.
 *
 * Interactive but never saves: you need to type into a controlling field to see its dependent
 * field appear, which is most of the reason to preview at all.
 */

type Field = Record<string, any>;

// Same fixed order and labels the app uses.
const CATEGORY_ORDER = ['basic_details', 'travel', 'payment', 'service_type', 'delivery'];
const CATEGORY_LABELS: Record<string, string> = {
  basic_details: 'Basic Details',
  travel: 'Travel',
  payment: 'Payment & Fee',
  service_type: 'Service Type',
  delivery: 'Delivery',
};

/** Matches Dart's `_options`: a JSON array if it parses, else comma-separated. */
function parseOptions(raw?: string | null): string[] {
  if (!raw?.trim()) return [];
  try {
    const decoded = JSON.parse(raw);
    if (Array.isArray(decoded)) return decoded.map(String);
  } catch {
    // not JSON — fall through
  }
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

/** The app prefills these from the SP's account; shown here so the flow reads the same. */
const PREFILLED = [/phone|mobile/i, /email/i, /name/i];
const isPrefilled = (f: Field) =>
  f.category === 'basic_details' && PREFILLED.some((re) => re.test(f.fieldName ?? ''));

const isMarker = (f: Field) => f.fieldType === 'menu' || f.fieldType === 'booking';

export function OnboardingPreview({
  fields,
  onReorder,
  saving,
}: {
  fields: Field[];
  /** Persists a step's new sequence. Given every field in that step, in its new order. */
  onReorder?: (ordered: Field[]) => void;
  saving?: boolean;
}) {
  const steps = useMemo(() => {
    const present = new Set(fields.map((f) => f.category));
    return CATEGORY_ORDER.filter((c) => present.has(c));
  }, [fields]);

  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<number, string>>({});
  const [reordering, setReordering] = useState(false);
  // Working copy of the current step's order while dragging; null = follow the server.
  const [draft, setDraft] = useState<Field[] | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);

  // A save (or switching steps) drops the draft so we track the server again.
  useEffect(() => setDraft(null), [step, fields]);

  if (steps.length === 0) {
    return (
      <p className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
        No fields configured yet — add one to see the flow.
      </p>
    );
  }

  const category = steps[Math.min(step, steps.length - 1)];
  const inStep =
    draft ??
    fields
      .filter((f) => f.category === category)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const move = (from: number, to: number) => {
    if (from === to) return;
    const next = [...inStep];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDraft(next);
  };
  const dirty = draft !== null && draft.some((f, i) => f.id !== (
    fields.filter((x) => x.category === category).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))[i]?.id
  ));

  // Same rule as Dart's `_isVisible`, including the quirk that a dependency on a field in a
  // DIFFERENT category can never be satisfied — the app only has controllers for the current
  // step, so such a field stays hidden forever. Surfaced below rather than hidden.
  const visible = inStep.filter((f) => {
    if (!f.dependsOnFieldId) return true;
    const controller = inStep.find((x) => x.id === f.dependsOnFieldId);
    if (!controller) return false;
    return (values[controller.id] ?? '') === f.dependsOnValue;
  });
  const orphanDeps = inStep.filter(
    (f) => f.dependsOnFieldId && !inStep.some((x) => x.id === f.dependsOnFieldId),
  );

  const set = (id: number, v: string) => setValues((s) => ({ ...s, [id]: v }));
  const isLast = step >= steps.length - 1;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex w-full items-center justify-center gap-1.5">
        {steps.map((c, i) => (
          <button
            key={c}
            onClick={() => setStep(i)}
            className={`h-1.5 flex-1 rounded-full transition ${i <= step ? 'bg-brand-500' : 'bg-gray-200'}`}
            title={CATEGORY_LABELS[c]}
          />
        ))}
      </div>

      {onReorder && (
        <div className="flex w-full items-center justify-between gap-2">
          <button
            onClick={() => { setReordering((r) => !r); setDraft(null); }}
            className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
              reordering ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            {reordering ? 'Done reordering' : 'Reorder fields'}
          </button>
          {reordering && dirty && (
            <button
              disabled={saving}
              onClick={() => onReorder(inStep)}
              className="rounded-lg bg-brand-500 px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save order'}
            </button>
          )}
        </div>
      )}

      {/* phone frame */}
      <div className="w-[320px] overflow-hidden rounded-[2rem] border-8 border-gray-900 bg-white shadow-xl">
        <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
          <ChevronLeft className="h-4 w-4 text-gray-700" />
          <span className="text-sm font-semibold text-gray-900">{CATEGORY_LABELS[category] ?? category}</span>
        </div>

        <div className="h-[430px] space-y-4 overflow-auto px-4 py-4">
          {reordering ? (
            <>
              <p className="text-[11px] text-gray-400">
                Drag to set the order service providers see. Conditional fields are shown here
                too, so they keep their place.
              </p>
              {inStep.map((f, i) => (
                <div
                  key={f.id}
                  draggable
                  onDragStart={() => setDragFrom(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => { if (dragFrom !== null) move(dragFrom, i); setDragFrom(null); }}
                  onDragEnd={() => setDragFrom(null)}
                  className={`flex cursor-grab items-center gap-2 rounded-xl border px-2.5 py-2 ${
                    dragFrom === i ? 'border-brand-400 bg-brand-50 opacity-60' : 'border-gray-200 bg-white'
                  }`}
                >
                  <GripVertical className="h-4 w-4 shrink-0 text-gray-300" />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-gray-800">{f.fieldName}</p>
                    <p className="text-[11px] text-gray-400">
                      {f.fieldType}
                      {f.isRequired && !isMarker(f) ? ' • required' : ''}
                      {f.dependsOnFieldId ? ' • conditional' : ''}
                    </p>
                  </div>
                </div>
              ))}
            </>
          ) : (
          <>
          {visible.length === 0 && (
            <p className="py-10 text-center text-sm text-gray-400">
              No fields configured for {CATEGORY_LABELS[category]} yet.
            </p>
          )}
          {visible.map((f) => (
            <div key={f.id}>
              <label className="mb-1.5 block text-[13px] font-semibold text-gray-800">
                {f.fieldName}
                {f.isRequired && !isMarker(f) && <span className="text-red-500"> *</span>}
              </label>
              <PreviewInput field={f} value={values[f.id] ?? ''} onChange={(v) => set(f.id, v)} />
              {isPrefilled(f) && !values[f.id] && (
                <p className="mt-1 text-[11px] text-gray-400">From your account</p>
              )}
            </div>
          ))}
          </>
          )}
        </div>

        <div className="border-t border-gray-100 p-3">
          <button
            onClick={() => setStep((s) => Math.min(s + 1, steps.length - 1))}
            disabled={isLast}
            className="h-11 w-full rounded-xl bg-brand-500 text-sm font-semibold text-white disabled:opacity-40"
          >
            {isLast ? 'Confirm' : 'Next'}
          </button>
        </div>
      </div>

      {orphanDeps.length > 0 && (
        <p className="max-w-[340px] rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
          <strong>{orphanDeps.map((f) => f.fieldName).join(', ')}</strong> depend
          {orphanDeps.length === 1 ? 's' : ''} on a field in another step, so the app can never
          show {orphanDeps.length === 1 ? 'it' : 'them'}. Move the fields into the same step.
        </p>
      )}
      <p className="text-[11px] text-gray-400">Interactive preview — nothing is saved.</p>
    </div>
  );
}

/** One field, rendered the way the app renders it. */
function PreviewInput({ field: f, value, onChange }: { field: Field; value: string; onChange: (v: string) => void }) {
  const box = 'w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] outline-none focus:border-brand-400';

  switch (f.fieldType) {
    case 'menu':
    case 'booking': {
      const menu = f.fieldType === 'menu';
      return (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
          <p className="text-[12px] text-gray-500">
            {menu ? 'Add the items residents can order from you.' : 'Set the days and times residents can book.'}
          </p>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-brand-500 px-3 py-1.5 text-[12px] font-medium text-brand-600">
            {menu ? <Store className="h-3.5 w-3.5" /> : <CalendarClock className="h-3.5 w-3.5" />}
            {menu ? 'Manage items' : 'Set availability'}
          </span>
        </div>
      );
    }
    case 'dropdown':
      return (
        <select className={box} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select</option>
          {parseOptions(f.fieldOptions).map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      );
    case 'boolean':
      return (
        <button
          onClick={() => onChange(value === 'true' ? 'false' : 'true')}
          className={`h-6 w-11 rounded-full transition ${value === 'true' ? 'bg-brand-500' : 'bg-gray-300'}`}
        >
          <span className={`block h-5 w-5 rounded-full bg-white transition ${value === 'true' ? 'ml-5' : 'ml-0.5'}`} />
        </button>
      );
    case 'date':
      return <input type="date" className={box} value={value} onChange={(e) => onChange(e.target.value)} />;
    case 'number':
      return (
        <input type="number" inputMode="numeric" className={box} placeholder={f.fieldName}
               value={value} onChange={(e) => onChange(e.target.value)} />
      );
    case 'file':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-[12px] text-gray-600">
          <Upload className="h-3.5 w-3.5" /> Upload {f.fieldName}
        </span>
      );
    case 'image':
      return (
        <div className="flex h-28 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-[12px] text-gray-400">
          <ImageIcon className="mr-1.5 h-4 w-4" /> Upload photo
        </div>
      );
    case 'pincode':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 px-3 py-1 text-[12px] text-gray-600">
          <MapPin className="h-3.5 w-3.5" /> Add area
        </span>
      );
    default: // text
      return (
        <input className={box} placeholder={f.fieldName} value={value} onChange={(e) => onChange(e.target.value)} />
      );
  }
}
