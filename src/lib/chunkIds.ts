/** Divide listas para consultas `.in()` no PostgREST (evita URL enorme / Failed to fetch). */
export function chunkIds<T>(ids: T[], chunkSize = 80): T[][] {
  if (ids.length === 0) return [];
  const size = Math.max(1, chunkSize);
  const chunks: T[][] = [];
  for (let i = 0; i < ids.length; i += size) {
    chunks.push(ids.slice(i, i + size));
  }
  return chunks;
}
