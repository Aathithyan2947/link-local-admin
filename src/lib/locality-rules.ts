// Mirrors the backend's locality rules (link-local-backend/src/lib/localityText.ts) so the
// Add Locality form flags problems as you type; the backend still enforces them.

const ALLOWED = /^[\p{L}\p{M}\p{N} .,'&()/#-]+$/u;
const HAS_LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;

export const LOCALITY_LIMITS = { complex: 80, text: 100 } as const;

/** Trims and collapses runs of spaces — what the backend stores. */
export const normalizeLocality = (v: string) => v.trim().replace(/\s+/g, ' ');

/** The problem with a locality text value, or null when it's fine. */
export function localityError(label: string, value: string | undefined, max: number): string | null {
  const v = normalizeLocality(value ?? '');
  if (!v) return `${label} is required`;
  if (v.length < 2) return `${label} must be at least 2 characters`;
  if (v.length > max) return `${label} must be at most ${max} characters`;
  if (!ALLOWED.test(v)) return `${label}: only letters, numbers, spaces and . , ' & ( ) / - # are allowed`;
  if (!HAS_LETTER_OR_DIGIT.test(v)) return `${label} must include a letter or number`;
  return null;
}

/** An Indian PIN code: six digits, not starting with 0. */
export function pincodeError(value: string | undefined): string | null {
  const v = (value ?? '').replace(/\s/g, '');
  if (!v) return 'Pincode is required';
  return /^[1-9]\d{5}$/.test(v) ? null : "Pincode must be 6 digits and can't start with 0";
}
