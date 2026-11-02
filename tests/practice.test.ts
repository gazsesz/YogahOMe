/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateClass } from '../src/lib/generator';
import { DURATIONS, GOALS } from '../src/lib/goals';
import { BREATH_SEC, buildSteps, fmtClock, SETUP_SEC, stepSeconds, stepSound, stepSpeech, totalSeconds } from '../src/lib/practice';
import { DEFAULT_PROFILE, effectiveAudio, hasOverride, parseProfile } from '../src/lib/profile';
import type { PlanItem } from '../src/lib/types';

const POSE_SIDED = 'virabhadrasana-ii';
const item = (x: Partial<PlanItem>): PlanItem => ({ key: 'k', poseId: 'tadasana', hold: '', sides: 'nincs', note: '', ...x });

test('a tartásból számolt lépésidő', () => {
  assert.equal(stepSeconds(item({ hold: '3 perc' })), 180);
  assert.equal(stepSeconds(item({ hold: '1,5 perc' })), 90);
  assert.equal(stepSeconds(item({ hold: '10 légzés' })), 10 * BREATH_SEC + SETUP_SEC);
  assert.equal(stepSeconds(item({ hold: '5 légzés oldalanként', sides: 'mindket' })), 45);
  assert.equal(stepSeconds(item({ hold: '5 légzés' })), 60);
  assert.equal(stepSeconds(item({ hold: '30 mp' })), 30);
});

test('a generált órák lépésekre bontva a választott időhöz közeli hosszúak', () => {
  for (const g of GOALS)
    for (const m of DURATIONS.filter((d) => d <= (g.maxMinutes ?? 999) && d <= 60)) {
      const plan = generateClass({ goal: g.id, minutes: m, level: 2, avoid: [] }, 0, 7);
      const steps = buildSteps(plan);
      const min = totalSeconds(steps) / 60;
      assert.ok(steps.length > 0);
      assert.ok(Math.abs(min - m) <= Math.max(2.5, m * 0.15), `${g.id} ${m} perc: ${min.toFixed(1)} perc`);
    }
});

test('mindkét oldalas póz két lépés, a második „Másik oldal”', () => {
  const plan = { sections: [{ key: 's', title: 'Fő rész', items: [item({ poseId: POSE_SIDED, sides: 'mindket', hold: '5 légzés oldalanként' })] }] } as never;
  const steps = buildSteps(plan);
  assert.equal(steps.length, 2);
  assert.deepEqual(steps.map((s) => s.side), ['jobb', 'bal']);
  assert.ok(stepSpeech(steps, 0).startsWith('Fő rész.'));
  assert.ok(stepSpeech(steps, 1).includes('Másik oldal'));
  assert.equal(stepSound(steps[0]), 'gong');
  assert.equal(stepSound(steps[1]), 'chime');
});

test('szakaszváltáskor a narráció bejelenti az előző szakasz végét', () => {
  const plan = generateClass({ goal: 'derek', minutes: 20, level: 1, avoid: [] }, 0, 3);
  const steps = buildSteps(plan);
  const i = steps.findIndex((s, j) => j > 0 && s.sectionStart);
  assert.ok(i > 0);
  assert.match(stepSpeech(steps, i), /^Vége: /);
});

test('óra formátum', () => {
  assert.equal(fmtClock(65), '1:05');
  assert.equal(fmtClock(0.2), '0:01');
  assert.equal(fmtClock(-3), '0:00');
});

test('profil: hibás vagy hiányzó adatnál alapérték', () => {
  assert.deepEqual(parseProfile(null), DEFAULT_PROFILE);
  assert.deepEqual(parseProfile('{rossz'), DEFAULT_PROFILE);
  assert.deepEqual(parseProfile('{"level":3,"conditions":["terd"],"narration":false}'), { level: 3, conditions: ['terd'], narration: false, sounds: true });
});

test('az óra saját hangbeállítása felülírja a profilt', () => {
  const prof = { ...DEFAULT_PROFILE, narration: true, sounds: true };
  assert.deepEqual(effectiveAudio({}, prof), { narration: true, sounds: true });
  assert.deepEqual(effectiveAudio({ practice: { narration: false } }, prof), { narration: false, sounds: true });
  assert.equal(hasOverride({}), false);
  assert.equal(hasOverride({ practice: { sounds: false } }), true);
});
