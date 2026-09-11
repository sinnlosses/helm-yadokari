# コメント規約の調査（2026-09-11）

`docs/coding-standards.md`「コメント」節を書き換えるにあたって、一次情報を当たった記録。
**正典は `docs/coding-standards.md`「コメント」節**で、このファイルはその根拠を残すためのもの。

## 調べた動機

「コメントが実装の詳細を書きすぎでメンテコストが大きい。概要と Why / Why Not は要るが、
プロフェッショナルな書き方を調べて直してほしい」という指示。着手前の実測値:

| 範囲       | コメント行 / 全行 | 割合 |
| ---------- | ----------------- | ---- |
| `src/`     | 824 / 3194        | 26%  |
| `scripts/` | 100 / 507         | 20%  |
| `test/`    | 185 / 5690        | 3%   |

`test/` は問題になっていないため対象外とした。

## 一次情報

### Google TypeScript Style Guide

<https://google.github.io/styleguide/tsguide.html>

**採用した**。読者による切り分けが、このリポジトリの正典に無かった軸だった。

> Use `/** JSDoc */` comments for documentation, i.e. comments a user of the code should read.
> Use `// line comments` for implementation comments, i.e. comments that only concern the
> implementation of the code itself.

> JSDoc comments are understood by tools (such as editors and documentation generators),
> while ordinary comments are only for other humans.

型との重複を避ける原則も同じ方向を向いている:

> TypeScript expresses information in types, so names should not be decorated with
> information that is included in the type.

### TSDoc

<https://tsdoc.org/pages/tags/remarks/>

要約（summary）と詳細（`@remarks`）を分け、詳細側で要約を繰り返さない、という構造。
**考え方は採用し、ブロックタグは採用しなかった**（下記）。

### Rust API Guidelines: Documentation

<https://rust-lang.github.io/api-guidelines/documentation.html>

> Error conditions should be documented in an "Errors" section.
> Panic conditions should be documented in a "Panics" section.

例外条件を独立した節にする、という考え方。**採用しなかった**（下記）。

## 採用しなかったもの（Why Not）

**JSDocのブロックタグ（`@param` / `@returns` / `@throws` / `@remarks`）を導入しない。**
TSDocもRust APIガイドラインも専用セクションを勧めているが、このリポジトリは
**824行のコメントに対しブロックタグの使用が0件**で、全編が日本語の散文で書かれている。
導入すると全域に後付けする話になり、今回の要望（重複を減らす）より大きな変更になる。
読者が数人のチーム内限定で、ドキュメント生成器も使っていないため、タグが解く問題が無い。

**行数の上限を置かない。** `docs/coding-standards.md`「コメント」節は
「数字を置くと、種類の基準の代わりにその数字が基準として使われる」として意図的に
上限を置いていない。今回の実測でも**長さではなく重複が原因**だったため、この判断を維持する。

**「制約・前提は必要なだけ長くてよい」を撤回しない。** 同上。真の制約は長くてよい。

## 実測: 何が起きていたか

指示で名指しされた `src/lib/config/config.ts` の `loadConfig()` は、**本体9行に対しJSDoc 13行**。
1行ずつ追跡したところ、**13行中10行が他所の写し**だった:

| JSDocの記述                                 | どこに同じものがあるか                                                      |
| ------------------------------------------- | --------------------------------------------------------------------------- |
| `tagFormat` の食い違いを検証する理由        | `src/lib/config/validate.ts` のJSDoc、`docs/architecture.md`（**計3箇所**） |
| `validateTagFormatConsistency()` も検証する | 本体にその呼び出し行がそのまま並んでいる                                    |
| `target`未指定時は0件でもエラーにしない     | `src/lib/config/limit-to-target.ts` のJSDoc（計2箇所）                      |
| 設定ユニットごとに `ChartAndApps` を返す    | 戻り値の型そのもの                                                          |

T-184・T-185 で `loadConfig()` の本体が名前の付いた段の並びになった結果、
**それまで有用だったJSDocが本体の写しに変わった**。コメントが腐ったのではなく、
コードが良くなったぶんコメントの役目が消えた。

同種の腐り方はT-186の受け入れでも見つかっている（`schema.ts` の
「`config.ts`から参照する」が、T-185 で `config.ts` が `schema.ts` を import しなくなった
時点で事実と違っていた）。

## 判定手順が一意に決まることの確認

書き換えた正典の2問を `loadConfig()` の13行に当てたところ、全行について残す/消すが
一意に決まり、**13行 → 4行**になった。残した2文目
（`target`未指定時の非対称）は `limit-to-target.ts` にも同じ記述があるが、
**`loadConfig()` を呼ぶ人はそのファイルを開かない**ため読者の軸で残る。
