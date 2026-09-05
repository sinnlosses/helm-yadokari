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

/**
 * `getOrFetch()` の並列実行版。値ではなく実行中の Promise をキャッシュするため、同じキーの
 * fetch が同時に走っても呼び出しは1回で済む（値をキャッシュする `getOrFetch()` は、
 * 1件目が解決する前に始まった2件目が未キャッシュと判定して二重に fetch してしまう）。
 * 失敗した Promise はキャッシュから取り除き、次の呼び出しで再試行できるようにする。
 */
export function getOrFetchShared<K, V extends {}>(
  cache: Map<K, Promise<V>>,
  key: K,
  fetch: () => Promise<V>,
): Promise<V> {
  const cached = cache.get(key)
  if (cached !== undefined) return cached
  const pending = fetch().catch((err: unknown) => {
    cache.delete(key)
    throw err
  })
  cache.set(key, pending)
  return pending
}
