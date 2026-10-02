export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/** Canonical form is country code + national number, no plus. Indian mobiles become 91XXXXXXXXXX. */
export function normalizePhone(value: string): string {
  const digits = digitsOnly(value);
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  return digits;
}

export function formatPhone(value: string): string {
  const normalized = normalizePhone(value);
  if (normalized.length === 12 && normalized.startsWith('91')) {
    const local = normalized.slice(2);
    return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
  }
  if (!value.trim()) return '';
  return value.trim().startsWith('+') ? value.trim() : `+${normalized}`;
}

export function phonesMatch(left: string, right: string): boolean {
  const a = normalizePhone(left);
  const b = normalizePhone(right);
  if (a.length < 10 || b.length < 10) return false;
  if (a === b) return true;
  const tail = 10;
  return a.slice(-tail) === b.slice(-tail);
}

export function telUri(value: string): string {
  const normalized = normalizePhone(value);
  if (normalized.length >= 10) return `tel:+${normalized}`;
  return `tel:${digitsOnly(value)}`;
}

export function isPlausibleMobile(value: string): boolean {
  const normalized = normalizePhone(value);
  return normalized.length >= 12 && normalized.length <= 15;
}
