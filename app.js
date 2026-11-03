(function () {
  'use strict';

  const D = window.COURSE_DATA;
  const C = window.Core;
  const courses = D.courses;
  const byId = new Map(courses.map((c) => [C.courseId(c), c]));
  const KEY = 'final-score-calc:v1';
  const WIDE = window.matchMedia('(min-width: 820px)');

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const fmt = C.fmt;

  // ── 상태 (이 브라우저에만 저장) ──
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && Array.isArray(s.my)) return { my: s.my, sel: s.sel || null, cs: s.cs || {} };
    } catch (e) { /* 저장소를 못 쓰면 빈 상태로 */ }
    return { my: [], sel: null, cs: {} };
  }
  const S = load();
  S.my = S.my.filter((id) => byId.has(id));
  if (!S.my.includes(S.sel)) S.sel = null;

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* 무시 */ }
  }

  function st(id) {
    if (!S.cs[id]) S.cs[id] = { mid: null, full: true, items: null, target: 80 };
    return S.cs[id];
  }

  const sub = (c) => [c.t + (c.co ? ' 외' : ''), c.b].filter(Boolean).join(' · ');

  function valueHTML(r) {
    switch (r.state) {
      case 'need': return `<span class="v-num">${fmt(r.need)}</span>`;
      case 'done': return '<span class="v-ok">달성</span>';
      case 'impossible': return '<span class="v-bad">불가</span>';
      case 'nofinal': return `<span class="v-mut">원점수 ${fmt(r.raw)}</span>`;
      default: return '<span class="v-mut">—</span>';
    }
  }

  // ── 왼쪽 ──
  function renderMine() {
    const ul = $('mine');
    ul.innerHTML = S.my.map((id) => {
      const c = byId.get(id);
      const r = C.calc(c, st(id));
      return `<li><button type="button" class="row-btn${id === S.sel ? ' on' : ''}" data-id="${esc(id)}">
        <span class="r-main"><span class="r-name">${esc(c.n)}</span><span class="r-sub">${esc(sub(c))}</span></span>
        <span class="r-val">${valueHTML(r)}</span></button></li>`;
    }).join('');
    $('mineLabel').hidden = !S.my.length;
    $('empty').hidden = !!S.my.length;
  }

  let hits = [];
  function renderResults() {
    const q = $('q').value;
    const on = q.trim().length > 0;
    $('qClear').hidden = !q;
    $('results').hidden = !on;
    $('mineWrap').hidden = on;
    if (!on) return;
    hits = C.search(courses, q);
    $('results').innerHTML = hits.length ? hits.map((c) => {
      const id = C.courseId(c);
      const added = S.my.includes(id);
      const w = `중간 ${c.w[0]} · 기말 ${c.w[1]} · 수행 ${c.w[2]}`;
      return `<li><button type="button" class="row-btn" data-add="${esc(id)}">
        <span class="r-main"><span class="r-name">${esc(c.n)}</span><span class="r-sub">${esc(sub(c))}</span><span class="r-sub">${w}</span></span>
        <span class="r-act${added ? ' added' : ''}" aria-label="${added ? '추가됨' : '추가'}">${added ? '✓' : '＋'}</span></button></li>`;
    }).join('') : '<li class="msg">검색 결과 없음</li>';
  }

  function clearSearch() {
    $('q').value = '';
    renderResults();
  }

  function add(id) {
    if (!S.my.includes(id)) S.my.push(id);
    st(id);
    clearSearch();
    select(id);
  }

  function select(id, push = true) {
    S.sel = id;
    save();
    renderMine();
    renderDetail();
    if (!WIDE.matches && id) {
      document.body.classList.add('show-detail');
      if (push) history.pushState({ d: 1 }, '');
      window.scrollTo(0, 0);
    }
  }

  function remove(id) {
    const i = S.my.indexOf(id);
    if (i < 0) return;
    S.my.splice(i, 1);
    delete S.cs[id];
    const next = WIDE.matches ? (S.my[i] || S.my[i - 1] || null) : null;
    S.sel = next;
    save();
    renderMine();
    renderDetail();
    if (!WIDE.matches) goBack();
  }

  function goBack() {
    if (history.state && history.state.d) history.back();
    else document.body.classList.remove('show-detail');
  }

  // ── 오른쪽 ──
  function stepper(k, label, of) {
    return `<div class="step" data-k="${k}">
      <button type="button" data-d="-1" aria-label="${label} 빼기">−</button>
      <span class="val"><input inputmode="decimal" autocomplete="off" placeholder="—" aria-label="${label}">${of ? `<span class="of">/${of}</span>` : ''}</span>
      <button type="button" data-d="1" aria-label="${label} 더하기">+</button>
    </div>`;
  }

  function renderDetail() {
    const el = $('detail');
    const id = S.sel;
    const c = id && byId.get(id);
    if (!c) {
      el.innerHTML = '';
      return;
    }
    const [mw, fw, pw] = c.w;
    const meta = [c.t + (c.co ? `, ${c.co}` : ''), c.b, c.u ? `${c.u}단위` : '', c.g].filter(Boolean).join(' · ');
    el.innerHTML = `
      <button type="button" class="back" id="back">← 내 수업</button>
      <div class="d-head"><h2>${esc(c.n)}</h2><p class="d-sub">${esc(meta)}</p></div>
      <div id="sum"></div>
      <div class="rows">
        <div class="row"><span class="k">목표 원점수</span>${stepper('target', '목표 원점수')}</div>
        ${mw > 0 ? `<div class="row"><span class="k">중간고사<small>${mw}%</small></span>${stepper('mid', '중간고사 점수', 100)}</div>` : ''}
        ${c.p.length ? `<div class="row"><span class="k">수행평가 만점<small>${pw}%</small></span>
          <button type="button" class="sw" role="switch" id="full" aria-label="수행평가 만점"><span></span></button></div>` : ''}
        ${c.p.map((it, i) => `<div class="row item" data-i="${i}"><span class="k">${esc(it[0])}${it[2] ? `<small>${esc(it[2])}</small>` : ''}</span>${stepper(`item:${i}`, it[0], it[1])}</div>`).join('')}
      </div>
      <button type="button" class="remove" id="remove">내 수업에서 빼기</button>`;
    sync();
  }

  function renderSum() {
    const c = byId.get(S.sel);
    const s = st(S.sel);
    const r = C.calc(c, s);
    const T = r.target;
    let num, unit = '', cap, cls = '';
    switch (r.state) {
      case 'need': num = fmt(r.need); unit = '점'; cap = `기말고사에서 받으면 원점수 ${fmt(T)}`; break;
      case 'done': num = '달성'; cls = 'word ok'; cap = `기말 0점이어도 원점수 ${fmt(T)} 이상`; break;
      case 'impossible': num = '불가'; cls = 'word bad'; cap = `기말 100점이면 원점수 ${fmt(r.max)}`; break;
      case 'nofinal': num = fmt(r.raw); cap = '원점수 · 기말고사 없음'; break;
      default: num = '—'; cls = 'word mut'; cap = '중간고사 점수를 넣으세요';
    }
    const finNeed = r.state === 'need' ? (r.fw * r.need) / 100 : r.state === 'impossible' ? r.fw : 0;
    const room = r.state === 'need' || r.state === 'done' ? r.fw - finNeed : 0;
    const mid = r.midPts || 0;
    const segs = [['perf', r.perf], ['mid', mid], ['fin', finNeed], ['room', room]];
    let x = 0;
    const bar = segs.filter((g) => g[1] > 0).map(([k, w]) => {
      const html = `<div class="seg ${k}" style="left:${x}%;width:${w}%"></div>`;
      x += w;
      return html;
    }).join('');
    const legend = [
      `<span><i style="background:var(--seg-perf)"></i>수행 ${fmt(r.perf)}/${r.pw}</span>`,
      r.mw > 0 ? `<span><i style="background:var(--seg-mid)"></i>중간 ${r.state === 'nomid' ? '—' : fmt(mid)}/${r.mw}</span>` : '',
      r.fw > 0 ? `<span><i style="background:var(--accent)"></i>기말 ${r.state === 'need' || r.state === 'impossible' ? fmt(finNeed) : r.state === 'done' ? '0' : '—'}/${r.fw}</span>` : '',
      r.max != null && r.fw > 0 ? `<span class="max">최대 ${fmt(r.max)}</span>` : '',
    ].join('');
    $('sum').innerHTML = `
      <div class="hero">
        <div class="big"><span class="num ${cls}">${num}</span>${unit ? `<span class="unit">${unit}</span>` : ''}</div>
        <div class="cap">${cap}</div>
      </div>
      <div class="bar" role="img" aria-label="수행 ${fmt(r.perf)}, 중간 ${fmt(mid)}, 기말 필요 ${fmt(finNeed)}, 목표 ${fmt(T)}">
        ${bar}<div class="mark" style="left:${C.clamp(T, 0, 100)}%"><span>${fmt(T)}</span></div>
      </div>
      <div class="legend">${legend}</div>`;
  }

  // 입력칸 값을 상태에 맞춘다 (구조는 그대로 두고 값만)
  function sync(skip) {
    const c = byId.get(S.sel);
    if (!c) return;
    const s = st(S.sel);
    const scores = C.itemScores(c, s);
    $('detail').querySelectorAll('.step').forEach((el) => {
      const k = el.dataset.k;
      const input = el.querySelector('input');
      if (input === skip) return;
      const v = k === 'target' ? s.target : k === 'mid' ? s.mid : scores[+k.split(':')[1]];
      input.value = v == null ? '' : fmt(v);
    });
    const sw = $('full');
    if (sw) sw.setAttribute('aria-checked', String(!!s.full));
    $('detail').querySelectorAll('.row.item').forEach((el) => el.classList.toggle('full', !!s.full));
    renderSum();
  }

  function unlockItems(c, s) {
    if (s.full || !Array.isArray(s.items)) s.items = C.itemScores(c, s);
    s.full = false;
  }

  function setValue(k, v, delta) {
    const c = byId.get(S.sel);
    const s = st(S.sel);
    if (k === 'target') {
      const base = v != null ? v : s.target + delta;
      s.target = C.clamp(Math.round(base * 10) / 10, 0, 100);
    } else if (k === 'mid') {
      if (v === null) s.mid = null;
      else if (v != null) s.mid = C.clamp(v, 0, 100);
      else s.mid = s.mid == null ? 80 : C.clamp(s.mid + delta, 0, 100);
    } else {
      const i = +k.split(':')[1];
      const max = c.p[i][1];
      unlockItems(c, s);
      const cur = s.items[i];
      s.items[i] = C.clamp(v != null ? v : (v === null ? 0 : cur + delta), 0, max);
    }
    save();
    renderMine();
  }

  function parse(str) {
    const t = String(str).trim().replace(',', '.');
    if (t === '') return null;
    const n = Number(t);
    return isFinite(n) ? n : undefined;
  }

  // 누르고 있으면 계속 바뀌게
  let hold = null;
  function stopHold() {
    if (hold) { clearTimeout(hold.t); clearInterval(hold.i); hold = null; }
  }
  function bump(btn) {
    const k = btn.closest('.step').dataset.k;
    setValue(k, undefined, +btn.dataset.d);
    sync();
  }

  function bind() {
    $('term').textContent = (D.term.match(/(\d{4})학년도\s*(\d)학기/) || []).slice(1).join('-');

    $('q').addEventListener('input', renderResults);
    $('q').addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { clearSearch(); }
    });
    $('find').addEventListener('submit', (e) => {
      e.preventDefault();
      if (hits[0]) add(C.courseId(hits[0]));
    });
    $('qClear').addEventListener('click', () => { clearSearch(); $('q').focus(); });

    $('results').addEventListener('click', (e) => {
      const b = e.target.closest('[data-add]');
      if (b) add(b.dataset.add);
    });
    $('mine').addEventListener('click', (e) => {
      const b = e.target.closest('[data-id]');
      if (b) select(b.dataset.id);
    });

    const det = $('detail');
    det.addEventListener('pointerdown', (e) => {
      const b = e.target.closest('.step button');
      if (!b || e.button !== 0) return;
      e.preventDefault();
      stopHold();
      bump(b);
      hold = { t: setTimeout(() => { hold.i = setInterval(() => bump(b), 70); }, 420) };
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => det.addEventListener(ev, stopHold));
    window.addEventListener('blur', stopHold);
    det.addEventListener('click', (e) => {
      const step = e.target.closest('.step button');
      if (step) { if (e.detail === 0) bump(step); return; } // 키보드(Enter/Space)만 여기서
      if (e.target.closest('#back')) return goBack();
      if (e.target.closest('#remove')) return remove(S.sel);
      if (e.target.closest('#full')) {
        const c = byId.get(S.sel);
        const s = st(S.sel);
        if (s.full) unlockItems(c, s);
        else s.full = true;
        save();
        renderMine();
        sync();
      }
    });
    det.addEventListener('input', (e) => {
      const input = e.target.closest('.step input');
      if (!input) return;
      const v = parse(input.value);
      if (v === undefined) return;
      const k = input.closest('.step').dataset.k;
      if (v === null && k !== 'mid') return;
      setValue(k, v, 0);
      sync(input);
    });
    det.addEventListener('change', (e) => {
      if (e.target.closest('.step input')) sync();
    });
    det.addEventListener('keydown', (e) => {
      const input = e.target.closest('.step input');
      if (!input) return;
      if (e.key === 'Enter') input.blur();
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        setValue(input.closest('.step').dataset.k, undefined, e.key === 'ArrowUp' ? 1 : -1);
        sync();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) {
        e.preventDefault();
        if (!WIDE.matches) document.body.classList.remove('show-detail');
        $('q').focus();
      }
    });

    window.addEventListener('popstate', () => document.body.classList.remove('show-detail'));
    WIDE.addEventListener('change', () => {
      if (WIDE.matches) {
        document.body.classList.remove('show-detail');
        if (!S.sel && S.my.length) select(S.my[0], false);
      }
    });
  }

  bind();
  if (WIDE.matches && !S.sel && S.my.length) S.sel = S.my[0];
  renderMine();
  renderResults();
  renderDetail();
})();
