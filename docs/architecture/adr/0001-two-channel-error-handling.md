# エラーは「fatalは例外・それ以外は戻り値」の2チャネル。`steps/`に`try`/`catch`を書かない

「5xx/ネットワーク障害なら実行全体を落とし、それ以外は該当する設定ユニットだけをERRORにして
続行する」という判断を、`steps/shared/step-outcome.ts` の1箇所だけが持つ。stepがcatchすると
「fatalもERRORとして計上して続行する」ように読めてしまうため、catch節は高階関数に吸収した。
**`grep -rn "try {" src/steps/` が0件であること**が「stepはエラー方針を持たない」の機械的な確認。

- **2チャネルを1つの`Result`型に寄せる案は採らない**。fatalは「実行全体の中止」というスコープの
  違う事象で、戻り値に混ぜると各stepに「fatalなら伝播させる」判断が戻り、いま消したいものが
  再び分散する。例外はスコープの広い事象、戻り値は設定ユニット単位の結果、で固定する
- **アプリ単位の封じ込め（`settleApp()`・`AppOutcome`）は3つ目のチャネルではない**。
  `resolveTags()`だけは1回の解決の結果を複数の設定ユニットへ配るため、例外のままでは最初の
  1つにしか届かない。そこで失敗を値にして持ち回るが、`ERROR`として記録するのは
  `buildPlans()`が投げ直したあとの`settleAsError()`のままで、**ログの位置は増えない**
  （`docs/architecture/adr/0008-cached-reads-for-read-only-axis-crossing.md`）
- **対象外**: `lib/`の404/403フォールバックと`utils/retry.ts`（特定のHTTPステータスを正常系に
  変換するだけで設定ユニット単位の結果とは無関係）、`scripts/lint/remote-existence/`（問題を全件
  列挙して返すのが目的の別プログラムで、fatalで全体を落とす方針そのものを持たない）
- **リクエストのタイムアウトもfatalに数える**。gitbeakerは`createClient()`に渡した
  `queryTimeout`を`AbortSignal.timeout()`として全リクエストに載せ、超過すると
  `GitbeakerTimeoutError`を投げる。このエラーはHTTPステータスも`code`も持たないため、
  `isFatalError()`は**エラーの名前**で判定する（クラスの`instanceof`にしないのは、
  パッケージの実体が二重に解決されると偽になるため）。1リクエストに5分かかる状態は
  特定プロジェクトの問題ではなくGitLab側の異常とみなし、全設定ユニットを1件ずつ
  5分待たせるより即時終了を選んでいる
- **リトライは2層あり、429と502では下の層しか動かない**。gitbeakerの`defaultRequestHandler`は
  429と502を内部で最大10回リトライするが、バックオフが`delay(2 ** i * 0.25)`（ミリ秒）で
  **合計255.75msしかない**（実測で10回・280ms）。使い切ると`cause`を持たない
  `GitbeakerRetryError`を投げるため、`lib/gitlab/errors.ts`の`isRetryableError()`はステータスを読めず、
  この2つでは**こちらの指数バックオフ（1s/2s/4s）が一度も動かない**。503と504はgitbeakerの
  リトライ対象外なので、こちらのリトライが設計どおり効く（実測で3回・3.0秒）。
- **`GitbeakerRetryError`からはメッセージ経由でステータスを読み、`isFatalError()`の判定にだけ使う**。
  読まないと**502が5xxとして扱われず**、ゲートウェイ障害でも各設定ユニットを1件ずつ`ERROR`にして
  進んでしまう（正典が約束する「5xxは即時終了」を満たせない）。一方でこの値を
  `isRetryableError()`には渡さない。gitbeakerが既に10回試したあとで、こちらから追加で叩く相手では
  ないため（429で30リクエストになるのを避ける）。メッセージが読めないときは`undefined`を返し、
  fatalに昇格させない安全側に倒す
- **`queryTimeout`の値をgitbeakerの既定値に委ねず`lib/gitlab/api.ts`で明示する**。
  値自体は既定値と同じだが、既定値がバージョンアップで黙って変わると気づけないため。
  gitbeakerが429/502に対して行う内部リトライ（最大10回）も同じsignalを共有するので、
  この5分は**リトライ込みの総予算**になる
