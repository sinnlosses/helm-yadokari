/**
 * `items` を先頭から1つずつ順番に処理し、非同期のアキュムレータを積み上げる
 * （`Array.prototype.reduce` の非同期版）。前の要素の結果を次の要素の処理に引き継ぐため、
 * `parallel.ts` の `mapWithConcurrency()` と違って並列化はしない。
 *
 * キャッシュや累積結果を要素間で共有する必要があり、順序が意味を持つ場面で使う。
 */
export async function reduceAsync<T, Acc>(
  items: readonly T[],
  initial: Acc,
  fn: (acc: Acc, item: T) => Promise<Acc>,
): Promise<Acc> {
  // 初期値は `Promise.resolve(initial)` ではなく async 関数の戻り値で作る
  // （`Promise.resolve()` の型は `Promise<Awaited<Acc>>` になり、ジェネリックな `Acc` のままでは
  //  `Promise<Acc>` に代入できないため。`as` を使わずに型を合わせるための書き方）
  const seed: Promise<Acc> = (async () => initial)()
  return items.reduce((accPromise, item) => accPromise.then((acc) => fn(acc, item)), seed)
}
