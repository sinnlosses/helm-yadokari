# ブランド型のフィールド名は、修飾語があれば型の語を落とし、無ければ持つ

`anchor: AnchorName` は「アンカーそのもの」を持っているように読めるが、実際に持っているのは
名前だけで、この差が読み違いを生む。だから修飾語が無いフィールドは`Name`のような型の語を
落とさず持たせる（`ParsedTag.branchName`・`HelmConfig.branchRef`）。`Ref`も
`Name`と同じ役割で、ブランチそのものではなく**それを指す値**を持つことを語に出している
（使い分けは`docs/glossary.md`「Helmの向き先ブランチ」）。逆に
`current`・`mrTarget`のような「どれか」を言う修飾語が付いたフィールドは型の語を落とす
（`AppConfig.branchToSync`・`ChartRepoConfig.mrTargetBranch`・
`HelmBranchRefUpdate.currentBranch`・`ImageTagUpdate.currentTag`）。**規則は向きが逆で、
修飾語の有無が型の語を残すかどうかを決める**。`BranchName`型のフィールドを数え上げると、
この形から外れるものは無い。

- **適用するのは型定義のフィールドだけ**。関数の引数名は対象外。引数は型注釈が同じ行に見えるのに
  対し、フィールドはドットアクセスで宣言から離れた場所で読まれる、という違いで線を引く
- 唯一の例外は、包含する型が主語を与える`name`（`ParsedTag.name`・`TagInfo.name`）。型自体が
  「タグ」を表しているので、フィールドが`name`だけでも何の名前かは読み違えない
- **wire formatは変えない**。YAMLのキー名・外部ライブラリへ渡すペイロードの形は、内部の
  読みやすさのために動かさない。内部表現への詰め替えはZodスキーマの`.transform()`が担う
