/**
 * Map をキャッシュとして使い、キーに対応する値がなければ fetch() の結果を格納してから返す。
 *
 * 値の型 `V` は `undefined`/`null` を含めない（`V extends {}`）。「未キャッシュ」の判定に
 * `cache.get()` が返す `undefined` を使うため、`undefined` 自体を正当な値として持てる
 * キャッシュでは毎回 fetch が走ってしまうことを、型の側で防いでいる。
 */
export async function getOrFetch<K, V extends {}>(
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
