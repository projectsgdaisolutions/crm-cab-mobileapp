export function makeId(prefix: string): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const noise = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${stamp}${noise}`;
}
