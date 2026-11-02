// Tárolás böngészőben: localStorage. Ugyanazt a felületet adja, mint a
// telefonos SQLite-os store.tsx, így a képernyők kódja közös.
import type { ReactNode } from 'react';
import { normalizePlan } from './db';
import type { Plan, Series } from './types';

type Db = object;
const DB: Db = {};
const KEY = { plans: 'jogapp:plans', series: 'jogapp:series' };

function read<T>(key: string): Record<string, T> {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '{}') as Record<string, T>;
  } catch {
    return {};
  }
}
function write<T>(key: string, data: Record<string, T>) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // privát böngészőablakban a tárolás tiltott lehet; ilyenkor csak memóriában él
  }
}
const now = () => new Date().toISOString();
const byUpdated = (a: { updatedAt: string }, b: { updatedAt: string }) => b.updatedAt.localeCompare(a.updatedAt);

export function StoreProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
export const useDb = (): Db => DB;

export async function listPlans(_db: Db): Promise<Plan[]> {
  return Object.values(read<Plan>(KEY.plans)).map(normalizePlan).sort(byUpdated);
}
export async function getPlan(_db: Db, id: string): Promise<Plan | null> {
  const p = read<Plan>(KEY.plans)[id];
  return p ? normalizePlan(p) : null;
}
export async function savePlan(_db: Db, plan: Plan): Promise<Plan> {
  const all = read<Plan>(KEY.plans);
  const p = { ...plan, updatedAt: now() };
  all[p.id] = p;
  write(KEY.plans, all);
  return p;
}
export async function modifyPlan(db: Db, id: string, f: (p: Plan) => Plan): Promise<Plan | null> {
  const cur = await getPlan(db, id);
  return cur ? savePlan(db, f(cur)) : null;
}
export async function deletePlan(_db: Db, id: string): Promise<void> {
  const all = read<Plan>(KEY.plans);
  delete all[id];
  write(KEY.plans, all);
}

export async function listSeries(_db: Db): Promise<Series[]> {
  return Object.values(read<Series>(KEY.series)).sort(byUpdated);
}
export async function getSeries(_db: Db, id: string): Promise<Series | null> {
  return read<Series>(KEY.series)[id] ?? null;
}
export async function saveSeries(_db: Db, series: Series): Promise<Series> {
  const all = read<Series>(KEY.series);
  const x = { ...series, updatedAt: now() };
  all[x.id] = x;
  write(KEY.series, all);
  return x;
}
export async function deleteSeries(_db: Db, id: string): Promise<void> {
  const all = read<Series>(KEY.series);
  delete all[id];
  write(KEY.series, all);
}

const SETTINGS = 'jogapp:settings';
export async function getSetting(_db: Db, key: string): Promise<string | null> {
  return read<string>(SETTINGS)[key] ?? null;
}
export async function setSetting(_db: Db, key: string, value: string): Promise<void> {
  const all = read<string>(SETTINGS);
  all[key] = value;
  write(SETTINGS, all);
}
