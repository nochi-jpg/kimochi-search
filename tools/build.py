#!/usr/bin/env python3
"""data/src/*.txt（辞書の原本）をチェックして、アプリ用の data/words.json を作る。

使い方:  python3 tools/build.py          … チェックして words.json を作る
         python3 tools/build.py --quiz   … クイズの問題と選択肢の候補を一覧で出す（確認用）

原本の書き方
  1行目：@feeling ureshii  （このファイルの気持ち）
  列　　：ことば|よみ|★|ジャンル|つよさ|タグ|場面|意味|書き出し|あとの例文|クイズ用の形|にている言葉|NG
  ふりがな：漢字の直後に《よみ》。直前の漢字のかたまりにかかる。かたまりの途中からかけたいときは ｜ で始まりを示す。
"""
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "src"
OUT = ROOT / "data" / "words.json"

FEELINGS = ["ureshii", "tanoshii", "okoru", "kanashii", "dokidoki", "hotto", "bikkuri"]
FEEL_JA = {"ureshii": "うれしい", "tanoshii": "たのしい", "okoru": "おこる", "kanashii": "かなしい",
           "dokidoki": "ドキドキ", "hotto": "ほっとする", "bikkuri": "びっくり"}
GENRES = ["tsuyosa", "tatoe", "karada", "oto", "kanyo"]
TAGS = {"shinpai", "kinchou", "hazukashii", "koi", "good", "bad"}
SCENES = {"undokai", "ensoku", "happyokai", "test", "naraigoto", "tanjoubi",
          "kenka", "nakanaori", "shikarareta", "pet", "hajimete", "owakare"}
BASE = {"ureshii": "うれしかった。", "tanoshii": "たのしかった。", "okoru": "おこった。",
        "kanashii": "かなしかった。", "hotto": "ほっとした。", "bikkuri": "びっくりした。"}
DOKI_BASE = [("koi", "ドキドキした。"), ("hazukashii", "はずかしかった。"),
             ("kinchou", "きんちょうした。"), ("shinpai", "しんぱいだった。")]

# クイズ：正解の「気持ちの種類」ごとに、まちがいの選択肢に使ってよい種類
OPPOSITE = {
    "ureshii": {"okoru", "kanashii", "doki_shinpai"},
    "tanoshii": {"okoru", "kanashii", "doki_shinpai"},
    "koi": {"okoru", "kanashii", "doki_shinpai"},
    "bikkuri_good": {"okoru", "kanashii", "doki_shinpai"},
    "hotto": {"okoru", "doki", "doki_shinpai"},  # はずかしいの言葉は doki_hazu なので入らない
    "okoru": {"ureshii", "tanoshii", "hotto"},
    "kanashii": {"ureshii", "tanoshii", "hotto"},
    "doki": {"okoru", "hotto"},
    "doki_hazu": {"okoru", "hotto"},
    "doki_shinpai": {"okoru", "hotto"},
    "bikkuri_bad": {"ureshii", "tanoshii"},
    "bikkuri_both": {"hotto"},
}

KANJI = r"[一-鿿々〆ヶ]"
RUBY = re.compile(r"｜?(" + KANJI + r"+)《([^》]+)》")


def kata2hira(s):
    return "".join(chr(ord(c) - 0x60) if "ァ" <= c <= "ヶ" else c for c in s)


def check_ruby(text):
    """ふりがなを付けていない漢字があれば、その漢字を返す"""
    rest = RUBY.sub("", text)
    m = re.search(KANJI, rest)
    return m.group(0) if m else None


def plain(text):
    return RUBY.sub(lambda m: m.group(1), text).replace("｜", "")


def kind(feeling, tags):
    if feeling == "dokidoki":
        if "koi" in tags:
            return "koi"
        if "hazukashii" in tags:
            return "doki_hazu"
        return "doki_shinpai" if "shinpai" in tags else "doki"
    if feeling == "bikkuri":
        g, b = "good" in tags, "bad" in tags
        return "bikkuri_both" if g and b else "bikkuri_good" if g else "bikkuri_bad"
    return feeling


def base_for(feeling, tags):
    if feeling != "dokidoki":
        return BASE[feeling]
    for t, b in DOKI_BASE:
        if t in tags:
            return b
    return "ドキドキした。"


def load():
    errors, words = [], []
    for path in sorted(SRC.glob("*.txt")):
        feeling = None
        for n, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            where = f"{path.name} {n}行目"
            if not line.strip() or line.startswith("#"):
                continue
            if line.startswith("@feeling"):
                feeling = line.split()[1]
                if feeling not in FEELINGS:
                    errors.append(f"{where}: 気持ち「{feeling}」がありません")
                continue
            cols = [c.strip() for c in line.split("|")]
            if len(cols) != 13:
                errors.append(f"{where}: 列の数が {len(cols)} です（13列にしてください）")
                continue
            word, read, star, genres, lv, tags, scenes, meaning, sit, after, quiz, rel, ng = cols
            g = [x for x in genres.split(",") if x]
            tg, sc = tags.split(), scenes.split()
            for x in g:
                if x not in GENRES:
                    errors.append(f"{where}: ジャンル「{x}」がありません")
            for x in tg:
                if x not in TAGS:
                    errors.append(f"{where}: タグ「{x}」がありません")
            for x in sc:
                if x not in SCENES:
                    errors.append(f"{where}: 場面「{x}」がありません")
            if re.search(KANJI, word) and not read:
                errors.append(f"{where}: 「{word}」によみがありません")
            if "tsuyosa" in g and not (lv.isdigit() and 1 <= int(lv) <= 5):
                errors.append(f"{where}: 「つよさ」の言葉は、つよさを1〜5にしてください")
            if star not in ("1", "2", "3"):
                errors.append(f"{where}: ★は1〜3にしてください")
            for label, text in (("意味", meaning), ("書き出し", sit), ("あとの例文", after), ("クイズ用の形", quiz)):
                k = check_ruby(text)
                if k:
                    errors.append(f"{where}: {label}の「{k}」にふりがながありません")
            if quiz != "-" and not quiz:
                errors.append(f"{where}: クイズ用の形がありません（出さないときは -）")
            words.append({
                "word": word, "reading": read or kata2hira(word), "showReading": bool(read),
                "star": int(star), "feeling": feeling, "genres": g, "strength": int(lv) if lv.isdigit() and int(lv) else None,
                "tags": tg, "scenes": sc, "meaning": meaning,
                "sit": sit, "before": sit + base_for(feeling, tg), "after": after,
                "quiz": None if quiz == "-" else quiz, "_rel": [x for x in rel.split(",") if x], "_ng": [x for x in ng.split(",") if x],
            })
    return errors, words


def main():
    errors, words = load()
    count = Counter()
    for w in words:
        count[w["feeling"]] += 1
        w["id"] = f"{w['feeling']}-{count[w['feeling']]:02d}"
    by_word = defaultdict(list)
    for w in words:
        by_word[w["word"]].append(w)
    seen = set()
    for w in words:
        key = (w["word"], w["feeling"])
        if key in seen:
            errors.append(f"「{w['word']}」が、{FEEL_JA[w['feeling']]}に2回あります")
        seen.add(key)
        w["same"] = [x["id"] for x in by_word[w["word"]] if x is not w]
        w["related"] = []
        for r in w.pop("_rel"):
            cands = by_word.get(r)
            if not cands:
                errors.append(f"「{w['word']}」のにている言葉「{r}」が辞書にありません")
                continue
            pick = next((c for c in cands if c["feeling"] == w["feeling"]), cands[0])
            w["related"].append(pick["id"])
        ng = w.pop("_ng")
        for r in ng:
            if r not in by_word:
                errors.append(f"「{w['word']}」のNG「{r}」が辞書にありません")
        w["_ng"] = set(ng)
    if errors:
        print("\n".join(errors))
        sys.exit(1)
    # クイズのまちがい選択肢の候補
    for w in words:
        w["kind"] = kind(w["feeling"], w["tags"])
    for w in words:
        if not w["quiz"]:
            w["distractors"] = []
            continue
        ok = OPPOSITE[w["kind"]]
        cands = []
        for d in words:
            if not d["quiz"] or d["word"] == w["word"]:
                continue
            if any(x["kind"] not in ok for x in by_word[d["word"]]):
                continue
            if d["word"] in w["_ng"] or w["word"] in d["_ng"]:
                continue
            # きんちょう・しんぱいの問題に、おこるの「からだ」の言葉（こぶしをにぎる など）は入りうるので使わない
            if w["feeling"] == "dokidoki" and d["feeling"] == "okoru" and "karada" in d["genres"]:
                continue
            cands.append(d["id"])
        w["distractors"] = cands
    for w in words:
        w.pop("_ng")
    for w in words:
        w["img"] = (ROOT / "img" / "words" / f"{w['id']}.webp").exists()
    OUT.write_text(json.dumps(words, ensure_ascii=False, indent=1), encoding="utf-8")
    (ROOT / "data" / "words.js").write_text(
        "// tools/build.py が作るファイルです。直接書きかえないでください。\nwindow.KIMOCHI_WORDS = "
        + json.dumps(words, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")

    if "--quiz" in sys.argv:
        import random
        random.seed(1)
        idx = {w["id"]: w for w in words}
        for w in words:
            if not w["quiz"]:
                continue
            pool, ds, seen_q = w["distractors"][:], [], set()
            random.shuffle(pool)
            for d in pool:
                q = plain(idx[d]["quiz"])
                if q not in seen_q and len(ds) < 3:
                    seen_q.add(q)
                    ds.append(d)
            sit = plain(w["before"][: -len(base_for(w["feeling"], w["tags"]))])
            print(f"{w['id']}\t{sit}（{plain(w['quiz'])}）\t× " + " / ".join(plain(idx[d]["quiz"]) for d in ds))
        return
    gc = Counter((w["feeling"], g) for w in words for g in w["genres"])
    print(f"ページの数: {len(words)}（ことばの種類 {len(by_word)}）  クイズに出る: {sum(1 for w in words if w['quiz'])}")
    print("          " + " ".join(f"{g:>8}" for g in GENRES))
    for f in FEELINGS:
        print(f"{f:>9} " + " ".join(f"{gc[(f, g)]:>8}" for g in GENRES))
    print("★:", dict(sorted(Counter(w["star"] for w in words).items())))
    few = [w["word"] for w in words if w["quiz"] and len(w["distractors"]) < 6]
    if few:
        print("まちがい選択肢の候補が少ない:", few)


if __name__ == "__main__":
    main()
