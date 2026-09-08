import type { AppConfig, BranchName, ParsedTag, TagName } from "../../../../types/types.js"
import type { ValuesYamlDraft } from "./values-yaml-draft.js"

/**
 * 指定ブランチがchartリポジトリに実在するかを返す関数。`build-plans.ts`側でバッチ単位の
 * キャッシュ（`GitlabBatchCache`）とchartのprojectIdを閉じ込めて組み立てるため、サブステップ側は
 * キャッシュの存在を知らずにブランチの実在確認だけを依頼できる。
 */
export type BranchExists = (branch: BranchName) => Promise<boolean>

/**
 * 1アプリ分の書き換え箇所（target）を1つずつ処理する間のアキュムレータ。イメージタグ側と
 * Helm向き先ブランチ側で`updates`の要素型だけが違うため、型引数`U`で共有する。
 * `draft`はchartAndApps単位で引き継ぐ。
 */
export type StageUpdatesAcc<U> = {
  readonly draft: ValuesYamlDraft
  readonly updates: readonly U[]
}

/**
 * 1アプリ分の「最新タグの判定結果」。`resolve-latest-tags.ts`が組み立て、イメージタグの
 * 差分判定（`stage-image-tag-updates.ts`）が使う。
 *
 * `tag`が`undefined`なのは「最新タグが決まらなかった」場合で、タグを自動作成しない命名規則
 * （`semver`モード、`{time}`を含まないテンプレート）で追跡ブランチのHEADにタグが1件も
 * 無いときに起きる。そのappはこの実行では更新せず、同じ設定ユニットの他のappは通常どおり
 * 処理する（chartAndApps全体をERRORにはしない）。
 *
 * `trackedHeadTagNames`は、「現在の追跡ブランチ由来（＝現在の`branchToSync`と`tagNaming`で
 * パースできる）で、かつ追跡ブランチの現在のHEADコミットを指すタグ名」の集合。values.yamlに
 * 書かれている現在値がこの集合に含まれるなら、たとえより新しい名前のタグが存在しても
 * デプロイされる中身は変わらないため更新しない。追跡ブランチを切り替えた直後は、
 * 切り替え前のタグ名がこの集合に含まれない（現在の追跡ブランチ由来ではないため）ので、
 * HEADと同じコミットを指していてもスキップされない。
 */
export type LatestTagResolution = {
  readonly tag: ParsedTag | undefined
  readonly trackedHeadTagNames: ReadonlySet<TagName>
}

/**
 * アプリと、そのアプリについて解決済みの最新タグの対。`resolve-latest-tags.ts`が組み立て、
 * `stage-image-tag-updates.ts`が受け取る。対にして渡すことで、後段はどのタグがどのアプリの
 * ものかを引き当て直さずに済む。
 */
export type AppWithLatestTag = {
  readonly app: AppConfig
  readonly latestTag: LatestTagResolution
}
