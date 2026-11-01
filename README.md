# きもちをあらわすことばじてん

作文で気持ちの書き方がワンパターンになる子どものための、気持ちの言葉の辞典アプリです。
7つの気持ちから選んでいき、ぴったりの言葉を見つけます。言葉クイズつき。

さくしゃ：K.nom

## ひらきかた

- GitHub Pages で公開すると、`index.html` がそのまま動きます。
- 手元で試すときは、このフォルダで `python3 -m http.server` を動かして、ブラウザで `http://localhost:8000/` を開きます。
  （`index.html` をダブルクリックしても動きます）
- 画面は 1280×720 を基準に、ブラウザの大きさに合わせて自動で拡大・縮小します（子どもの端末 1366×768 で確認ずみ）。

## フォルダ

| 場所 | 中身 |
|---|---|
| `index.html` `css/` `js/` | アプリ本体 |
| `data/src/*.txt` | 辞書の原本（気持ちごとに1ファイル。ここを書きかえる） |
| `data/words.json` `data/words.js` | 原本から作ったデータ（直接書きかえない） |
| `data/quiz_check.tsv` | クイズの問題と、まちがいの選択肢の例（確認用） |
| `img/chara/` | 7つの気持ちのキャラ（立ち・顔・すわり・こい） |
| `img/words/` | 言葉ごとのイラスト |
| `tools/` | 変換・チェック用のスクリプト |
| `audio/` | BGM（Connect／Zippy）と効果音（効果音ラボ） |
| `SPEC.md` | 仕様書 |

## 辞書を直すとき

1. `data/src/` の気持ちのファイルを開いて、1行1語で書きかえる（書き方はファイルの先頭と `tools/build.py` の説明を見る）。
   - ふりがなは、漢字のすぐ後ろに `《よみ》` と書く（例：`気持《きも》ち`）。
2. `python3 tools/build.py` を動かす。まちがいがあれば、何行目の何がおかしいかを教えてくれる（ふりがなの付けわすれもエラーになる）。
3. クイズを確かめるときは `python3 tools/build.py --quiz > data/quiz_check.tsv`。

## 見た目のチェック

`python3 -m http.server 8765` を動かした状態で、`node tools/check_ui.js` を動かすと、全画面を開いて
「画面切れ・文字のはみ出し・…で切れている所・重なり」を自動で調べ、スクリーンショットを出します（Playwright が必要）。

## イラストを入れなおすとき

`python3 tools/cut_illust.py <イラストのシートがあるフォルダ>` で、4.png〜17.png から1体ずつ切り出します
（下の文字をカット、目や口の白抜けをぬりつぶし）。そのあと `python3 tools/build.py` を動かします。

## クレジット

- きかく・せいさく：K.nom
- おんがく：Zippy
- こうかおん：効果音ラボ

## Canva用の1ファイル版

`python3 tools/build_single.py <Zen Maru Gothic の ttf があるフォルダ>` で `dist/kimochi_canva.html` を作ります。
画像・音・フォントをぜんぶ1つのHTMLに入れます（音は作り直さず元のまま。フォントは使う字だけ）。辞書や画面を直したら、もう一度動かして作り直してください。
フォントは Google Fonts の Zen Maru Gothic（Medium・Bold・Black）を使います。
