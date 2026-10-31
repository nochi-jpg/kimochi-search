#!/usr/bin/env python3
"""言葉イラストのシート（4.png〜17.png）から1体ずつ切り出す。

- 下の文字（ラベル）はカットする
- 目や口の白いところが透けていたら、白でぬりつぶす
- 大きさはシートの絵のまま（全部同じ倍率）で、同じ大きさのキャンバスに足元をそろえて置く

使い方:  python3 tools/cut_illust.py <シートのあるフォルダ>
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "img" / "words"

# シートごとの言葉（左上から右へ、上の段→下の段）
SHEETS = {
    4: [("ureshii", w) for w in "ちょっぴりうれしい よろこぶ うれしくてたまらない 大よろこび 有頂天 感無量 太陽みたいなえがお 天にものぼる心地 花がさいたよう 羽が生えたよう 夢のよう 顔がほころぶ ガッツポーズをする 口もとがゆるむ 飛び上がる 胸が高鳴る".split()],
    5: [("ureshii", w) for w in "目をかがやかせる 目を細める ウキウキ にこにこ にんまり ほくほく るんるん 笑みがこぼれる 小おどりする 心がはずむ 鼻が高い 胸がいっぱいになる".split()],
    6: [("tanoshii", w) for w in "ちょっと楽しい おもしろい 楽しくてしかたない 夢中になる われをわすれる お祭りのよう はじけるよう 水を得た魚のよう 遊園地にいるよう 足どりが軽い おなかをかかえて笑う 声をはずませる 身を乗り出す 笑いころげる いきいき ゲラゲラ".split()],
    7: [("tanoshii", w) for w in "ノリノリ のんびり ワイワイ わくわく あっというまにすぎる 心がおどる 心ゆくまで 時間がたつのもわすれる 話に花がさく".split()],
    8: [("okoru", w) for w in "むっとする ふくれる 腹が立つ かんかんにおこる 激怒する 頭から湯気が出そう 鬼のような顔 火山がふん火したよう はらわたが煮えくり返る 顔を真っ赤にする こぶしをにぎりしめる 地だんだをふむ ほおをふくらませる 目をつり上げる イライラ カチンとくる".split()],
    9: [("okoru", w) for w in "かっとなる ぶすっと ぷんぷん ムカッ 頭にくる 堪忍袋の緒が切れる 腹にすえかねる 虫の居所が悪い 目くじらを立てる".split()],
    10: [("kanashii", w) for w in "さびしい がっかり くやしい 泣きたくなる 悲しみにくれる 雨雲がかかったよう 心にぽっかり穴があいたよう しおれた花のよう 火が消えたよう うつむく 肩を落とす くちびるをかむ なみだをこらえる 胸がしめつけられる 目がうるむ がっくり".split()],
    11: [("kanashii", w) for w in "しくしく しょんぼり どんより ぽろぽろ めそめそ 後ろ髪を引かれる 気を落とす 心が晴れない 胸がつぶれる".split()],
    12: [("dokidoki", w) for w in "そわそわ 不安になる ハラハラ きんちょうでかたくなる 生きた心地がしない 足が震える 穴があったら入りたい 心ぞうが口から飛び出しそう ゆでだこのよう ロボットのよう 足がすくむ 顔が赤くなる 声がふるえる 手に汗をにぎる 冷やあせをかく 目が泳ぐ".split()],
    13: [("dokidoki", w) for w in "おどおど がちがち ドキッ どぎまぎ ひやひや びくびく もじもじ あがる 顔から火が出る 気が気でない 胸がキュンとする 胸がときめく".split()],
    14: [("hotto", w) for w in "気が楽になる ひと安心 安心する 心からほっとする 全身の力がぬける あたたかいお風呂に入ったよう 重い荷物をおろしたよう 雲が晴れたよう ひだまりのよう 顔がゆるむ 肩の力がぬける その場にへたりこむ ため息をつく 胸をなでおろす すっきり ほっと一息".split()],
    15: [("hotto", w) for w in "ほのぼの やれやれ 生きた心地がする 肩の荷が下りる 気がゆるむ 心が晴れる 胸のつかえがとれる".split()],
    16: [("bikkuri", w) for w in "おやっと思う はっとする おどろく びっくりぎょうてん 腰をぬかす 雷に打たれたよう 時が止まったよう 鳩が豆鉄砲を食ったよう 目が点になる 息をのむ 口をあんぐりあける 声を上げる 背すじがこおる 目を丸くする きょとん ぎょっとする".split()],
    17: [("bikkuri", w) for w in "ぞっとする ぽかんとする わあっ 開いた口がふさがらない きもを冷やす 度肝をぬかれる 寝耳に水 目を見はる".split()],
}
# 目・口ではなく「腕と頭のすきま」などの穴（白くぬらない）。シート番号: [(y, x), ...]（シート上の位置）
GAP_POINTS = {
    4: [(195, 802)], 6: [(231, 418), (152, 1492), (161, 1025)],
    8: [(202, 1732), (206, 892), (185, 1138), (660, 1508)], 9: [(215, 1031)],
    10: [(189, 801), (243, 1569)], 15: [(201, 396)], 16: [(194, 788)], 17: [(339, 1538)],
}
# 小さな穴（目のハイライトなど）も白くしない言葉（腕のあいだに細いすきまがある）
NO_TINY_FILL = {"楽しくてしかたない"}
BODY_MIN = 12000   # 体とみなす大きさ（画素数）
W, H = 300, 380    # 出力キャンバス


def cut_sheet(path, names, num):
    im = Image.open(path).convert("RGBA")
    A = np.array(im)
    a = A[..., 3] > 24
    lab, n = ndimage.label(a)
    objs = ndimage.find_objects(lab)
    sizes = ndimage.sum(a, lab, range(1, n + 1))
    comps = []
    for i, s in enumerate(objs):
        comps.append({"id": i + 1, "y0": s[0].start, "y1": s[0].stop, "x0": s[1].start, "x1": s[1].stop, "area": sizes[i]})
    bodies = [c for c in comps if c["area"] >= BODY_MIN]
    # 段ごとにならべる
    bodies.sort(key=lambda c: (c["y0"] + c["y1"]) / 2)
    rows = []
    for b in bodies:
        cy = (b["y0"] + b["y1"]) / 2
        if rows and abs(cy - rows[-1][0]) < 200:
            rows[-1][1].append(b)
        else:
            rows.append([cy, [b]])
    ordered = [b for _, r in rows for b in sorted(r, key=lambda c: c["x0"])]
    if len(ordered) != len(names):
        raise SystemExit(f"{path.name}: 体の数 {len(ordered)} と言葉の数 {len(names)} が合いません")
    # ラベル（各段の足もとのすぐ下から始まる文字のかたまり）を見つけて取りのぞく
    label_ids = set()
    small = [c for c in comps if c["area"] < BODY_MIN]
    for _, r in rows:
        feet = max(b["y1"] for b in r)
        band = [c for c in small if feet - 25 <= c["y0"] <= feet + 90]
        if not band:
            continue
        bottom = max(c["y1"] for c in band)
        grew = True
        while grew:
            grew = False
            for c in small:
                if c in band:
                    continue
                if feet - 25 <= c["y0"] <= bottom + 20:
                    band.append(c)
                    bottom = max(bottom, c["y1"])
                    grew = True
        label_ids |= {c["id"] for c in band}
    others = [c for c in small if c["id"] not in label_ids]
    # 小さい部品を、同じ段のいちばん近い体にくっつける
    owner = {}
    for c in others:
        cx, cy = (c["x0"] + c["x1"]) / 2, (c["y0"] + c["y1"]) / 2
        best, bd = None, 1e9
        for b in ordered:
            if not (b["y0"] - 260 <= cy <= b["y1"] + 260):
                continue
            bx = (b["x0"] + b["x1"]) / 2
            d = abs(cx - bx)
            if d < bd:
                best, bd = b, d
        if best and bd < 170:
            owner.setdefault(best["id"], []).append(c)
    results = []
    for b, (feeling, word) in zip(ordered, names):  # noqa
        parts = owner.get(b["id"], [])
        keep = [b] + [c for c in parts if c["y0"] <= b["y1"] + 30 and c["y1"] >= b["y0"] - 170 and not (c["area"] < 120 and c["y1"] < b["y0"] - 60)]
        ids = [c["id"] for c in keep]
        mask = np.isin(lab, ids)
        y0 = min(c["y0"] for c in keep); y1 = max(c["y1"] for c in keep)
        x0 = min(c["x0"] for c in keep); x1 = max(c["x1"] for c in keep)
        sub = A[y0:y1, x0:x1].copy()
        m = mask[y0:y1, x0:x1]
        # まわりのにじみも少し残す
        m = ndimage.binary_dilation(m, iterations=2)
        sub[..., 3] = np.where(m, sub[..., 3], 0)
        # 目や口の白（透けている穴）をぬりつぶす：頭のあたりの、閉じた小さな穴だけ
        body = (lab[y0:y1, x0:x1] == b["id"])
        holes = ndimage.binary_fill_holes(body) & ~body
        hl, hn = ndimage.label(holes)
        by0 = b["y0"] - y0
        bh = b["y1"] - b["y0"]
        for k, s in enumerate(ndimage.find_objects(hl), 1):
            cy = (s[0].start + s[0].stop) / 2
            area = (hl[s] == k).sum()
            gy, gx = y0 + cy, x0 + (s[1].start + s[1].stop) / 2
            if any(abs(gy - py) < 25 and abs(gx - px) < 25 for py, px in GAP_POINTS.get(num, [])):
                continue
            if area < 60 and word in NO_TINY_FILL:
                continue
            if cy < by0 + bh * 0.5 and area < 6000:
                hm = ndimage.binary_dilation(hl == k, iterations=1)
                al = sub[..., 3][hm].astype(float) / 255
                for ch in range(3):
                    sub[..., ch][hm] = (sub[..., ch][hm] * al + 255 * (1 - al)).astype(np.uint8)
                sub[..., 3][hm] = 255
        # 体の下半分（足のあいだ など）に残っている白いかけらは、すける
        wht = (sub[..., 0] > 200) & (sub[..., 1] > 200) & (sub[..., 2] > 200) & (sub[..., 3] > 150)
        wl, wn = ndimage.label(wht)
        for k, ws in enumerate(ndimage.find_objects(wl), 1):
            if (ws[0].start + ws[0].stop) / 2 > by0 + bh * 0.55:
                r = wl == k
                ring = ndimage.binary_dilation(r, iterations=2) & ~r
                solid = (sub[..., 3] > 24) & ~wht
                other = solid & ~body
                # 体の線にだけくっついている白（足のあいだのかけら）だけを消す。汗やひかりなど別の部品の中の白は残す
                if (ring & body).any() and not (ring & other).any():
                    wm = ndimage.binary_dilation(r, iterations=1) & (sub[..., 0] > 160) & (sub[..., 1] > 160) & (sub[..., 2] > 160)
                    sub[..., 3][wm] = 0
        results.append((feeling, word, Image.fromarray(sub), b["y1"] - y0))
    return results


def main():
    src = Path(sys.argv[1])
    OUT.mkdir(parents=True, exist_ok=True)
    words = json.loads((ROOT / "data" / "words.json").read_text(encoding="utf-8"))
    idx = {(w["feeling"], w["word"]): w["id"] for w in words}
    allres = []
    for num, names in SHEETS.items():
        allres += cut_sheet(src / f"{num}.png", names, num)
    scale = 1.0
    maxw = max(r[2].width for r in allres); maxh = max(r[2].height for r in allres)
    scale = min(1.0, (W - 8) / maxw, (H - 8) / maxh)
    mapping = {}
    for feeling, word, img, foot in allres:
        key = (feeling, word)
        if key not in idx:
            raise SystemExit(f"辞書にない: {feeling} {word}")
        im2 = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
        canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ox = (W - im2.width) // 2
        oy = H - 6 - round(foot * scale)
        canvas.alpha_composite(im2, (ox, max(0, oy)))
        wid = idx[key]
        canvas.save(OUT / f"{wid}.webp", "WEBP", quality=86, method=6)
        mapping[wid] = f"img/words/{wid}.webp"
    print(f"{len(mapping)}体を書き出しました（倍率 {scale:.2f}）")


if __name__ == "__main__":
    main()
