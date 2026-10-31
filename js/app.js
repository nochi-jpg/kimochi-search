/* きもちをあらわすことばじてん  さくしゃ：K.nom */
(() => {
  'use strict';

  // ---------- データ ----------
  const WORDS = window.KIMOCHI_WORDS || [];
  const WM = {};
  WORDS.forEach(w => { WM[w.id] = w; });

  const FEEL = [
    { id: 'ureshii', label: 'うれしい', h: 50, field: '#FFE04A' },
    { id: 'tanoshii', label: 'たのしい', h: 30, field: '#FFAD5C' },
    { id: 'okoru', label: 'おこる', h: 6, field: '#F4806E' },
    { id: 'kanashii', label: 'かなしい', h: 212, field: '#8FB3DB' },
    { id: 'dokidoki', label: 'ドキドキ', sub: 'しんぱい・きんちょう\nはずかしい', h: 255, field: '#BCAEF2' },
    { id: 'hotto', label: 'ほっとする', h: 140, field: '#98D9A8' },
    { id: 'bikkuri', label: 'びっくり', h: 338, field: '#FF96BE' }
  ];
  const FM = {}; FEEL.forEach((f, i) => { f.i = i; FM[f.id] = f; });
  const GEN = [
    { id: 'tsuyosa', label: 'つよさ', sub: 'どのくらい？' },
    { id: 'tatoe', label: 'たとえ', sub: '〜のような' },
    { id: 'karada', label: 'からだ', sub: '顔や体のようす' },
    { id: 'oto', label: '音・ようす', sub: 'ウキウキ など' },
    { id: 'kanyo', label: 'かんようく', sub: 'むかしからの言い方' }
  ];
  const GM = {}; GEN.forEach((g, i) => { g.i = i; GM[g.id] = g; });
  const DOKI = [
    { id: 'shinpai', label: 'しんぱい', sub: 'どうしよう…', img: 'img/chara/stand_dokidoki.webp' },
    { id: 'kinchou', label: 'きんちょう', sub: '体がかたくなる', img: 'img/chara/sit_dokidoki.webp' },
    { id: 'hazukashii', label: 'はずかしい', sub: '顔があつくなる', img: 'img/words/dokidoki-13.webp' },
    { id: 'all', label: 'ぜんぶ', sub: 'こいのドキドキも', img: 'img/chara/sit_koi.webp' }
  ];
  const DM = {}; DOKI.forEach(d => { DM[d.id] = d; });
  const SCENES = [['undokai', '運動会'], ['ensoku', '遠足・修学旅行'], ['happyokai', '発表会・音楽会'], ['test', 'テスト'], ['naraigoto', '習いごと・試合'], ['tanjoubi', '誕生日・プレゼント'], ['kenka', '友だちとけんか'], ['nakanaori', 'なかなおり'], ['shikarareta', 'しかられた'], ['pet', 'ペット・生きもの'], ['hajimete', 'はじめての体験'], ['owakare', 'おわかれ']];
  const SM = {}; SCENES.forEach(s => { SM[s[0]] = s[1]; });
  const STAR_TIP = ['', '1・2年生でもつかえる言葉', '3・4年生むけの言葉', '5・6年生むけの言葉'];
  const MSG = {
    5: [[0, 2, 'hotto', ['だいじょうぶ！まちがえた ことばは、もう一回 見れば おぼえられるよ。', 'ここから ぐんと のびるよ。つぎも ちょうせんしてみよう！']],
        [3, 4, 'tanoshii', ['いいね！ことばの 力が ついてきたよ。', 'よく がんばったね！あと少しで ぜんもん正解！']],
        [5, 5, 'ureshii', ['すごい！ぜんもん正解！ことばの 名人だね。', 'パーフェクト！作文でも つかってみよう！']]],
    10: [[0, 3, 'hotto', ['むずかしかったね。でも、ちょうせんした人が いちばん のびるんだよ。', 'まちがえた ことばを お気に入りにして、いっしょに おぼえていこう。']],
         [4, 6, 'hotto', ['その調子！半分くらい わかってきたね。', 'おしい！もう一回やれば、もっと正解できるよ。']],
         [7, 9, 'tanoshii', ['すばらしい！たくさんの ことばを 知っているね。', 'すごいね！作文が もっと楽しくなりそう！']],
         [10, 10, 'ureshii', ['10問ぜんぶ正解！きみは ことばはかせだ！', 'かんぺき！どんな気持ちも ことばにできるね！']]]
  };

  // ---------- 保存 ----------
  const LS = {
    get(k, d) { try { const v = localStorage.getItem('kimochi.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('kimochi.' + k, JSON.stringify(v)); } catch (e) { /* 保存できなくても動く */ } }
  };
  let settings = LS.get('settings', null);
  let firstRun = !settings;
  if (!settings) settings = { star: 3, paging: 'scroll', favBtn: true };
  let favs = LS.get('favs', []).filter(id => WM[id]);

  // ---------- 状態 ----------
  let cur = { scr: 'title' };
  const backS = [], fwdS = [];
  let overlay = firstRun ? 'first' : null;
  let quiz = null;
  const stage = document.getElementById('stage');

  // ---------- 道具 ----------
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const RUBY = /｜?([一-鿿々〆ヶ]+)《([^》]+)》/g;
  const ruby = s => esc(s).replace(RUBY, '<ruby>$1<rt>$2</rt></ruby>').replace(/｜/g, '');
  const plain = s => s.replace(RUBY, '$1').replace(/｜/g, '');
  const ok = w => w.star <= settings.star;
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const bar = (h, o) => `hsl(${h + (o || 0)} 78% 56%)`;
  const yomi = (a, b) => a.reading.localeCompare(b.reading, 'ja');
  const faceOf = f => `img/chara/face_${f}.webp`;
  const imgOf = w => w.img ? `img/words/${w.id}.webp` : (w.tags.includes('koi') ? 'img/chara/sit_koi.webp' : `img/chara/sit_${w.feeling}.webp`);
  const nfs = s => s.length <= 5 ? 30 : s.length <= 8 ? 24 : s.length <= 10 ? 20 : 17;
  const cfs = s => s.length <= 6 ? 96 : s.length <= 9 ? 64 : s.length <= 13 ? 44 : 38;
  const stars = n => '★'.repeat(n) + '☆'.repeat(3 - n);
  const ARRSVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>';
  const ARR = `<span class="arr" aria-hidden="true">${ARRSVG}</span>`;
  const SVG = {
    back: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    fwd: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
    close: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    set: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg>',
    heart: (fill) => `<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.2a4.2 4.2 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z" fill="${fill}" stroke="#1A1A1A" stroke-width="2" stroke-linejoin="round"/></svg>`
  };
  const isFav = id => favs.includes(id);

  // ---------- 画面の移動（もどる・すすむ は、ひとつ前の画面へ） ----------
  function go(st) { backS.push(cur); fwdS.length = 0; cur = st; render(); }
  function back() { if (backS.length) { fwdS.push(cur); cur = backS.pop(); } else { cur = { scr: 'title' }; } render(); }
  function fwd() { if (fwdS.length) { backS.push(cur); cur = fwdS.pop(); render(); } }
  function openWord(id) {
    const w = WM[id];
    go({ scr: 'k', f: w.feeling, t: w.feeling === 'dokidoki' ? 'all' : null, g: w.genres[0], id });
  }
  function setPage(p) { cur = Object.assign({}, cur, { pg: p }); render(); }
  function setKey(k, v) { cur = Object.assign({}, cur, { [k]: v, pg: 0 }); render(); }

  // ---------- 部品 ----------
  function header() {
    return `<header class="hd">
      <button class="ic" data-act="back" aria-label="もどる">${SVG.back}</button>
      <button class="ic" data-act="fwd" aria-label="すすむ" ${fwdS.length ? '' : 'disabled'}>${SVG.fwd}</button>
      <span class="name">きもちをあらわすことばじてん</span>
      <button class="ic" data-act="set" aria-label="せってい">${SVG.set}</button>
      <button class="ic" data-act="title" aria-label="タイトルにもどる">${SVG.close}</button>
    </header>`;
  }
  function heartBtn() {
    return `<button class="hb" data-act="favs" aria-label="おきにいりを ひらく">${SVG.heart('#FF5C7A')}<span class="hcount">${favs.length}</span></button>`;
  }
  function navHtml(steps, total, done) {
    let h = '<nav class="nav" aria-label="いまいるところ">';
    steps.forEach((s, i) => {
      const last = i === steps.length - 1;
      const icon = s.face ? `<img class="sf" src="${s.face}" alt="">` : '<span class="sd" aria-hidden="true"></span>';
      h += `<button class="stp${last ? ' cur' : ''}" style="animation-delay:${i * 0.05}s" ${last ? '' : `data-crumb="${i}"`}>${icon}<span class="stl"${s.label.length > 7 ? ` style="font-size:${s.label.length > 12 ? 15 : s.label.length > 9 ? 17 : 20}px"` : ''}>${esc(s.label)}</span></button>`;
      if (!last || !done) h += '<span class="conn" aria-hidden="true"></span>';
    });
    if (!done) h += '<span class="ghost"><span class="sd" aria-hidden="true"></span>えらぶ</span>';
    h += '</nav><div class="pips" aria-hidden="true">';
    for (let i = 0; i < total; i++) h += `<span class="pip${i === steps.length - 1 ? ' on' : i < steps.length - 1 ? ' done' : ''}"></span>`;
    return h + '</div>';
  }
  function askHtml(title, sub, chips) {
    return `<div class="ask"><h2>${esc(title)}</h2>${chips ? `<div class="askrow"><span class="sub">${esc(sub)}</span>${chips}</div>` : `<span class="sub">${esc(sub)}</span>`}</div>`;
  }
  function chipsHtml(opts, curv, key) {
    return '<div class="chips">' + opts.map(o => `<button class="chip${curv === o[0] ? ' on' : ''}" data-key="${key}" data-val="${o[0]}">${esc(o[1])}</button>`).join('') + '</div>';
  }
  // たくさんあるときの見せ方（スクロール／ページおくり）
  function listBlock(cells, per, rowH, gap, rows, gridCls, pagerW) {
    const scroll = settings.paging === 'scroll';
    const pages = Math.max(1, Math.ceil(cells.length / per));
    const pg = Math.min(cur.pg || 0, pages - 1);
    const show = scroll ? cells : cells.slice(pg * per, pg * per + per);
    const need = cells.length > per;
    let h = '<div class="scw">';
    if (scroll && need) {
      const viewH = rows * rowH + (rows - 1) * gap + gap + Math.round(rowH * 0.28) + 16;
      h += `<div class="scv on" style="height:${viewH}px"><div class="${gridCls}">${show.join('')}</div></div><div class="trk" style="height:${viewH - 16}px;margin-top:0"><div class="thm"></div></div>`;
    } else {
      h += `<div class="scv"><div class="${gridCls}">${show.join('')}</div></div>`;
    }
    h += '</div>';
    if (!scroll && need) {
      h += `<div class="pager" style="width:${pagerW}px"><button class="ic" data-act="pgprev" aria-label="まえの ページ" ${pg === 0 ? 'disabled' : ''}>${SVG.back}</button><span>${pg + 1} / ${pages}</span><button class="ic" data-act="pgnext" aria-label="つぎの ページ" ${pg >= pages - 1 ? 'disabled' : ''}>${SVG.fwd}</button></div>`;
    }
    return h;
  }
  function wordCard(w, i, opt) {
    const d = (Math.min(i, 8) * 0.04).toFixed(2);
    const f = FM[w.feeling];
    const dots = opt.dots ? `<span class="dots" aria-label="つよさ ${w.strength}">${[1, 2, 3, 4, 5].map(k => `<span class="dot${k <= w.strength ? ' on' : ''}"></span>`).join('')}</span>` : '';
    const face = opt.face ? `<img class="cface" src="${faceOf(w.feeling)}" alt="">` : '';
    return `<button class="cd" data-word="${w.id}" style="--d:${d}s;animation-delay:${d}s;--bar:${bar(f.h, opt.off ? (i % 6 - 2.5) * 9 : 0)};--arr:${f.field}"><span class="cbar" aria-hidden="true"></span><span class="lbl" style="font-size:${nfs(w.word)}px"><span>${esc(w.word)}</span></span><span class="rule" aria-hidden="true"></span><span class="rd" style="font-size:${w.reading.length > 10 ? 12 : 14}px">${w.showReading ? esc(w.reading) : ''}</span>${dots}${face}${ARR}</button>`;
  }
  function simpleCard(label, sub, attrs, i, barC, arrC) {
    const d = (i * 0.05).toFixed(2);
    return `<button class="cd" ${attrs} style="animation-delay:${d}s;--bar:${barC};--arr:${arrC}"><span class="cbar" aria-hidden="true"></span><span class="lbl" style="font-size:${nfs(label)}px"><span>${esc(label)}</span></span><span class="rule" aria-hidden="true"></span><span class="rd">${esc(sub)}</span>${ARR}</button>`;
  }
  function sortWords(list, mode, primary) {
    const a = list.slice();
    if (mode === 'str') a.sort((x, y) => (x.strength || 0) - (y.strength || 0) || yomi(x, y));
    else if (mode === 'easy') a.sort((x, y) => x.star - y.star || yomi(x, y));
    else if (mode === 'hard') a.sort((x, y) => y.star - x.star || yomi(x, y));
    else if (mode === 'feel') a.sort((x, y) => FM[x.feeling].i - FM[y.feeling].i || GM[x.genres[0]].i - GM[y.genres[0]].i || yomi(x, y));
    else if (mode === 'genre') a.sort((x, y) => GM[x.genres[0]].i - GM[y.genres[0]].i || FM[x.feeling].i - FM[y.feeling].i || yomi(x, y));
    else a.sort(yomi);
    return a;
  }

  // ---------- 画面：タイトル ----------
  function titleHtml() {
    const chars = 'きもちをあらわすことばじてん'.split('').map((c, i) => `<span class="ch" aria-hidden="true" style="animation-delay:${(0.1 + i * 0.05).toFixed(2)}s, ${(-i * 0.35).toFixed(2)}s">${c}</span>`).join('');
    const lineup = FEEL.map((f, i) => `<img src="img/chara/stand_${f.id}.webp" alt="" style="animation-delay:${(-i * 0.45).toFixed(2)}s">`).join('');
    return `<div class="title">
      <h1 aria-label="きもちをあらわすことばじてん">${chars}</h1>
      <div style="display:flex;gap:28px">
        <button class="pb" data-act="goK" style="animation-delay:.5s">きもちから さがす<span class="arr" style="--arr:#FFE04A" aria-hidden="true">${ARRSVG}</span></button>
        <button class="pb" data-act="goB" style="animation-delay:.6s">ばめんから さがす<span class="arr" style="--arr:#8FB3DB" aria-hidden="true">${ARRSVG}</span></button>
      </div>
      <div style="display:flex;gap:20px">
        <button class="sb" data-act="quiz" style="animation-delay:.7s">クイズ</button>
        <button class="sb" data-act="favs" style="animation-delay:.75s">おきにいり</button>
        <button class="sb" data-act="list" style="animation-delay:.8s">リスト</button>
        <button class="sb" data-act="set" style="animation-delay:.85s">せってい</button>
      </div>
    </div>
    <div class="lineup" aria-hidden="true">${lineup}</div>
    <div class="credit">さくしゃ：K.nom</div>`;
  }

  // ---------- 画面：きもちから さがす ----------
  function kSteps(s) {
    const st = [{ label: 'きもち', st: { scr: 'k' } }];
    if (s.f) st.push({ label: FM[s.f].label, face: faceOf(s.f), st: { scr: 'k', f: s.f } });
    if (s.f === 'dokidoki' && s.t) st.push({ label: DM[s.t].label, st: { scr: 'k', f: s.f, t: s.t } });
    if (s.g) st.push({ label: GM[s.g].label, st: { scr: 'k', f: s.f, t: s.t, g: s.g } });
    if (s.id) st.push({ label: WM[s.id].word, st: Object.assign({}, s) });
    return st;
  }
  function kHtml() {
    const s = cur, f = s.f && FM[s.f];
    const steps = kSteps(s);
    const total = s.f === 'dokidoki' ? 5 : 4;
    let h = header() + navHtml(steps, total, !!s.id) + heartBtn();
    if (!s.f) {
      h += '<div class="main">' + askHtml('どんな きもち？', 'いちばん近い きもちを えらぼう') + '<div class="grid4">';
      h += FEEL.map((x, i) => `<button class="fc" data-feel="${x.id}" style="animation-delay:${(i * 0.05).toFixed(2)}s;--bar:${bar(x.h)}"><span class="cbar" aria-hidden="true"></span><img class="fimg" src="img/chara/stand_${x.id}.webp" alt=""><span class="flbl">${x.label}</span><span class="fsub">${x.sub || ''}</span></button>`).join('');
      h += '</div></div>';
      h += '<div class="mini" aria-hidden="true">' + FEEL.map((x, i) => `<img data-mini="${x.id}" src="img/chara/stand_${x.id}.webp" alt="" style="animation-delay:${(-i * 0.45).toFixed(2)}s">`).join('') + '</div>';
      return h;
    }
    if (s.f === 'dokidoki' && !s.t) {
      h += '<div class="main">' + askHtml('どんな ドキドキ？', 'いちばん近いものを えらぼう') + '<div class="grid4">';
      h += DOKI.map((x, i) => `<button class="fc" data-doki="${x.id}" style="animation-delay:${(i * 0.05).toFixed(2)}s;--bar:${bar(f.h, (i - 1.5) * 10)}"><span class="cbar" aria-hidden="true"></span><img class="fimg" src="${x.img}" alt=""><span class="flbl">${x.label}</span><span class="fsub">${x.sub}</span></button>`).join('');
      return h + '</div></div>';
    }
    if (!s.g) {
      h += '<div class="main">' + askHtml('どうやって さがす？', `「${s.t && s.t !== 'all' ? DM[s.t].label : f.label}」の 言いかたを さがそう`) + '<div class="grid3">';
      h += GEN.map((g, i) => simpleCard(g.label, g.sub, `data-gen="${g.id}"`, i, bar(f.h, (i - 2) * 8), f.field)).join('');
      return h + '</div></div>';
    }
    if (!s.id) {
      let list = WORDS.filter(w => ok(w) && w.feeling === s.f && w.genres.includes(s.g) && (s.f !== 'dokidoki' || s.t === 'all' || w.tags.includes(s.t)));
      const isStr = s.g === 'tsuyosa';
      const opts = [];
      if (isStr) opts.push(['str', 'つよさ順']);
      if (settings.star > 1) opts.push(['easy', 'かんたんな言葉順'], ['hard', 'むずかしい言葉順']);
      opts.push(['aiu', 'あいうえお順']);
      const mode = s.ws && opts.some(o => o[0] === s.ws) ? s.ws : (isStr ? 'str' : 'aiu');
      list = sortWords(list, mode);
      h += '<div class="main">' + askHtml('どの ことばが ぴったり？', 'さわって くわしく 見てみよう', chipsHtml(opts, mode, 'ws'));
      if (!list.length) h += '<p class="empty">まだ ことばが ないよ</p>';
      else h += listBlock(list.map((w, i) => wordCard(w, i, { dots: isStr, off: true })), 6, 170, 36, 2, 'grid3', 816);
      return h + '</div>';
    }
    return h + wordHtml(WM[s.id]);
  }

  // ---------- 画面：ばめんから さがす ----------
  function bHtml() {
    const s = cur;
    const steps = [{ label: 'ばめん', st: { scr: 'b' } }];
    if (s.s) steps.push({ label: SM[s.s], st: { scr: 'b', s: s.s } });
    if (s.id) steps.push({ label: WM[s.id].word, face: faceOf(WM[s.id].feeling), st: Object.assign({}, s) });
    let h = header() + navHtml(steps, 3, !!s.id) + heartBtn();
    if (!s.s) {
      h += '<div class="main">' + askHtml('どんな ばめん？', '作文に書く ばめんを えらぼう');
      h += listBlock(SCENES.map((sc, i) => simpleCard(sc[1], `ことば ${WORDS.filter(w => ok(w) && w.scenes.includes(sc[0])).length}こ`, `data-scene="${sc[0]}"`, Math.min(i, 8), '#1A1A1A', '#FFFFFF')), 6, 170, 36, 2, 'grid3', 816);
      return h + '</div>';
    }
    if (!s.id) {
      const list = sortWords(WORDS.filter(w => ok(w) && w.scenes.includes(s.s)), 'feel');
      h += '<div class="main">' + askHtml('この ばめんで つかえる ことば', `${SM[s.s]}の 作文に つかってみよう`);
      h += listBlock(list.map((w, i) => wordCard(w, i, { face: true })), 6, 170, 36, 2, 'grid3', 816);
      return h + '</div>';
    }
    return h + wordHtml(WM[s.id]);
  }

  // ---------- 画面：ことば ----------
  function wordHtml(w) {
    const same = w.same.map(id => WM[id]).filter(x => x && ok(x));
    const rel = w.related.map(id => WM[id]).filter(x => x && ok(x));
    const showDots = w.strength && w.genres.includes('tsuyosa');
    let lk = '';
    if (same.length) lk += '<span class="lkt">ここにもあるよ</span>' + same.map(x => `<button class="lkb" data-open="${x.id}">${FM[x.feeling].label}の「${esc(x.word)}」</button>`).join('');
    if (rel.length) lk += `<span class="lkt"${same.length ? ' style="margin-left:14px"' : ''}>にている ことば</span>` + rel.map(x => `<button class="lkb" data-open="${x.id}">${esc(x.word)}</button>`).join('');
    return `<img class="wimg" src="${imgOf(w)}" alt="">
    <section class="wd">
      <div class="wtop"><span class="wread">${w.showReading ? esc(w.reading) : ''}</span><h2 class="wword" style="font-size:${cfs(w.word)}px">${esc(w.word)}</h2></div>
      <div class="wrow" style="animation-delay:.06s">
        <button class="star" aria-label="${STAR_TIP[w.star]}">${stars(w.star)}<span class="tip">${STAR_TIP[w.star]}</span></button>
        ${settings.favBtn ? `<button class="fav${isFav(w.id) ? ' on' : ''}" data-favtoggle="${w.id}" aria-label="おきにいり" aria-pressed="${isFav(w.id)}">${SVG.heart(isFav(w.id) ? '#FF5C7A' : 'none')}</button>` : ''}
        ${showDots ? `<span class="wdots">つよさ${[1, 2, 3, 4, 5].map(k => `<span class="dot${k <= w.strength ? ' on' : ''}"></span>`).join('')}</span>` : ''}
      </div>
      <p class="wmean" style="animation-delay:.12s">${ruby(w.meaning)}</p>
      <div class="bbs" style="animation-delay:.22s">
        <div class="bb"><span class="lab" style="background:#E8E8E8;color:#3A3A3A">まえ</span><span style="color:#4A4A4A">${ruby(w.before)}</span></div>
        <div class="bb"><span class="lab" style="background:#1A1A1A;color:#fff">あと</span><span style="font-weight:900">${ruby(w.after)}</span></div>
      </div>
      <div class="lk" style="animation-delay:.32s">${lk}</div>
    </section>`;
  }

  // ---------- 画面：リスト・おきにいり ----------
  function listHtml(isFavs) {
    const s = cur;
    const opts = [['feel', 'きもち'], ['aiu', 'あいうえお'], ['genre', 'ジャンル']];
    if (settings.star > 1) opts.push(['easy', 'かんたん'], ['hard', 'むずかしい']);
    const mode = s.so && opts.some(o => o[0] === s.so) ? s.so : 'feel';
    const base = isFavs ? favs.map(id => WM[id]).filter(Boolean) : WORDS.filter(ok);
    const list = sortWords(base, mode);
    const tagOf = w => mode === 'feel' ? FM[w.feeling].label : mode === 'genre' ? GM[w.genres[0]].label : mode === 'aiu' ? w.reading.slice(0, 1) : stars(w.star).replace(/☆/g, '');
    const cells = list.map((w, i) => `<button class="pill" data-open="${w.id}" style="animation-delay:${(Math.min(i, 12) * 0.02).toFixed(2)}s"><img src="${faceOf(w.feeling)}" alt=""><span class="pw"${w.word.length > 11 ? ` style="font-size:${w.word.length > 12 ? 14 : 15}px"` : ''}>${esc(w.word)}</span><span class="pt">${esc(tagOf(w))}</span></button>`);
    let h = header() + '<div class="wide"><div class="ask"><h2>' + (isFavs ? 'おきにいり' : 'ことばリスト') + '</h2>';
    h += `<div class="askrow" style="width:1108px"><span class="sub">${isFavs ? `${list.length}この ことば` : `ぜんぶで ${list.length}この ことば`}</span><div class="chips"><span class="sub" style="font-size:15px;margin-right:4px">ならびかた</span>${chipsHtml(opts, mode, 'so').replace(/^<div class="chips">|<\/div>$/g, '')}</div></div></div>`;
    if (!list.length) h += '<p class="empty">まだ ないよ。ことばの ハートを おしてね</p>';
    else h += listBlock(cells, 15, 56, 12, 5, 'gridL', 1108);
    return h + '</div>';
  }

  // ---------- 画面：クイズ ----------
  function makeQ(e) {
    let cand = e.distractors.map(id => WM[id]).filter(d => d && d.quiz && ok(d));
    if (cand.length < 3) cand = e.distractors.map(id => WM[id]).filter(d => d && d.quiz);
    const picked = [], seen = new Set([plain(e.quiz)]), words = new Set([e.word]);
    for (const d of shuffle(cand)) {
      const q = plain(d.quiz);
      if (seen.has(q) || words.has(d.word)) continue;
      seen.add(q); words.add(d.word); picked.push(d);
      if (picked.length === 3) break;
    }
    return { e, choices: shuffle([e].concat(picked)), ans: null };
  }
  function startQuiz(n) {
    const pool = WORDS.filter(w => w.quiz && ok(w));
    let deck = LS.get('deck', []).filter(id => WM[id] && WM[id].quiz && ok(WM[id]));
    const qs = [], usedWords = new Set();
    let guard = 0;
    while (qs.length < Math.min(n, pool.length) && guard++ < 1000) {
      if (!deck.length) deck = shuffle(pool.map(w => w.id).filter(id => !qs.includes(id)));
      const id = deck.shift();
      if (usedWords.has(WM[id].word)) continue;
      usedWords.add(WM[id].word);
      qs.push(id);
    }
    LS.set('deck', deck);
    quiz = { n: qs.length, i: 0, score: 0, qs: qs.map(id => makeQ(WM[id])), done: false };
    cur = Object.assign({}, cur, { qk: Date.now() });
    render();
  }
  function quizHtml() {
    let h = header();
    if (!quiz) {
      h += `<div class="qwrap"><div class="ask" style="align-items:center"><h2>ことばクイズ</h2><span class="sub">文に ぴったりの ことばを えらぼう</span></div>
        <div class="qstart"><button class="qbig" data-quizn="5">5もん<small>さくっと</small></button><button class="qbig" data-quizn="10" style="animation-delay:.08s">10もん<small>じっくり</small></button></div></div>`;
      return h;
    }
    if (quiz.done) {
      const tier = MSG[quiz.n === 10 ? 10 : 5].find(t => quiz.score >= t[0] && quiz.score <= t[1]) || MSG[5][0];
      if (!quiz.msg) quiz.msg = tier[3][Math.floor(Math.random() * tier[3].length)];
      return h + `<div class="result"><img src="img/chara/stand_${tier[2]}.webp" alt=""><div class="score">${quiz.n}もん中 ${quiz.score}もん 正解！</div><div class="msg">${esc(quiz.msg)}</div>
        <div class="rbtns"><button class="sb" data-quizn="${quiz.n}">もう一回</button><button class="sb" data-act="title">タイトルへ</button></div></div>`;
    }
    const q = quiz.qs[quiz.i], e = q.e;
    let pips = '<div class="qpips" aria-label="' + (quiz.i + 1) + '問目">';
    for (let i = 0; i < quiz.n; i++) pips += `<span class="qpip${i === quiz.i ? ' on' : i < quiz.i ? ' done' : ''}"></span>`;
    pips += '</div>';
    const answered = q.ans !== null;
    const sent = answered ? `${ruby(e.sit)}<span class="fill">${ruby(e.quiz)}</span>。` : `${ruby(e.sit)}<span class="blank">&nbsp;</span>。`;
    h += `<div class="qwrap" style="top:92px">${pips}<div class="qsent">${sent}</div><div class="qch">`;
    h += q.choices.map((c, i) => {
      let cls = 'qc';
      if (answered) { if (c.id === e.id) cls += ' ok'; else if (c.id === q.ans) cls += ' ng'; }
      return `<button class="${cls}" data-qa="${c.id}" style="animation-delay:${(i * 0.05).toFixed(2)}s" ${answered ? 'disabled' : ''}>${ruby(c.quiz)}</button>`;
    }).join('');
    h += '</div>';
    if (answered) {
      const right = q.ans === e.id;
      h += `<div class="qfb"><img src="${imgOf(e)}" alt=""><div class="qtx"><span class="qres">${right ? 'せいかい！' : `ざんねん！ こたえは「${esc(e.word)}」`}</span><span class="qmean">${ruby(e.meaning)}</span></div>
        ${settings.favBtn ? `<button class="fav${isFav(e.id) ? ' on' : ''}" data-favtoggle="${e.id}" aria-label="おきにいり" aria-pressed="${isFav(e.id)}">${SVG.heart(isFav(e.id) ? '#FF5C7A' : 'none')}</button>` : ''}
        <button class="nextb" data-act="qnext">${quiz.i + 1 < quiz.n ? 'つぎへ' : 'けっかを 見る'}</button></div>`;
    }
    return h + '</div>';
  }

  // ---------- まど ----------
  function overlayHtml() {
    if (overlay === 'first') {
      return `<div class="ov"><section class="panel" aria-label="はじめに"><h2>むずかしい ことばも 知りたい？</h2>
        <div class="seg">${[[1, '★ 1・2年生'], [2, '★★ 3・4年生'], [3, '★★★ 5・6年生']].map(o => `<button class="sg" data-first="${o[0]}">${o[1]}</button>`).join('')}</div>
        <span class="note">★が多いほど、むずかしい ことばも 出てくるよ。あとで「せってい」で 変えられるよ。</span></section></div>`;
    }
    if (overlay === 'set') {
      const seg = (opts, v, key) => '<div class="seg">' + opts.map(o => `<button class="sg${v === o[0] ? ' on' : ''}" data-set="${key}" data-val="${o[0]}">${o[1]}</button>`).join('') + '</div>';
      return `<div class="ov"><section class="panel" aria-label="せってい"><div class="phd"><h2>せってい</h2><button class="ic" data-act="closeov" aria-label="とじる">${SVG.close}</button></div>
        <div class="srow"><span class="slab">むずかしい ことばも 見る？</span>${seg([[1, '★ 1・2年生'], [2, '★★ 3・4年生'], [3, '★★★ 5・6年生']], settings.star, 'star')}</div>
        <div class="srow"><span class="slab">ページおくりの しくみ</span>${seg([['scroll', 'スクロール'], ['page', 'ページおくり']], settings.paging, 'paging')}</div>
        <div class="srow"><span class="slab">おきにいりボタン</span>${seg([[true, 'ひょうじする'], [false, 'かくす']], settings.favBtn, 'favBtn')}</div></section></div>`;
    }
    return '';
  }

  // ---------- 描画 ----------
  function fieldColor() {
    if (cur.scr === 'k' && cur.f) return FM[cur.f].field;
    if (cur.scr === 'b' && cur.id) return FM[WM[cur.id].feeling].field;
    return '#F7F5EF';
  }
  function render() {
    let h = '';
    if (cur.scr === 'title') h = titleHtml();
    else if (cur.scr === 'k') h = kHtml();
    else if (cur.scr === 'b') h = bHtml();
    else if (cur.scr === 'list') h = listHtml(false);
    else if (cur.scr === 'fav') h = listHtml(true);
    else if (cur.scr === 'quiz') h = quizHtml();
    stage.innerHTML = h + overlayHtml();
    const c = fieldColor();
    stage.style.background = c;
    document.body.style.background = c;
    initScroll();
  }

  // ---------- 自作スクロールバー ----------
  function initScroll() {
    const v = stage.querySelector('.scv.on'), trk = stage.querySelector('.trk'), thm = stage.querySelector('.thm');
    if (!v || !trk || !thm) return;
    const upd = () => {
      const H = trk.clientHeight, th = Math.max(40, H * v.clientHeight / v.scrollHeight);
      const y = (H - th) * v.scrollTop / Math.max(1, v.scrollHeight - v.clientHeight);
      thm.style.height = th + 'px';
      thm.style.transform = `translateY(${y}px)`;
    };
    v.addEventListener('scroll', upd);
    upd();
    let drag = null;
    thm.addEventListener('pointerdown', e => {
      e.stopPropagation();
      thm.setPointerCapture(e.pointerId);
      drag = { y: e.clientY, t: v.scrollTop, scale: trk.getBoundingClientRect().height / trk.offsetHeight };
    });
    thm.addEventListener('pointermove', e => {
      if (!drag) return;
      const ratio = (v.scrollHeight - v.clientHeight) / Math.max(1, trk.clientHeight - thm.offsetHeight);
      v.scrollTop = drag.t + (e.clientY - drag.y) / drag.scale * ratio;
    });
    const end = () => { drag = null; };
    thm.addEventListener('pointerup', end);
    thm.addEventListener('pointercancel', end);
    trk.addEventListener('pointerdown', e => {
      if (e.target === thm) return;
      const r = trk.getBoundingClientRect();
      const f = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      v.scrollTo({ top: f * (v.scrollHeight - v.clientHeight), behavior: 'smooth' });
    });
  }

  // ---------- 操作 ----------
  function saveSettings() { LS.set('settings', settings); }
  function toggleFav(id, btn) {
    const on = !isFav(id);
    favs = on ? favs.concat(id) : favs.filter(x => x !== id);
    LS.set('favs', favs);
    stage.querySelectorAll(`[data-favtoggle="${id}"]`).forEach(b => {
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on);
      b.innerHTML = SVG.heart(on ? '#FF5C7A' : 'none');
    });
    const hb = stage.querySelector('.hb');
    if (hb) {
      hb.querySelector('.hcount').textContent = favs.length;
      if (on) { hb.classList.remove('bump'); void hb.offsetWidth; hb.classList.add('bump'); }
    }
  }
  stage.addEventListener('click', e => {
    const t = e.target.closest('button');
    if (!t) return;
    const d = t.dataset;
    if (d.act) {
      switch (d.act) {
        case 'back': return back();
        case 'fwd': return fwd();
        case 'title': quiz = null; return go({ scr: 'title' });
        case 'goK': return go({ scr: 'k' });
        case 'goB': return go({ scr: 'b' });
        case 'list': return go({ scr: 'list' });
        case 'favs': return go({ scr: 'fav' });
        case 'quiz': quiz = null; return go({ scr: 'quiz' });
        case 'set': overlay = 'set'; return render();
        case 'closeov': overlay = null; return render();
        case 'pgprev': return setPage((cur.pg || 0) - 1);
        case 'pgnext': return setPage((cur.pg || 0) + 1);
        case 'qnext':
          if (quiz.i + 1 < quiz.n) quiz.i++; else quiz.done = true;
          return render();
      }
    }
    if (d.crumb !== undefined) {
      const steps = cur.scr === 'k' ? kSteps(cur) : null;
      if (steps) return go(steps[+d.crumb].st);
      if (cur.scr === 'b') { const i = +d.crumb; return go(i === 0 ? { scr: 'b' } : { scr: 'b', s: cur.s }); }
    }
    if (d.feel) return go(d.feel === 'dokidoki' ? { scr: 'k', f: d.feel } : { scr: 'k', f: d.feel, t: null });
    if (d.doki) return go({ scr: 'k', f: 'dokidoki', t: d.doki });
    if (d.gen) return go({ scr: 'k', f: cur.f, t: cur.t, g: d.gen });
    if (d.scene) return go({ scr: 'b', s: d.scene });
    if (d.word) return cur.scr === 'b' ? go({ scr: 'b', s: cur.s, id: d.word }) : go(Object.assign({}, cur, { id: d.word, pg: 0 }));
    if (d.open) return openWord(d.open);
    if (d.key) return setKey(d.key, d.val);
    if (d.favtoggle) return toggleFav(d.favtoggle, t);
    if (d.quizn) return startQuiz(+d.quizn);
    if (d.qa) {
      const q = quiz.qs[quiz.i];
      if (q.ans !== null) return;
      q.ans = d.qa;
      if (d.qa === q.e.id) quiz.score++;
      return render();
    }
    if (d.first) { settings.star = +d.first; saveSettings(); firstRun = false; overlay = null; return render(); }
    if (d.set) {
      const v = d.set === 'star' ? +d.val : d.set === 'favBtn' ? d.val === 'true' : d.val;
      settings[d.set] = v; saveSettings();
      cur = Object.assign({}, cur, { pg: 0 });
      return render();
    }
  });
  // ほかの所をおしたら、せっていをとじる
  stage.addEventListener('pointerdown', e => {
    if (overlay === 'set' && e.target.classList.contains('ov')) { overlay = null; render(); }
  });
  // 「どんなきもち？」で、カードに乗せると左下の同じキャラが跳ねる
  stage.addEventListener('pointerover', e => {
    const fc = e.target.closest && e.target.closest('[data-feel]');
    if (!fc || (e.relatedTarget && fc.contains(e.relatedTarget))) return;
    const m = stage.querySelector(`[data-mini="${fc.dataset.feel}"]`);
    if (!m) return;
    m.classList.remove('jump'); void m.offsetWidth; m.classList.add('jump');
    m.addEventListener('animationend', () => m.classList.remove('jump'), { once: true });
  });

  // ---------- 画面の大きさに合わせる ----------
  function fit() {
    const s = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
    stage.style.transform = `scale(${s})`;
  }
  window.addEventListener('resize', fit);
  fit();
  render();
})();
