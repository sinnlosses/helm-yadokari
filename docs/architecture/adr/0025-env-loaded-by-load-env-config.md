# 環境変数はモジュールのトップレベルではなく`loadEnvConfig()`で読む

トップレベルの定数で読むと**importした瞬間に検証が走って未設定なら投げる**ため、
環境変数を必要としない側（lintスクリプト・テスト）に動的importやダミー値注入といった迂回が要る。

- `EnvConfig`は引数で受け渡し、生成するのは`src/index.ts`だけ。テストは`vi.mock`ではなく
  普通のオブジェクトを渡せばよい
- 起動時に落ちる（fail fast）性質はそのままで、`index.ts`のcatchの内側で投げるので
  **エラーが構造化ログに乗る**
- **入口は`loadEnvConfig()`だけではない。** `registry.yaml`の`accessTokenEnv`で宣言された
  トークンは名前が`config/`を読むまで決まらないので、同じファイルの`loadAccessTokens()`が
  config読み込みのあとに読む。`process.env`に触れるのが`src/lib/env.ts`だけという点は変わらない
  （`docs/architecture/adr/0033-access-token-per-chart-repo.md`）
