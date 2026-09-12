# GitHub対応の調査（2026-09-12）

「GitLab前提の機能を、のちにGitHubでも使えるようにするなら何が要るか」を洗い出した記録。
**この時点では採用も着手も決まっていない。** 採用するなら反映先は
`docs/requirements.md`「2.2 対象外とすること」と `docs/architecture.md` の設計判断で、
このファイルはその根拠を残すためのもの。

## 調べた動機

ユーザーからの問い「GitLab前提の機能だけど、のちにGitHubでも使えるようにと考えたときの
対応を洗い出してくれる?」。実装の依頼ではなく、対応範囲と設計上の分界面の確認。

## 着手前の実測値

| 対象                                     | 値                                                                                 |
| ---------------------------------------- | ---------------------------------------------------------------------------------- |
| `src/lib/gitlab/`                        | 434行（`gitlab.ts` 226 / `errors.ts` 112 / `batch-cache.ts` 78 / `web-url.ts` 18） |
| 外部I/Oを持つ公開関数                    | `gitlab.ts` の13本（すべて1関数＝1 API呼び出しの薄いラッパー）                     |
| `GitlabClient` を引数に取るファイル      | 7（`lib/gitlab/` 2・`steps/` 5）                                                   |
| `projectId` の出現                       | 338（`src`+`scripts`+`test`）                                                      |
| `MergeRequest` / `mrTargetBranch` の出現 | 78 / 71                                                                            |
| gitbeaker依存のテスト                    | `test/lib/gitlab/` 690行                                                           |

`docs/architecture.md`「`lib/gitlab/` にはGitLabという外部システムを知っているものだけを置く」
節が、置き場所の判断軸を次のように既に明言している。今回の問いはこの軸が実際に機能するかの
検算でもある。

> **ライブラリを差し替えたときに書き換える範囲が `lib/gitlab/` に収まるかどうか**が判断の軸

検算の結果は「おおむね収まるが、3つ漏れている」。

## 分界面の外に漏れているもの

`lib/gitlab/` を差し替えるだけでは済まず、呼び出し側まで波及する3点。**着手するならここが先**。

- **`ProjectId = number`**（`src/types/brand.ts`）— GitHubのREST APIは `owner/repo` で資源を指す。
  数値のブランド型のままでは表せない。`registry.yaml` / `config.yaml` の `projectId` が
  `z.number().int()`（`src/lib/config/schema.ts`）なので、**設定ファイルの破壊的変更**を伴う
- **`GitLabUrl` ブランド型**（`src/types/brand.ts`）— `types/types.ts` の `PipelineInfo.webUrl`、
  `lib/env.ts` の `gitlabUrl`、`steps/apply-updates/sub-steps/build-mr-content.ts` が使う。
  名前と意味の両方がGitLab前提
- **`PipelineInfo`** — GitLabのpipelineに対してGitHubはActionsのworkflow run。後述のとおり
  問い合わせキーがタグ名から `head_sha` に変わるため、`lib/gitlab/batch-cache.ts` の
  キャッシュキーと呼び出し側が持つ値まで変わる（分界面の内側では吸収できない）

## 一次情報

### 複数ファイルを1コミットにする方法

GitLabは1呼び出しで済む。`POST /projects/:id/repository/commits` が `actions[]` を受け、
`branch`（コミット先）と `start_branch`（親）を同時に渡せばブランチ作成も同じ呼び出しに入る。

<https://docs.gitlab.com/api/commits/>

> Name of the branch to use as the parent for the new commit. If not provided and `start_sha`
> is also not provided, defaults to the value of `branch`. Mutually exclusive with `start_sha`.

GitHubに**等価のエンドポイントは無い**。Git Data APIで4呼び出しに分解する
（`git.getRef` → `git.createTree` → `git.createCommit` → `git.createRef`）。
ツリー作成は複数ファイルをインラインの `content` で一度に渡せるので、ファイル数は増えない。

<https://docs.github.com/en/rest/git/trees>

> creates a new Git tree object from entries in the Git tree object pointed to by `base_tree`
> and entries defined in the `tree` parameter

代替案の `PUT /repos/{owner}/{repo}/contents/{path}` は**1ファイル＝1コミット**になるため使えない。
`docs/architecture.md`「MRの単位は `(chartリポジトリ, 設定ユニット)`」が前提にしている
「1MRは1コミット」が崩れる。

### ファイル内容の取得サイズ

<https://docs.github.com/en/rest/repos/contents>

1MB以下は現在と同じ扱いでよいが、1MBを超えると

> the content field will be an empty string and the encoding field will be `none`

となり、raw media type かGit Blobs/Trees APIへの切り替えが要る。100MB超は非対応。
GitLabの `RepositoryFiles.show` にはこの段差が無いため、`getFileContent()` に分岐が増える。

### レート制限とエラーの意味

<https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api>

> All of these requests count towards your personal rate limit of 5,000 requests per hour.

> If you exceed your primary rate limit, you will receive a `403` or `429` response

> If the `retry-after` response header is present, you should not retry your request until
> after that many seconds has elapsed.

**現在の `errors.ts` の403の扱いと衝突する。** 今は「トークンが特定プロジェクトへのアクセス権を
持たない場合」として非fatal・非リトライに倒しているが、GitHubでは403がレート制限の合図に
なるため、`retry-after` を見てリトライする経路が要る。

認証まわりも意味が変わる。

<https://docs.github.com/en/rest/authentication/authenticating-to-the-rest-api>

> If you try to use a REST API endpoint without a token or with a token that has insufficient
> permissions, you will receive a `404 Not Found` or `403 Forbidden` response.

権限不足が404で返りうるため、`projectExists()`（404のときだけ false）が
「権限が無い」を「存在しない」と報告する。GitLabでは403で区別できていた。

### `GITHUB_TOKEN` で作ったPRはCIを起こさない

<https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows>

> When a pull request is created or updated by a workflow using `GITHUB_TOKEN`,
> `pull_request` events with the `opened`, `synchronize`, or `reopened` activity types
> create workflow runs that require approval.

> With the exception of `workflow_dispatch` and `repository_dispatch`, other
> `GITHUB_TOKEN`-triggered events do not create workflow runs at all.

chartリポジトリ側のCIを回したいなら、PAT（fine-grained: `contents:write` + `pull_requests:write`）
かGitHub Appが実質必須になる。GitLab CIの `ACCESS_TOKEN` を Protected: OFF で登録する現在の
運用（`README.md`「CI/CD」）と対応する注意点。

## 13関数の移植難度

1:1で置き換えられるのは8本（`createClient`・`projectExists`・`branchExists`・`deleteBranch`・
`getBranchHeadSha`・`getProjectWebUrl`・`createMergeRequest`・`openMergeRequestExists`）。
残り5本が手当てを要する。

| 関数                      | GitHub側                                                                                                                                                          |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `commitFileUpdates`       | 等価なし。Git Data APIで4呼び出しに分解（上記）                                                                                                                   |
| `createTag`               | `git.createRef` は**コミットSHA必須**。現在はブランチ名を ref に渡しているため、呼び出し側（`resolve-latest-tags.ts`）が既に持っている `headSha` を渡す形に変わる |
| `listTags`                | gitbeakerの `.all()` にあたる自動ページングが無い。`octokit.paginate` を明示する                                                                                  |
| `getFileContent`          | 1MBの段差（上記）                                                                                                                                                 |
| `getLatestPipelineForRef` | `GET /repos/{o}/{r}/actions/runs?head_sha=` 起点。タグ名では引けない（漏れている3点目と直結）                                                                     |

`web-url.ts` の2本はパス形式の差だけ（`/-/tags/X` → `/releases/tag/X`、
`/-/compare/a...b` → `/compare/a...b`）。

## 運用・ドキュメント側

- 環境変数: `GITLAB_URL` → `https://api.github.com` かGHESの `/api/v3`。名前も中立化が要る
- `docs/architecture.md`「`CONCURRENCY_LIMIT`はGitLab APIへの同時接続数の上限ではない」節の
  前提を見直す（GitHubは5,000req/hで、GitLabより上限の意識が要る）
- CI: `.gitlab-ci.yml` の pipeline schedules → `.github/workflows` の `schedule:`。
  `validate-config-remote` 相当のジョブも
- 用語: MR→PR。識別子で `MergeRequest` 78・`mrTargetBranch` 71（後者は**設定フィールド名**なので
  破壊的）、ドキュメントで `architecture.md` 119行・`requirements.md` 51行が該当
- テスト: `test/lib/gitlab/` 690行がgitbeakerのエラー形状（`cause.response.status`・
  `GitbeakerTimeoutError`・`GitbeakerRetryError`）に依存

## 推奨案

**新しいインターフェースやクラスを足さず、`lib/gitlab/` の13関数のシグネチャをそのまま
ポートの実体と見なして `lib/github/` を並べ、`main.ts` が環境変数で選ぶ。**

13関数は既に全部「1関数＝1 API呼び出し」の薄いラッパーで、`steps/` 側はクライアント型を
引数で受け取るだけ。抽象を新設するより、既存の規約の空いている席に座らせるほうが
CLAUDE.md 原則2（`lib/` は依存対象だけで決める）と原則4（置き場所を名前にしたファイルを作らない）に
沿う。

### 採らなかった案

- **`Forge` インターフェースを新設して2実装をぶら下げる** — 13関数ぶんのインターフェース宣言が
  増えるだけで、呼び出し側の書き換え量は変わらない。このリポジトリに `interface` で多態を
  作っている前例が無い
- **GitHub用に別ツールとしてフォークする** — `domain/`（タグ形式・固定ブランチ名）と
  `lib/config/`・`lib/helm.ts` は完全に共通で、ここが実装の大半を占める。二重管理になる

### 着手するなら最小の一歩

漏れている3点のうち `ProjectId` の中立化だけを切り出して、`owner/repo` も表せる形にしたときに
呼び出し側338箇所が本当に無傷で済むかを測る。ここが通らなければ残りを進めても意味がない。

## ProjectId 中立化の計測（2026-09-12）

上の「分界面の外に漏れているもの」の1点目を実際に測った記録。**採否はまだ決めていない。**

### 測り方と選んだ候補

`ProjectId` を `string` のブランド型に差し替え（`toProjectId(s: string)`）、`pnpm tsc --noEmit`
（対象は `src` / `test` / `scripts`）で壊れる箇所を数えた。実験の変更はコミットせず戻してある。

この候補を選んだ根拠は既存の規約。`src/types/brand.ts` のブランド型14個のうち**13個が `string`
由来で、`number` 由来は `ProjectId` ただ1つ**。加えて `projectId` を値として触っている箇所は
Map / Set のキーとテンプレート文字列だけで（`lib/config/validate.ts` 5・
`lib/config/load-config-unit.ts` 3・`steps/build-plans/sub-steps/resolve-latest-tags.ts` 1）、
算術も大小比較も無い。gitbeakerの各APIもproject idに `string | number` を受ける。
**`"1001"` と `"owner/repo"` を同じ型に載せれば呼び出し側は無傷のはず**、というのが検証した仮説。

### 結果: 型エラー55件、うち実質的な争点は3件

| 分類                                     | 件数  | 場所                                                                                                                                                 |
| ---------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 外部仕様（YAMLの書式）に触れる           | **3** | `src/lib/config/schema.ts` の `AppSpecSchema`・`RegistryYamlSchema.chartToUpdate`・`AppSchema`（いずれも `z.number().int().transform(toProjectId)`） |
| 型エラーが出るだけ（機械的置換で消える） | 52    | `test/` 8ファイル（`lib/gitlab/gitlab.test.ts` 26 ほか）                                                                                             |
| 数値であることに依存したロジック         | **0** | 該当なし                                                                                                                                             |

**`src/` の非テストコードで壊れたのは `schema.ts` の3箇所だけ。** `steps/`・`lib/gitlab/`・
`domain/`・`utils/` は1件も壊れなかった。仮説どおり、Mapのキーと文字列補間はそのまま通る。

52件が機械的であることは実測で確かめた。`toProjectId(<数値>)` → `toProjectId("<数値>")` の
一括置換で55→10件、`projectId === <数値>`（モック内の分岐条件）の同種の置換で10→3件になり、
**残るのは `schema.ts` の3件だけ**になる。

### 残る争点

`schema.ts` の3件は型の問題ではなく**設定ファイルの書式の問題**。YAMLの `projectId: 100` は
数値として読まれるため、`z.number().int()` のままでは `string` のブランド型に渡せない。
取りうる形は「YAML側を文字列に統一する（`projectId: "100"`）」か
「スキーマで両方受けて文字列へ寄せる」かで、**前者は `config/` の破壊的変更**になる。
どちらを採るかはGitHub対応そのものの採否と一緒に決める事項で、この計測の範囲外。

### 結論

**`ProjectId` の中立化は、呼び出し側への波及という意味では障害にならない。** 当初「338箇所」と
見積もった影響は、実際には設定スキーマの3箇所と、テストの機械的置換に分解できる。
GitHub対応を見送る理由がここに無いことは確かめられた。
