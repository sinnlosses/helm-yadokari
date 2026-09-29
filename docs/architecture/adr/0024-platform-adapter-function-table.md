# GitLab/GitHub の2実装は関数テーブル型`PlatformAdapter`で受け渡す

GitLabとGitHubの**両方に対応する。ただし1回の実行で混在はさせない**（ユーザー判断、2026-09-12）。

**語彙は`PlatformAdapter`。** `lib/platform/adapter.ts` に`steps/`が必要とするものを並べた `PlatformAdapter` 型を1つ置き、
`lib/gitlab/` と `lib/github/` がそれぞれその形の値を組み立てる。`steps/` は `PlatformAdapter` を
引数で受け取り、`lib/`配下のプラットフォーム実装を直接importしない。`buildTagUrl`・`buildCompareUrl`・
`isFatalError`・`extractHttpStatus`のようにネットワークI/Oを持たない純粋関数も載るので、
`ApiClient`系の名前は採らない。`src/lib/`を「外部システム・ファイル形式に依存するアダプタ」と呼ぶ
既存の語彙に合わせた形。

- **`forge`を採らなかった**。FOSS界隈では定着した語だが（Forgejo・ForgeFed）、GitHubとGitLab
  自身がその語で自称していない。`platform`は**このリポジトリのCIが既に動かしているRenovate**が
  `platform: "gitlab" | "github" | ...` として使っている語で、外部との一貫性の根拠が強い
- **関数テーブルという形は新しい発明ではない**。`CachedReads`（`readonly branchExists: (...) => Promise<boolean>`
  のような関数を並べたオブジェクト型）と同じ形で、`PlatformAdapter` はその席に座るだけ
- **`lib/platform/`は「置き場所を名前にしたファイル」ではない**（原則4）。`platform`はこのツールの
  ドメイン語彙（`docs/glossary.md`に載せる語）であって、`helpers`・`common`のような容れ物の名前ではない
- **`cached-reads.ts`は`lib/platform/`に置く。** どの読み取りをキャッシュしてよいかの
  選定（このツール自身の書き込みでバッチ中に値が変わらないか）はプラットフォーム非依存の判断で、
  GitLab固有の知識を持たない（`docs/architecture/adr/0009-platform-cache-in-lib-platform.md`）

採らなかった案:

- **`interface`と2クラス**。一般的な形だが、**このリポジトリに`interface`は0件**で、多態をクラスで
  作った前例も無い。既存の規約に無い仕組みを1つ増やすことになる
- **クライアント型のユニオン（`GitlabClient | GithubClient`）**。`steps/`の引数の形は変わらないが、
  **すべてのエントリの内部に実行時の分岐が入る**。分界面が関数の中に散り、「1関数＝1 API呼び出しの
  薄いラッパー」（`docs/architecture/adr/0011-branch-rebuild-in-substep.md`）が保てない
