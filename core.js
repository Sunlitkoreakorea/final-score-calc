// 계산·검색 로직 (화면과 분리해서 node 테스트로도 돌린다)
(function (root) {
  'use strict';

  const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
  const EPS = 1e-9;

  function chosung(s) {
    let out = '';
    for (const ch of s) {
      const k = ch.charCodeAt(0) - 0xac00;
      out += k >= 0 && k < 11172 ? CHO[Math.floor(k / 588)] : ch;
    }
    return out;
  }

  const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, '');
  const isCho = (s) => /^[ㄱ-ㅎ]+$/.test(s);

  function courseId(c) {
    return [c.n, c.t, c.b].join('|');
  }

  function hay(c) {
    if (!c._hay) {
      c._hay = norm([c.n, c.e, c.t, c.co, c.c, c.s, c.b].join(' '));
      c._cho = chosung(norm(c.n + c.t));
    }
    return c._hay;
  }

  // 공백으로 나눈 낱말이 모두 들어 있어야 한다. 이름이 그 낱말로 시작하면 위로.
  function search(courses, q) {
    const terms = String(q || '').trim().split(/\s+/).filter(Boolean).map(norm);
    if (!terms.length) return [];
    const hits = [];
    for (const c of courses) {
      const h = hay(c);
      let ok = true;
      for (const t of terms) {
        if (!(h.includes(t) || (isCho(t) && c._cho.includes(t)))) { ok = false; break; }
      }
      if (!ok) continue;
      const name = norm(c.n);
      const t0 = terms[0];
      const rank = name.startsWith(t0) || chosung(name).startsWith(t0) ? 0
        : name.includes(t0) ? 1 : norm(c.t).includes(t0) ? 2 : 3;
      hits.push([rank, c]);
    }
    hits.sort((a, b) => a[0] - b[0] || a[1].n.localeCompare(b[1].n, 'ko') || a[1].t.localeCompare(b[1].t, 'ko'));
    return hits.map((h) => h[1]);
  }

  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
  const ceil1 = (x) => Math.ceil(x * 10 - 1e-6) / 10;

  // 소수 둘째 자리까지, 끝의 0은 지운다 (27.75 → "27.75", 16.0 → "16")
  function fmt(x) {
    return String(Math.round(x * 100) / 100);
  }

  function itemScores(c, st) {
    return c.p.map((it, i) => {
      if (st.full) return it[1];
      const v = st.items && st.items[i];
      return typeof v === 'number' && isFinite(v) ? clamp(v, 0, it[1]) : it[1];
    });
  }

  // st = { mid: 중간고사 점수(100점 만점) | null, full: 수행평가 만점, items: [항목 점수], target: 목표 원점수 }
  function calc(c, st) {
    const [mw, fw] = c.w;
    const target = typeof st.target === 'number' ? st.target : 80;
    const perf = itemScores(c, st).reduce((a, b) => a + b, 0);
    const base = { target, perf, mw, fw, pw: c.w[2] };
    if (mw > 0 && (st.mid == null || !isFinite(st.mid))) return { ...base, state: 'nomid' };
    const midPts = mw > 0 ? (mw * clamp(st.mid, 0, 100)) / 100 : 0;
    const have = midPts + perf;
    const out = { ...base, midPts, have, max: have + fw };
    if (fw === 0) return { ...out, state: 'nofinal', raw: have, ok: have >= target - EPS };
    const need = ((target - have) * 100) / fw;
    if (need <= EPS) return { ...out, state: 'done', need: 0 };
    if (need > 100 + EPS) return { ...out, state: 'impossible', need: ceil1(need) };
    return { ...out, state: 'need', need: ceil1(need) };
  }

  const api = { chosung, search, courseId, calc, itemScores, fmt, clamp };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Core = api;
})(typeof window !== 'undefined' ? window : globalThis);
