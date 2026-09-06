/**
 * `partitionMap()` の振り分け結果。`left()`/`right()` で組み立てる。
 * どちらの側かをプロパティ名（`left`/`right`）自体で表すため、値の型が混ざらない。
 */
export type Sorted<L, R> = { readonly left: L } | { readonly right: R }

export function left<L>(value: L): { readonly left: L } {
  return { left: value }
}

export function right<R>(value: R): { readonly right: R } {
  return { right: value }
}

/**
 * `items` の各要素を `split()` の結果に従って2つの配列に振り分ける。`split()` は
 * 「どちらに入れるか」だけでなく「何を積むか」も `left()`/`right()` で返すため、
 * 判別可能ユニオンの配列を「中身を取り出しつつ2つのバケツに分ける」用途に使える。
 * どちらの配列も入力の順序を保つ。
 *
 * ```ts
 * const { left: targets, right: settled } = partitionMap(outcomes, (outcome) =>
 *   outcome.status === "ok" ? left(outcome.value) : right(outcome.result),
 * )
 * ```
 */
export function partitionMap<T, L, R>(
  items: readonly T[],
  split: (item: T) => Sorted<L, R>,
): { readonly left: L[]; readonly right: R[] } {
  return items.reduce<{ left: L[]; right: R[] }>(
    (acc, item) => {
      const sorted = split(item)
      return "left" in sorted
        ? { left: [...acc.left, sorted.left], right: acc.right }
        : { left: acc.left, right: [...acc.right, sorted.right] }
    },
    { left: [], right: [] },
  )
}
