// node test/core.test.js
const assert = require('assert');
const path = require('path');
const C = require('../core.js');
global.window = {};
require(path.join(__dirname, '..', 'data.js'));
const courses = window.COURSE_DATA.courses;

let n = 0;
const t = (name, fn) => { fn(); n++; };

const debate = { n: '영어 토론 I', t: '신승현', b: 'D3', w: [20, 20, 60], p: [['Debate', 30], ['Essay', 30]] };
const chem = { n: 'AP 화학 I', t: '장원형', b: 'K,L', w: [30, 30, 40], p: [['실험1', 20], ['실험2', 20]] };
const media = { n: '매체 의사소통', t: '김정환', b: 'K', w: [40, 0, 60], p: [['a', 60]] };
const noMid = { n: '시 창작', t: '송원호', b: 'D1', w: [0, 20, 80], p: [['a', 80]] };

t('수행 만점 + 중간 80 → 기말 20', () => {
  // 60 + 16 = 76, 80까지 4점 = 기말 20%의 20점
  const r = C.calc(debate, { mid: 80, full: true });
  assert.strictEqual(r.state, 'need');
  assert.strictEqual(r.need, 20);
  assert.strictEqual(r.max, 96);
});

t('나누어떨어지지 않으면 0.1 단위로 올림', () => {
  // 40 + 30*0.7 = 61, (80-61)/30*100 = 63.33… → 63.4
  const r = C.calc(chem, { mid: 70, full: true });
  assert.strictEqual(r.need, 63.4);
});

t('이미 넘으면 done, 0점', () => {
  const r = C.calc(debate, { mid: 100, full: true });
  assert.strictEqual(r.state, 'done');
  assert.strictEqual(r.need, 0);
});

t('기말 100점으로도 안 되면 impossible', () => {
  const r = C.calc(chem, { mid: 10, full: false, items: [5, 5] });
  // 10 + 3 = 13, 최대 43
  assert.strictEqual(r.state, 'impossible');
  assert.strictEqual(r.max, 43);
});

t('수행평가 직접 입력은 0~만점으로 제한', () => {
  assert.deepStrictEqual(C.itemScores(chem, { full: false, items: [25, -3] }), [20, 0]);
  assert.deepStrictEqual(C.itemScores(chem, { full: false, items: [12] }), [12, 20]);
  assert.deepStrictEqual(C.itemScores(chem, { full: true, items: [1, 1] }), [20, 20]);
});

t('목표 원점수 바꾸기', () => {
  const r = C.calc(debate, { mid: 80, full: true, target: 90 });
  assert.strictEqual(r.need, 70);
});

t('중간 점수 없으면 nomid, 중간 비율 0이면 필요 없음', () => {
  assert.strictEqual(C.calc(debate, { mid: null, full: true }).state, 'nomid');
  const r = C.calc(noMid, { mid: null, full: true });
  assert.strictEqual(r.state, 'done'); // 수행 80만으로 80
  assert.strictEqual(C.calc(noMid, { mid: null, full: true, target: 90 }).need, 50);
});

t('기말 비율 0이면 nofinal', () => {
  const r = C.calc(media, { mid: 50, full: true });
  assert.strictEqual(r.state, 'nofinal');
  assert.strictEqual(r.raw, 80);
  assert.strictEqual(r.ok, true);
});

t('검색: 이름·선생님·초성·여러 낱말', () => {
  assert.ok(C.search(courses, 'AP 화학')[0].n.startsWith('AP 화학'));
  assert.ok(C.search(courses, '장원형').every((c) => c.t === '장원형' || c.co.includes('장원형')));
  assert.ok(C.search(courses, 'ㅅㅍㅅㅁㅎ').some((c) => c.n === '세포생물학의 이해'));
  assert.strictEqual(C.search(courses, 'AP 통계 K').length, 1);
  assert.ok(C.search(courses, 'chemistry').length >= 3);
  assert.strictEqual(C.search(courses, '   ').length, 0);
});

t('데이터: 모든 수업 비율 합 100, 아이디 중복 없음', () => {
  for (const c of courses) {
    assert.strictEqual(c.w[0] + c.w[1] + c.w[2], 100, c.n);
    assert.strictEqual(c.p.reduce((a, i) => a + i[1], 0), c.w[2], c.n);
  }
  const ids = courses.map(C.courseId);
  assert.strictEqual(new Set(ids).size, ids.length);
});

t('fmt', () => {
  assert.strictEqual(C.fmt(20), '20');
  assert.strictEqual(C.fmt(63.4), '63.4');
  assert.strictEqual(C.fmt(16.000000001), '16');
  assert.strictEqual(C.fmt(27.75), '27.75');
  assert.strictEqual(C.fmt(0.1 + 0.2), '0.3');
});

console.log(`ok ${n}`);
