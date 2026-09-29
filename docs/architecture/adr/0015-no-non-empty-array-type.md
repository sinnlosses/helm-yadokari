# 配列の非空を型で保証するより、生成経路を1つに保つ（`AppUpdatePlan.updates`）

`AppUpdatePlan.updates`が1件以上であることは型（`readonly ImageTagUpdate[]`）ではなく実装
（`stage-image-tag-updates.ts`が空なら`AppUpdatePlan`自体を積まない）だけが保証している。
`readonly [ImageTagUpdate, ...ImageTagUpdate[]]`のような非空タプル型に変えて型で表す案は、
実際に書いてみると詰む。生成側は`reduceAsync`で組み立てた`readonly ImageTagUpdate[]`を
`updates.length === 0`で早期returnした後も持っているが、TypeScriptは配列の`.length`チェックを
タプル型へのnarrowingに使わないため、`as`キャストか用途専用のfactory関数を挟まないと
非空タプル型へ代入できない。**`as`を避ける対価が、消費側の1行フィルタを消す対価より大きい**。
生成経路が`stageAppImageTagUpdates`1箇所しかない不変条件は、消費側（`collect-mr-entries.ts`）
で再確認せず、生成側だけが守ればよい。
