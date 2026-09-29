# 設定ミスの検知は「形」と「実在」で2段に分ける

ローカルのYAMLだけで分かること（型・対応関係・重複）は`loadConfig()`時に例外を投げ、GitLabに
問い合わせないと分からないこと（projectId・ブランチ・valuesPath・アンカーの実在と、
projectIdが`registry.yaml`の`group`に属しているか）はlintスクリプトが問題の一覧を返す。
前者は認証不要なので全パイプラインで、後者はトークンがあるパイプラインでのみ実行する。

chartリポジトリをまたいだ突き合わせ（`validateTagFormatConsistency()`・
`validateAccessTokenEnvConsistency()`）もローカルのYAMLだけで分かるので前者に入る。後者の
実在チェック側は、chartリポジトリごとに宣言されたトークンでクライアントを分けて行う
（`docs/architecture/adr/0033-access-token-per-chart-repo.md`）。
