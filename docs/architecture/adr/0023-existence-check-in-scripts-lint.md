# 実在チェックは`src/lib/`ではなく`scripts/lint/`に置く

GitLab APIと`config/`形式に依存するので`lib/`の条件（原則2）は満たすが、原則2は「`src/`に
置くか否か」を決めない。本体パイプラインからの参照は0なので、`src/`に置くと`dist/`に本体が
使わないコードが混ざり、「本体から呼ばれない」という一番効く事実が構成に現れない。

所属グループの照合（`registry.yaml`の`group.groupId`が指すフルパスと`namespace.full_path`の
突き合わせ）もこの線引きに従い、判定そのもの（セグメント単位の前方一致・`groupName`のズレの
検出）は`scripts/lint/remote-existence/`に置く。`src/`側にあるのは`GroupId`/`GroupName`/
`GroupPath`（`domain/brand.ts`。`config/`のスキーマが使うため）と、値を取ってくる
`getGroupPath()`・`getProjectGroupPath()`（`lib/gitlab/api.ts`。GitLab APIを知ってよいのは
ここだけという原則2）だけ。実在確認と所属の取得は同じ1回の`Projects.show`で兼ねる。宣言された
`groupId`→フルパスの解決は`RemoteCache`（`remote-existence/remote-cache.ts`）が`groupId`をキーに
キャッシュするので、`registry.yaml`1件につき1回で済み、projectIdごとの呼び出しは増えない。
`PlatformAdapter`には載せない（本体パイプラインが呼ばないため。`docs/architecture/adr/0024-platform-adapter-function-table.md`）。
