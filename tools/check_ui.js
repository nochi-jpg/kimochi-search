// 見た目チェック：全画面を開いて、スクリーンショットと「はみ出し・重なり・画面切れ」を自動で調べる
// 使い方: (ks-repo で) python3 -m http.server 8765 &  →  node tools/check_ui.js [出力フォルダ]
const { chromium } = require('playwright');
const OUT = process.argv[2] || '/tmp/shots';
require('fs').mkdirSync(OUT, { recursive: true });

const CHECK = () => {
  const stage = document.getElementById('stage');
  const sr = stage.getBoundingClientRect();
  const s = sr.width / 1280;
  const problems = [];
  const vis = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
  const inScroll = el => el.closest('.scv.on');
  const name = el => (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : el.tagName) + '「' + (el.textContent || '').trim().slice(0, 14) + '」';
  // 画面切れ
  stage.querySelectorAll('button, h1, h2, img, .bb, .qsent, .lk, .nav, .pips, .trk').forEach(el => {
    if (!vis(el) || inScroll(el)) return;
    const r = el.getBoundingClientRect();
    if (r.left < sr.left - 1 || r.top < sr.top - 1 || r.right > sr.right + 1 || r.bottom > sr.bottom + 1) problems.push('画面切れ ' + name(el));
  });
  // 文字のはみ出し（… で省略している所はのぞく）
  stage.querySelectorAll('button, span, h1, h2, p, div').forEach(el => {
    if (!vis(el) || el.children.length > 3) return;
    const cs = getComputedStyle(el);
    if (cs.textOverflow === 'ellipsis') { if (el.scrollWidth > el.clientWidth + 1) problems.push('…で切れている ' + name(el)); return; }
    if (el.classList.contains('star')) return;
    if (el.classList.contains('scv') || el.classList.contains('scw')) return;
    if (el.scrollWidth > el.clientWidth + 2 && cs.overflowX !== 'visible' ) problems.push('はみ出し(横) ' + name(el));
    if (el.matches('.cd,.fc,.pill,.qc,.sb,.pb,.chip,.sg,.lbl,.qbig,.nextb') && (el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2)) problems.push('はみ出し ' + name(el));
  });
  // 中の文字が枠からはみ出していないか（ボタンの中身）
  stage.querySelectorAll('.cd,.fc,.pill,.qc,.sb,.pb,.chip,.sg,.star,.qbig,.nextb').forEach(el => {
    if (!vis(el)) return;
    const r = el.getBoundingClientRect();
    el.querySelectorAll('*').forEach(c => {
      if (c.classList.contains('tip') || c.classList.contains('cbar') || c.classList.contains('fimg') || !vis(c)) return;
      const q = c.getBoundingClientRect();
      if (q.left < r.left - 1 || q.right > r.right + 1 || q.top < r.top - 1 || q.bottom > r.bottom + 1) problems.push('枠からはみ出し ' + name(c) + ' in ' + name(el));
    });
  });
  // 重なり
  const parts = [...stage.querySelectorAll('.cd,.fc,.pill,.qc,.sb,.pb,.ic,.chip,.trk,.hb,.wimg,.mini,.nav,.pips,.qsent,.qfb,.bb,.wtop,.wmean,.lk,.ask h2,.ask .sub,.qbig,.lineup,.credit,.pager')].filter(vis);
  const shrink = (r, d) => ({ left: r.left + d, top: r.top + d, right: r.right - d, bottom: r.bottom - d });
  for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
    const a = parts[i], b = parts[j];
    if (a.contains(b) || b.contains(a)) continue;
    if (!!a.closest('.ov') !== !!b.closest('.ov')) continue;
    const ra = shrink(a.getBoundingClientRect(), 1), rb = shrink(b.getBoundingClientRect(), 1);
    // スクロールの中で隠れている部分はのぞく
    const clip = el => { const v = inScroll(el); return v ? v.getBoundingClientRect() : null; };
    const ca = clip(a), cb = clip(b);
    const cut = (r, c) => c ? { left: Math.max(r.left, c.left), top: Math.max(r.top, c.top), right: Math.min(r.right, c.right), bottom: Math.min(r.bottom, c.bottom) } : r;
    const A = cut(ra, ca), Bq = cut(rb, cb);
    if (A.right <= A.left || A.bottom <= A.top || Bq.right <= Bq.left || Bq.bottom <= Bq.top) continue;
    if (A.left < Bq.right && Bq.left < A.right && A.top < Bq.bottom && Bq.top < A.bottom) problems.push('重なり ' + name(a) + ' × ' + name(b));
  }
  return [...new Set(problems)];
};

(async () => {
  const browser = await chromium.launch();
  const report = [];
  for (const vp of [{ width: 1366, height: 768 }, { width: 1280, height: 720 }]) {
    const page = await browser.newPage({ viewport: vp });
    await page.goto('http://localhost:8765/index.html');
    await page.waitForTimeout(800);
    let n = 0;
    const snap = async (label) => {
      await page.waitForTimeout(1300);
      const probs = await page.evaluate(CHECK);
      n++;
      const f = `${OUT}/${vp.width}_${String(n).padStart(2, '0')}_${label}.png`;
      if (vp.width === 1366) await page.screenshot({ path: f });
      report.push({ vp: vp.width, label, probs });
    };
    const click = async (sel) => { await page.click(sel); };
    await snap('はじめて');
    await click('[data-first="3"]');
    await snap('タイトル');
    await click('[data-act="goK"]');
    const jumped = [];
    await page.mouse.move(5, 700);
    for (const f of ['ureshii', 'tanoshii', 'okoru', 'kanashii', 'dokidoki', 'hotto', 'bikkuri']) {
      await page.hover(`[data-feel="${f}"]`);
      await page.waitForTimeout(80);
      if (await page.evaluate((f) => document.querySelector(`[data-mini="${f}"]`).classList.contains('jump'), f)) jumped.push(f);
      await page.mouse.move(5, 700);
    }
    report.push({ vp: vp.width, label: 'キャラが跳ねる', probs: jumped.length === 7 ? [] : ['跳ねないキャラがある: ' + ['ureshii', 'tanoshii', 'okoru', 'kanashii', 'dokidoki', 'hotto', 'bikkuri'].filter(f => !jumped.includes(f)).join(',')] });
    await page.hover('[data-feel="ureshii"]');
    await snap('きもち');
    await click('[data-feel="dokidoki"]');
    await snap('ドキドキ');
    await click('[data-doki="all"]');
    await snap('ジャンル_ドキドキ');
    await click('[data-gen="karada"]');
    await snap('ことば_ドキドキからだ');
    await click('[data-act="title"]');
    await click('[data-act="goK"]');
    await click('[data-feel="ureshii"]');
    await click('[data-gen="tsuyosa"]');
    await snap('ことば_つよさ');
    await click('[data-key="ws"][data-val="hard"]');
    await snap('ことば_つよさ_むずかしい順');
    await click('[data-act="back"]');
    await click('[data-gen="karada"]');
    await snap('ことば_うれしいからだ');
    await click('.cd[data-word]');
    await snap('ことば画面');
    await page.evaluate(() => { const b = document.querySelector('[data-open]'); if (b) b.click(); });
    await snap('ここにもあるよ');
    // いちばん長い言葉
    await page.evaluate(() => {});
    await click('[data-act="title"]');
    await click('[data-act="goB"]');
    await snap('ばめん');
    await click('[data-scene="happyokai"]');
    await snap('ばめん_発表会');
    await click('.cd[data-word]');
    await snap('ばめん_ことば');
    await click('[data-favtoggle]');
    await click('[data-act="favs"]');
    await snap('おきにいり');
    await click('[data-act="title"]');
    await click('[data-act="list"]');
    await snap('リスト');
    await click('[data-act="set"]');
    await snap('せってい');
    await click('[data-act="credit"]');
    await snap('クレジット');
    await click('.panel [data-act="set"]');
    await click('[data-set="paging"][data-val="page"]');
    await click('[data-act="closeov"]');
    await snap('リスト_ページおくり');
    await click('[data-key="so"][data-val="hard"]');
    await snap('リスト_むずかしい');
    await click('[data-act="set"]');
    await click('[data-set="star"][data-val="1"]');
    await click('[data-act="closeov"]');
    await snap('リスト_星1');
    await click('[data-act="set"]');
    await click('[data-set="star"][data-val="3"]');
    await click('[data-set="paging"][data-val="scroll"]');
    await click('[data-act="closeov"]');
    await click('[data-act="title"]');
    await click('[data-act="quiz"]');
    await snap('クイズ');
    await click('[data-quizn="10"]');
    await snap('クイズ_問題');
    for (let i = 0; i < 10; i++) {
      await click('.qc');
      if (i === 0) await snap('クイズ_答え');
      await click('[data-act="qnext"]');
    }
    await snap('クイズ_けっか');
    // 長い言葉のことば画面（全部の言葉を開いて、はみ出しを調べる）
    const ids = await page.evaluate(() => window.KIMOCHI_WORDS.map(w => w.id));
    const bad = [];
    for (const id of ids) {
      await page.evaluate((id) => { const b = document.createElement('button'); b.dataset.open = id; document.getElementById('stage').appendChild(b); b.click(); }, id);
      await page.waitForTimeout(950);
      const p = await page.evaluate(CHECK);
      if (p.length) bad.push(id + ' ' + p.join(' / '));
    }
    report.push({ vp: vp.width, label: '全ことば画面', probs: bad });
    await page.close();
  }
  await browser.close();
  for (const r of report) console.log(`[${r.vp}] ${r.label}: ${r.probs.length ? '\n   ' + r.probs.join('\n   ') : 'OK'}`);
})();
