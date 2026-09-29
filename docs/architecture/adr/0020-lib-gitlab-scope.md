# `lib/gitlab/` にはGitLabという外部システムを知っているものだけを置く

タグ形式と固定ブランチ名は`domain/`、MRの組み立ては`apply-updates/sub-steps/`に置く。GitLabに
関係する処理でも、依存対象（原則2）で見ればGitLabを知らないものは`lib/gitlab/`に入れない。

- **「複数のstepが使う」は`steps/shared/`に置く理由にならない**。`domain/`の取り決めは呼び出し元を
  問わない。`steps/shared/`はstep処理の配線だけに絞る
- **自前のタグ形式は`lib/`ではない**。`lib/`の判断軸は外部システム・外部で形が決まっている形式への
  依存で、このツール自身が定義したテンプレートはそこに当てはまらない
- GitLab固有のURLパス形式（`/-/tags/`・`/-/compare/`）に依存する部分だけは`lib/gitlab/`に残す。
  「外部I/Oは`api.ts`だけ」を保つため、I/Oを持たないURL組み立ては別ファイルにしている
- **gitbeakerのエラーの形を読む処理も同じ理由で`lib/gitlab/errors.ts`に置く**。
  `cause.response.status`という構造依存に加えて、クラス名（`GitbeakerTimeoutError`・
  `GitbeakerRetryError`）とメッセージの書式（`last status code: N`）まで持つので、
  「ドメイン知識を一切持たない汎用ユーティリティ」という`utils/`の定義と両立しない。**ライブラリを差し替えたときに書き換える範囲が
  `lib/gitlab/`に収まるかどうか**が判断の軸
- **再試行の仕組み（`utils/retry.ts`）と、再試行してよいかの判断（`lib/gitlab/errors.ts`の
  `isRetryableError()`）は分ける**。429/502/503/504という選定はGitLab APIに対する方針で、
  指数バックオフそのものは技術非依存。`withRetry()`は判定を引数で受け取り、
  `lib/gitlab/api.ts`の非公開`withGitlabRetry()`が両者を束ねる。
  採らなかった案は`utils/retry.ts`ごと`lib/gitlab/`へ移すことで、**バックオフの仕組みまで
  GitLab専用にしてしまう**ため見送った（利用者が1ファイルしかないことは`utils/`から
  出す理由にならない。原則2は依存対象だけで決める）
