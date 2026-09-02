import pLimit from "p-limit"

import { FatalError } from "./errors.js"

/**
 * items の各要素に対して fn を並列実行する（同時実行数は concurrencyLimit で制御）。
 * fn が FatalError をスローした場合は、その時点でキューをクリアして未着手の要素の
 * 実行を防いだ上で reject する。それ以外の例外はそのまま reject する。
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrencyLimit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const limit = pLimit(concurrencyLimit)
  const tasks = items.map((item) =>
    limit(async () => {
      try {
        return await fn(item)
      } catch (err) {
        if (err instanceof FatalError) limit.clearQueue()
        throw err
      }
    }),
  )
  return Promise.all(tasks)
}
