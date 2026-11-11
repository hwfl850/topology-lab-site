// Run: node tests/engine.test.js
// Every answer key must score exactly 100 against its own rules, an empty page
// must score 0, and the failure test must behave the way each topology should.
const path = require('path').join(__dirname, '..', 'js');
require(path + '/data.js'); require(path + '/engine.js');
const TL = globalThis.TL;
let fail = 0;
const clone = o => JSON.parse(JSON.stringify(o));
for (const scn of TL.SCENARIOS) for (const o of TL.OPTS) {
  const B = TL.board(scn, o.id);
  const r = TL.evaluate(B, B.solution);
  const max = Object.values(B.budgets).reduce((a, b) => a + b, 0);
  const empty = TL.evaluate(B, { nodes: [], edges: [] });
  // overlap check in solution
  let overlap = 0;
  const N = B.solution.nodes;
  for (let i = 0; i < N.length; i++) for (let j = i + 1; j < N.length; j++) {
    if (N[i].kind === 'backbone' || N[j].kind === 'backbone') continue;
    if (Math.abs(N[i].x - N[j].x) < 100 && Math.abs(N[i].y - N[j].y) < 90) overlap++;
  }
  const oob = N.filter(n => n.x < 50 || n.x > 950 || n.y < 50 || n.y > 600).length;
  const ok = r.score === 100 && r.lost === 0 && max === 100 && empty.score === 0 && !overlap && !oob;
  if (!ok) { fail++; console.log('FAIL', B.key, 'score', r.score, 'lost', r.lost, 'budget', max, 'empty', empty.score, 'overlap', overlap, 'oob', oob);
    r.items.filter(i => i.state !== 'ok').forEach(i => console.log('   ', i.cat, i.label, i.f)); }
  // failure tests
  const none = TL.failureTest(B, B.solution, { n: {}, e: {} });
  if (none.offline.length) { fail++; console.log('FAIL baseline offline', B.key, none.offline); }
  if (o.id === 'bus') {
    const bar = N.find(n => n.kind === 'backbone');
    const t = TL.failureTest(B, B.solution, { n: { [bar.id]: 1 }, e: {} });
    if (!t.all) { fail++; console.log('FAIL bus break', B.key, t); }
    const term = B.solution.edges.find(e => N.find(n => n.id === e.a).kind === 'terminator');
    const t2 = TL.failureTest(B, B.solution, { n: {}, e: { [term.id]: 1 } });
    if (!t2.all) { fail++; console.log('FAIL bus terminator', B.key, t2); }
    const drop = B.solution.edges.find(e => N.find(n => n.id === e.a).piece === 'b1');
    const t3 = TL.failureTest(B, B.solution, { n: {}, e: { [drop.id]: 1 } });
    if (t3.offline.length !== 1) { fail++; console.log('FAIL bus drop', B.key, t3); }
  }
  if (o.id === 'mesh') {
    const t = TL.failureTest(B, B.solution, { n: {}, e: { [B.solution.edges[0].id]: 1 } });
    if (t.offline.length) { fail++; console.log('FAIL mesh cut', B.key, t); }
  }
  if (o.id === 'star') {
    const core = N.find(n => n.kind === 'switch');
    const t = TL.failureTest(B, B.solution, { n: { [core.id]: 1 }, e: {} });
    if (!t.all) { fail++; console.log('FAIL star core', B.key, t); }
    const ep = N.find(n => n.kind === 'endpoint');
    const e = B.solution.edges.find(x => x.a === ep.id || x.b === ep.id);
    const t2 = TL.failureTest(B, B.solution, { n: {}, e: { [e.id]: 1 } });
    if (t2.offline.length !== 1) { fail++; console.log('FAIL star one cable', B.key, t2); }
    const net = N.find(n => n.kind === 'internet');
    const t3 = TL.failureTest(B, B.solution, { n: { [net.id]: 1 }, e: {} });
    if (t3.offline.length) { fail++; console.log('FAIL star backup line', B.key, t3); }
    // partial: wrong cable to AP, missing vlan
    const G = clone(B.solution);
    G.nodes.forEach(n => n.vlan = null);
    const r2 = TL.evaluate(B, G);
    if (r2.score !== 90) { fail++; console.log('FAIL vlan strip', B.key, r2.score); }
    const G3 = clone(B.solution); G3.nodes.push({ id: 'zz', kind: 'hub', piece: null, x: 1, y: 1, vlan: null });
    if (TL.evaluate(B, G3).score !== 95) { fail++; console.log('FAIL hub', B.key); }
  }
}
for (const scn of TL.SCENARIOS) { const c = TL.costCard(scn); if (c) console.log(scn.id.padEnd(11), 'drops', c.drops, 'ports', c.ports, 'sub', c.subtotal, 'total', c.total, '~', c.rounded, 'monthly', c.monthlyTotal); }
// quiz sanity
TL.QUIZ.forEach((q, i) => { if (q.a.length !== 4 || new Set(q.a).size !== 4 || !q.why) { fail++; console.log('FAIL quiz', i); } });
console.log(TL.QUIZ.length, 'quiz questions;', fail ? fail + ' FAILURES' : 'all engine checks pass');
process.exit(fail ? 1 : 0);
