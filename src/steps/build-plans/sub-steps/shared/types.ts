import type { ValuesYamlDraft } from "./values-yaml-draft.js"

/**
 * 1アプリ分の書き換え箇所（target）を1つずつ処理する間のアキュムレータ。
 *
 * イメージタグ側とHelm向き先ブランチ側で`updates`の要素型だけが違うため、型引数`U`で共有する。
 * `draft`は設定ユニット単位で引き継ぐ。
 */
export type StageUpdatesAcc<U> = {
  readonly draft: ValuesYamlDraft
  readonly updates: readonly U[]
}
