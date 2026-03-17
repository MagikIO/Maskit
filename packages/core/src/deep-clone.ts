/**
 * Deep clone that preserves function references.
 * structuredClone cannot handle functions; this utility walks the
 * object graph, copies plain objects and arrays recursively, and
 * keeps everything else (functions, RegExp, Date, primitives) by reference.
 */
export function deepClone<T>(src: T): T {
  if (src === null || typeof src !== "object") return src;
  if (src instanceof Date) return new Date(src.getTime()) as T;
  if (src instanceof RegExp) return new RegExp(src.source, src.flags) as T;

  if (Array.isArray(src)) {
    const arr: unknown[] = new Array(src.length);
    for (let i = 0; i < src.length; i++) {
      arr[i] = deepClone(src[i]);
    }
    return arr as T;
  }

  const obj = Object.create(Object.getPrototypeOf(src)) as Record<
    string,
    unknown
  >;
  for (const key of Object.keys(src as Record<string, unknown>)) {
    obj[key] = deepClone((src as Record<string, unknown>)[key]);
  }
  return obj as T;
}
