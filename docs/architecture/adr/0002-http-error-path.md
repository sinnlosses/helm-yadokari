# HTTPエラーの経路

1リクエストの失敗が「リトライ」「フォールバック」「`ERROR`」「`FatalError`」のどれに落ちるかは、
4ファイルに分かれた関数を**どの順で通るか**で決まる。ステータス別に何が起きるかは
`README.md`「エラーハンドリング」が正典で、ここに書くのは判定を担う関数とその順序だけ
（なぜその方針なのかは上の節）。

**GitLabとGitHubで同じ形・同じ順序**で、違うのは`lib/<プラットフォーム>/`側の中身だけ。以下の
`errors.ts`・`api.ts`は、GitHubで動かすときは`lib/github/errors.ts`・`lib/github/api.ts`に
読み替える（`withGitlabRetry()`↔`withGithubRetry()`、`createGitlabAdapter()`↔`createGithubAdapter()`）。

**`steps/`は`isFatalError()`・`extractHttpStatus()`を直接importしない。** どちらも`PlatformAdapter`
（`lib/platform/adapter.ts`）の関数として渡り、`step-outcome.ts`は`adapter.isFatalError(err)`と
尋ねる。`PlatformAdapter`はAPI呼び出しだけの表ではなく「プラットフォームごとに違って`steps/`が必要とする
もの」の表で、URLの組み立て（`buildTagUrl`）と並んでエラー分類が載る。1つの表にまとめてあるので、
**API呼び出しはGitHub・エラー分類はGitLab、という取り違えが起こらない**。そのために
`withHandling()`と`withAppContext()`は第1引数に`adapter`を取る（この2つはAPIを呼ばない）。

**判定の順序**（`lib/<プラットフォーム>/`の関数1回ぶんの失敗が落ち着くまで）

1. `withNotFoundFallback()`（`getProjectGroupPath()`・`branchExists()`などこれで包んだ呼び出しだけ）が
   `isNotFoundError()`に尋ね、404なら既定値を返してここで終わる。この包みは
   `withGitlabRetry()`の**内側**にあるので、404はリトライ判定まで届かない
2. `withGitlabRetry()`→`withRetry()`が`isRetryableError()`に尋ねる。真なら待って再試行し、
   `maxAttempts`で打ち切る（`src/utils/retry.ts`の既定は`maxAttempts` 3・`baseDelayMs` 1000）。
   待ち時間は既定では`baseDelayMs * 2 ** (attempt - 1)`だが、`retryDelayMs`が値を返した回は
   その値になる（GitHubの`retry-after`。`withRetry()`自身はヘッダを知らない）
3. 抜けてきた例外は`lib/`の外へ出て、途中で`withAppContext()`がアプリ名を前置する（次節）
4. `withHandling()`が捕まえて`settleAsError()`に渡す。`platform.isFatalError()`が真なら
   `new FatalError(platform.extractHttpStatus(err), err)`を投げ、偽なら`httpStatus`とメッセージを
   `result: "ERROR"`としてログに出し、`ConfigUnitUpdateResult`の`"ERROR"`を返す
5. `FatalError`は`src/index.ts`まで上がり、`event: "fatal_error"`をログに出して`exit(1)`

**401は1・2の外側で読み替わる。** `createTokenRoutedAdapter()`
（`lib/platform/token-routed-adapter.ts`）が`ProjectId`でトークンのアダプタを引き当てて呼び、そのアダプタが
401を返したときは、HTTPの構造を持たない素の`Error`に替えて投げ直す。3以降はそれを
「fatalではない失敗」として運ぶので、そのchartリポジトリの設定ユニットが`ERROR`になり他は続く
（`docs/architecture/adr/0033-access-token-per-chart-repo.md`）。

**`resolveTags()`の失敗だけは4に入るのが遅れる。** 3の後で`settleApp()`が捕まえて`AppOutcome`の
`failed`にし、`buildPlans()`が引き当てのたびに投げ直してから4に入る。1回の解決の失敗を、その
アプリを含む**すべての**設定ユニットのERRORにするための遠回りで、fatalかどうかの判定だけは
`settleApp()`側でも行うため即時終了は遅れない。

**404と403の読み替えは`lib/<プラットフォーム>/`の内側で完結する**。`withNotFoundFallback()`が既定値に
変えるのは404だけで、403は変換せずそのまま上がる（`isFatalError()`も403をfatalにしない。トークンが
特定のプロジェクトの権限を持たないだけで、他の設定ユニットは処理できるため）。例外はGitLabの
`getLatestPipelineForRef()`で、ここだけ`withNotFoundFallback()`を使わず**403も「パイプライン無し」
として`undefined`に読み替える**。`pipelines/latest`はパイプラインが1件も無いプロジェクトに対して
404ではなく403を返すことが実機で確認されており、パイプラインのURLはMR本文の参考情報にすぎず更新処理の
必須条件ではないため。

**403と404の意味はGitHubでは同じではない**（一次情報は`docs/research/github-support.md`）。

- **403はレート制限でも返る**（一次・二次とも403か429）。権限不足と区別できる手掛かりは
  `retry-after`ヘッダだけなので、GitHubの`isRetryableError()`は**`retry-after`が付いていて、その
  秒数が待てる上限（60秒）以内のときだけ**403を再試行する。付いていない403は権限不足として
  非リトライ・非fatal（＝該当設定ユニットが`ERROR`）に落とす。**一次レート制限の枯渇
  （`x-ratelimit-remaining: 0`）もここに落ちる**。リセットは数分〜1時間先で上限を超えるため、
  そのヘッダを読んでも行き先は同じ`ERROR`になる。分岐を増やさないために読んでいない
- **429は`retry-after`が無くても再試行する**（レート制限以外で返らないため、指数バックオフに任せる）。
  一方GitHubの`RETRYABLE_STATUSES`に429は入れず、403と同じ経路で判定する。GitLab側は
  429/502/503/504を一律に再試行する（`RETRYABLE_STATUSES`）
- **404は「存在しない」と断定できない**。GitHubは権限の無いリソースも404で返すため、
  `isNotFoundError()`が真でも「無い」のか「見えない」のか分からない。**実装では吸収しない**
  （区別するには権限の問い合わせを別途足すことになり、「1関数＝1 API呼び出し」が崩れる）。
  404を既定値に読み替えた後の書き込みが403/404で失敗し、その設定ユニットが`ERROR`として
  メッセージ付きでログに残ることに委ねる
- **ネットワーク障害は`RequestError`（status 500）に包み直されて届く**（@octokit/requestの挙動）ため、
  GitHubでは5xxの経路でfatalになる。包まれない素の`TypeError: fetch failed`に備えて`code`も見るのは
  GitLab版と同じ。Octokitにgitbeakerの`queryTimeout`にあたる設定は無いので、
  `GitbeakerTimeoutError`に対応する判定も無い
