/**
 * Map をキャッシュとして使い、キーに対応する値がなければ fetch() の結果を格納してから返す。
 */
export async function getOrFetch<K, V>(
  cache: Map<K, V>,
  key: K,
  fetch: () => Promise<V>,
): Promise<V> {
  const cached = cache.get(key)
  if (cached !== undefined) return cached
  const value = await fetch()
  cache.set(key, value)
  return value
}
