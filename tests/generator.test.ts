/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { poseConditions } from '../src/lib/cautions';
import { practiceOf } from '../src/lib/data';
import { estimateMinutes, generateClass, generateVariants, phaseMinutes, planMatches } from '../src/lib/generator';
import { DURATIONS, GOALS } from '../src/lib/goals';

test('a szakaszidők összege pontosan a választott idő', () => {
  for (const m of DURATIONS) for (let v = 0; v < 3; v++) {
    const ph = phaseMinutes(m, [1, 1, 1, 1, 1], v);
    assert.equal(ph.reduce((a, b) => a + b, 0), m, `${m} perc, ${v}. változat`);
    assert.ok(ph.every((x) => x >= 0.5));
  }
});

test('minden óratípus minden időtartamra a megadott időhöz közeli, öt szakaszos órát ad', () => {
  for (const g of GOALS)
    for (const m of DURATIONS.filter((d) => d <= (g.maxMinutes ?? 999)))
      for (const p of generateVariants({ goal: g.id, minutes: m, level: 2, avoid: [] }, 11)) {
        assert.equal(p.sections.length, 5);
        assert.ok(p.sections[2].items.length > 0, `${g.id} ${m}: üres fő rész`);
        const est = estimateMinutes(p);
        assert.ok(Math.abs(est - m) <= Math.max(2, m * 0.15), `${g.id} ${m} perc ${p.tags[0]}: ${est} perc`);
        for (const s of p.sections) for (const it of s.items) assert.ok(practiceOf(it), `${g.id}: ismeretlen ${it.poseId}`);
      }
});

test('a generált óra tartja a szintet, a kizárt kategóriákat és a kímélendő területeket', () => {
  for (const g of GOALS) {
    const p = generateClass({ goal: g.id, minutes: 30, level: 1, avoid: ['terd', 'csuklo'] }, 0, 3);
    for (const s of p.sections)
      for (const it of s.items) {
        const pr = practiceOf(it)!;
        assert.ok(pr.level <= 1, `${g.id}: ${pr.id} szintje ${pr.level}`);
        if (!it.kind) {
          assert.ok(!g.avoidCategories?.includes(pr.category), `${g.id}: ${pr.id} kizárt kategória`);
          const hit = poseConditions(pr).filter((c) => p.conditions.includes(c));
          // Pihenő pózok maradhatnak, de megjegyzést kapnak.
          if (hit.length) assert.ok(pr.category === 'pihen' && it.note.includes(pr.cautions), `${g.id}: ${pr.id} ${hit}`);
        }
      }
  }
});

test('ugyanaz a mag ugyanazt az órát adja, a három változat különbözik', () => {
  const req = { goal: 'derek', minutes: 20, level: 1 as const, avoid: [] };
  const ids = (s: number, v: number) => generateClass(req, v, s).sections.flatMap((x) => x.items.map((i) => i.poseId)).join();
  assert.equal(ids(5, 0), ids(5, 0));
  assert.notEqual(ids(5, 0), ids(5, 2));
});

test('mentett óra illesztése a kéréshez', () => {
  const p = generateClass({ goal: 'reggeli', minutes: 20, level: 1, avoid: [] }, 0, 1);
  assert.ok(planMatches(p, { goal: 'reggeli', minutes: 20, level: 2, avoid: [] }));
  assert.ok(planMatches(p, { goal: 'reggeli', minutes: 15, level: 1, avoid: [] }));
  assert.ok(!planMatches(p, { goal: 'reggeli', minutes: 45, level: 1, avoid: [] }));
  assert.ok(!planMatches(p, { goal: 'alvas', minutes: 20, level: 1, avoid: [] }));
});

test('v6 pózadat: minden ászanán megvannak a gyakorlási mezők, a hivatkozások érvényesek', async () => {
  const { POSES, POSE_BY_ID } = await import('../src/lib/data');
  const { CONDITION_BY_ID } = await import('../src/lib/cautions');
  const positions = new Set(['allo', 'terdelo', 'kez', 'ulo', 'hason', 'haton', 'oldal']);
  const muscles = new Set(['core', 'has', 'hat', 'kar', 'vall', 'lab', 'far']);
  for (const p of POSES) {
    assert.equal(typeof p.sided, 'boolean', p.id);
    assert.ok(positions.has(p.position), `${p.id}: ${p.position}`);
    assert.ok(p.intensity >= 1 && p.intensity <= 5, p.id);
    assert.ok(p.phases.length > 0, `${p.id}: nincs szakasz`);
    p.strengthens.forEach((m) => assert.ok(muscles.has(m), `${p.id}: ${m}`));
    p.avoidFor.forEach((c) => assert.ok(CONDITION_BY_ID[c], `${p.id}: ${c}`));
    if (p.counterpose) assert.ok(POSE_BY_ID[p.counterpose], `${p.id}: ${p.counterpose}`);
    assert.ok(p.hold.breaths > 0 || p.hold.sec > 0, p.id);
  }
  for (const m of muscles) assert.ok(POSES.filter((p) => p.strengthens.includes(m)).length >= 10, `kevés póz erősíti: ${m}`);
});

test('erősítésnél a kiválasztott izomcsoportot erősítő pózok dominálnak a fő részben', async () => {
  const { POSE_BY_ID } = await import('../src/lib/data');
  const map: Record<string, string[]> = { core: ['core'], has: ['has'], hat: ['hat'], kar: ['kar', 'vall'], lab: ['lab', 'far'] };
  for (const [opt, ms] of Object.entries(map)) {
    const p = generateClass({ goal: 'erosites', option: opt, minutes: 30, level: 2, avoid: [] }, 0, 9);
    const main = p.sections[2].items.filter((i) => !i.kind && !i.note.startsWith('Ellenpóz'));
    const hits = main.filter((i) => POSE_BY_ID[i.poseId].strengthens.some((m) => ms.includes(m))).length;
    assert.ok(hits / main.length >= 0.6, `${opt}: ${hits}/${main.length}`);
  }
});
