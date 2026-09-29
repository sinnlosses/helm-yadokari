# `lib/<プラットフォーム>/`はディレクトリ名と同じ名前のファイルを置かず`api.ts`にする

CLAUDE.mdの原則4「置き場所を名前にしたファイルは作らない」はファイル名の話で、ディレクトリ名の
繰り返し（`lib/gitlab/gitlab.ts`）も同じ失敗の一種になる（`helpers.ts`が「このディレクトリに置くもの」
としか言わないのと同じ）。中身は`@gitbeaker/rest`・`@octokit/rest` のラッパーで、
「そのプラットフォームのAPIを叩く場所」という概念を`api.ts`が表す。

`src/lib/config/config.ts`は同じ形（`config/`というディレクトリ名を繰り返すファイル名）だが
これでよい。こちらは外部APIのラッパーではなく`config/`配下（`limit-to-target.ts`・
`find-config-units.ts`・`load-config-unit.ts`等）を束ねて`loadConfig()`だけを公開する
**入口**で、ファイル名が指しているのは「`config/`に置くもの」ではなく「`config/`の公開窓口」
という概念。ディレクトリ名と同じ名前になっているのは偶然で、`gitlab.ts`／`github.ts`とは
理由が違う。
