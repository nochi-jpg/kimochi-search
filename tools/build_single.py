#!/usr/bin/env python3
"""Canva などで配る「1ファイル版」を作る。

HTML・CSS・プログラム・辞書・画像・音・文字（フォント）を、ぜんぶ1つの HTML に入れる。
- 音（MP3）は作り直さず、元のデータをそのまま入れる（音質は変わらない）
- 画像（WebP）もそのまま入れる
- フォント（Zen Maru Gothic）は、アプリで使っている字だけを取り出して入れる

使い方:  python3 tools/build_single.py <Zen Maru Gothic の ttf があるフォルダ>
         → dist/kimochi_canva.html
"""
import base64
import io
import json
import re
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "dist" / "kimochi_canva.html"
LIMIT = 10 * 1024 * 1024
WEIGHTS = [("Medium", 500), ("Bold", 700), ("Black", 900)]
MIME = {".webp": "image/webp", ".png": "image/png", ".mp3": "audio/mpeg"}


def b64(data):
    return base64.b64encode(data).decode("ascii")


def font_faces(font_dir, text):
    css, sizes = [], {}
    for name, weight in WEIGHTS:
        f = TTFont(font_dir / f"ZenMaruGothic-{name}.ttf")
        opt = subset.Options()
        opt.flavor = "woff2"
        opt.layout_features = ["*"]
        sub = subset.Subsetter(options=opt)
        sub.populate(text=text)
        sub.subset(f)
        buf = io.BytesIO()
        f.flavor = "woff2"
        f.save(buf)
        data = buf.getvalue()
        sizes[name] = len(data)
        css.append(f"@font-face{{font-family:'Zen Maru Gothic';font-style:normal;font-weight:{weight};font-display:swap;"
                   f"src:url(data:font/woff2;base64,{b64(data)}) format('woff2')}}")
    return "\n".join(css), sizes


def main():
    font_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "fonts"
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    css = (ROOT / "css" / "style.css").read_text(encoding="utf-8")
    js = (ROOT / "js" / "app.js").read_text(encoding="utf-8")
    words = (ROOT / "data" / "words.js").read_text(encoding="utf-8")

    # 使っている字（画面の文字・辞書の文字・英数字）
    chars = set(html + css + js + words)
    chars |= {chr(c) for c in range(0x20, 0x7f)}
    chars |= set("　、。・「」『』（）！？ー〜…★☆○×")
    text = "".join(sorted(c for c in chars if c.isprintable()))
    faces, fsizes = font_faces(font_dir, text)

    # 画像と音
    assets, asizes = {}, {"画像": 0, "音": 0}
    for p in sorted(list((ROOT / "img").rglob("*.webp")) + list((ROOT / "audio").glob("*.mp3"))):
        rel = p.relative_to(ROOT).as_posix()
        data = p.read_bytes()
        assets[rel] = f"data:{MIME[p.suffix]};base64,{b64(data)}"
        asizes["音" if p.suffix == ".mp3" else "画像"] += len(data)

    # </script> だけを書きかえる（プログラムの中の「</」をこわさないように）
    safe = lambda s: re.sub(r"</(script)", r"<\\/\1", s, flags=re.I)
    html = re.sub(r'<link rel="preconnect"[^>]*>\n?', "", html)
    html = re.sub(r'<link href="https://fonts.googleapis.com[^>]*>\n?', "", html)
    html = html.replace('<link rel="stylesheet" href="css/style.css">', f"<style>\n{faces}\n{css}\n</style>")
    html = html.replace('<script src="data/words.js"></script>',
                        f"<script>\n{safe(words)}\n</script>\n<script>window.KIMOCHI_ASSETS = {safe(json.dumps(assets))};</script>")
    html = html.replace('<script src="js/app.js"></script>', f"<script>\n{safe(js)}\n</script>")
    assert "fonts.googleapis" not in html and 'src="js/' not in html and 'href="css/' not in html

    OUT.parent.mkdir(exist_ok=True)
    OUT.write_bytes(html.encode("utf-8"))
    size = OUT.stat().st_size
    mb = lambda n: f"{n / 1024 / 1024:.2f}MB"
    print(f"できあがり: {OUT.relative_to(ROOT)}  {mb(size)}（上限 10MB まで あと {mb(LIMIT - size)}）")
    print(f"  画像 {mb(asizes['画像'])} / 音 {mb(asizes['音'])}（元のまま） / 文字 {mb(sum(fsizes.values()))}（{len(text)}字）")
    if size > LIMIT:
        sys.exit("10MB をこえました")


if __name__ == "__main__":
    main()
