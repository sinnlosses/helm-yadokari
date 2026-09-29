# プラットフォームの選択は`PLATFORM`、URLは`GITLAB_URL`/`GITHUB_URL`のまま

`PLATFORM=gitlab|github`（未指定は`gitlab`）で切り替え、接続先URLは**プラットフォームごとに
別の変数**（`GITLAB_URL` / `GITHUB_URL`）で受ける。`PLATFORM_URL`のような1変数に統一すると
読みやすくはなるが、既存の`.env`とGitLab CI/CD Variablesの付け替えが要る破壊的変更になる。
1回の実行で混在させない以上、使う側は常に片方しか設定しないので、変数名で「どちらの値か」が
読めるほうが得になる。

アクセストークンの扱い（`accessTokenEnv`で宣言した環境変数を読む仕組み）は両プラットフォームで
共通。**GitHub側はPersonal Access Tokenのみをサポートする**（fine-grained推奨）。GitLabの
Group Access Tokenと同じく、ヘッダに載せるだけの静的な文字列で済む。

- **GitHub Appを採らなかった**。GitHub自身は長期の連携にAppを推奨しているが、Appのinstallation
  access tokenは**1時間で失効する**ため、秘密鍵からJWTを作って都度発行する仕組みが要る。
  環境変数も3つ（App ID・秘密鍵・installation ID）に増える。PATでも同じことができ、必要に
  なった時点でOctokit側の対応に乗せて足せる
- **踏みやすい前提**: GitHub Enterprise CloudでSAML SSOが有効な組織は、classic PATを組織ごとに
  Authorizeしないと使えない（fine-grained PATは作成時に済む）。また組織側がfine-grained PATの
  利用をブロックしている場合がある
