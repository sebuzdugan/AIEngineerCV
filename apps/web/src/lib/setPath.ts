/** Immutably set a dot-path on a plain object, returning a shallow-cloned copy. */
export function withPath<T extends object>(obj: T, path: string, value: unknown): T {
  const keys = path.split('.');
  const clone: Record<string, unknown> = { ...(obj as Record<string, unknown>) };
  let cur = clone;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i]!;
    cur[k] = { ...(typeof cur[k] === 'object' && cur[k] ? (cur[k] as Record<string, unknown>) : {}) };
    cur = cur[k] as Record<string, unknown>;
  }
  cur[keys[keys.length - 1]!] = value;
  return clone as T;
}
