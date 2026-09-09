/**
 * Map をキャッシュとして使い、キーに対応する値がなければ fetch() の結果を格納してから返す。
 * 値そのものではなく実行中の Promise をキャッシュするため、同じキーの fetch が同時に走っても
 * 呼び出しは1回で済む。失敗した Promise はキャッシュから取り除き、次の呼び出しで再試行できる
 * ようにする。
 *
 * 値の型 `V` は `undefined`/`null` を含めない（`V extends {}`）。「未キャッシュ」の判定に
 * `cache.get()` が返す `undefined` を使うため、`undefined` 自体を正当な値として持てる
 * キャッシュでは毎回 fetch が走ってしまうことを、型の側で防いでいる。
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

/** キャッシュキーに使える引数の型。`join()`で文字列にできるものだけを受け付ける */
export type CacheKeyPart = string | number

/**
 * 読み取り1つをキャッシュ付きの関数にする。キーは引数から機械的に組み立てるので、呼び出し側が
 * テンプレート文字列を手書きしなくてよい。読み取りごとに`Map`を分けるため、別の読み取りとの
 * キー衝突は起こらない。`mapWithConcurrency`等により同じキーの問い合わせが同時に来ることが
 * あるため、値ではなく実行中のPromiseを共有する`getOrFetchShared()`を使う。
 *
 * 値を箱に入れてから載せるのは、`getOrFetchShared()`が「未キャッシュ」の判定に`undefined`を
 * 使うため。箱越しなら`undefined`を返す読み取りもそのまま載せられる。
 */
export function cacheByArgs<A extends readonly CacheKeyPart[], V>(
  read: (...args: A) => Promise<V>,
): (...args: A) => Promise<V> {
  const store = new Map<string, Promise<{ readonly value: V }>>()
  return async (...args: A) => {
    const boxed = await getOrFetchShared(store, toCacheKey(args), async () => ({
      value: await read(...args),
    }))
    return boxed.value
  }
}

/**
 * 引数からキャッシュキーを組み立てる。区切りにヌル文字を使うのは、通常の文字列引数
 * （IDやパス、名前など）にほぼ現れない制御文字だから（区切りが値の中に現れると、引数の
 * 切れ目が違う組み合わせが同じキーになる）。
 */
function toCacheKey(args: readonly CacheKeyPart[]): string {
  return args.join("\0")
}
