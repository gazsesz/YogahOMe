import type { SQLiteDatabase } from 'expo-sqlite';
import type { Plan, Series } from './types';

// Az óravázlatok az eszközön, SQLite-ban tárolódnak. Egy sor = egy óravázlat;
// a szerkezet (szakaszok, pózok) JSON-ként van a `data` oszlopban, így a
// formátum bővítése nem igényel táblamódosítást.

export const DB_NAME = 'jogapp.db';
const SCHEMA_VERSION = 3;

export async function migrate(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const v = row?.user_version ?? 0;
  if (v < 1) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS plans (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }
  if (v < 2) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS series (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }
  if (v < 3) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
  }
  if (v < SCHEMA_VERSION) await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}

/** Régebbi mentésekből hiányzó mezők pótlása. */
export function normalizePlan(p: Partial<Plan> & { id: string }): Plan {
  return {
    title: '',
    theme: '',
    level: 0,
    durationMin: null,
    tags: [],
    conditions: [],
    notes: '',
    sections: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...p,
  } as Plan;
}

export async function listPlans(db: SQLiteDatabase): Promise<Plan[]> {
  const rows = await db.getAllAsync<{ data: string }>('SELECT data FROM plans ORDER BY updated_at DESC');
  return rows.map((r) => normalizePlan(JSON.parse(r.data)));
}

export async function getPlan(db: SQLiteDatabase, id: string): Promise<Plan | null> {
  const row = await db.getFirstAsync<{ data: string }>('SELECT data FROM plans WHERE id = ?', id);
  return row ? normalizePlan(JSON.parse(row.data)) : null;
}

// Az írások sorban futnak, hogy a gyors egymás utáni mentések ne előzzék
// meg egymást (pl. gépelés közben, vagy ha egy másik képernyő ad hozzá pózt).
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

export function savePlan(db: SQLiteDatabase, plan: Plan): Promise<Plan> {
  return serial(async () => {
    const p = { ...plan, updatedAt: new Date().toISOString() };
    await db.runAsync(
      `INSERT INTO plans (id, title, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET title = excluded.title, data = excluded.data, updated_at = excluded.updated_at`,
      p.id, p.title, JSON.stringify(p), p.createdAt, p.updatedAt,
    );
    return p;
  });
}

/** Olvasás–módosítás–írás egy lépésben, a mentési sorban. */
export function modifyPlan(db: SQLiteDatabase, id: string, f: (p: Plan) => Plan): Promise<Plan | null> {
  return serial(async () => {
    const cur = await getPlan(db, id);
    if (!cur) return null;
    const p = { ...f(cur), updatedAt: new Date().toISOString() };
    await db.runAsync('UPDATE plans SET title = ?, data = ?, updated_at = ? WHERE id = ?',
      p.title, JSON.stringify(p), p.updatedAt, p.id);
    return p;
  });
}

export function deletePlan(db: SQLiteDatabase, id: string): Promise<void> {
  return serial(async () => {
    await db.runAsync('DELETE FROM plans WHERE id = ?', id);
  });
}

// Tematikák (több napra bontott témák), ugyanúgy JSON-ként tárolva.

export async function listSeries(db: SQLiteDatabase): Promise<Series[]> {
  const rows = await db.getAllAsync<{ data: string }>('SELECT data FROM series ORDER BY updated_at DESC');
  return rows.map((r) => JSON.parse(r.data) as Series);
}

export async function getSeries(db: SQLiteDatabase, id: string): Promise<Series | null> {
  const row = await db.getFirstAsync<{ data: string }>('SELECT data FROM series WHERE id = ?', id);
  return row ? (JSON.parse(row.data) as Series) : null;
}

export function saveSeries(db: SQLiteDatabase, series: Series): Promise<Series> {
  return serial(async () => {
    const x = { ...series, updatedAt: new Date().toISOString() };
    await db.runAsync(
      `INSERT INTO series (id, title, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET title = excluded.title, data = excluded.data, updated_at = excluded.updated_at`,
      x.id, x.title, JSON.stringify(x), x.createdAt, x.updatedAt,
    );
    return x;
  });
}

export function deleteSeries(db: SQLiteDatabase, id: string): Promise<void> {
  return serial(async () => {
    await db.runAsync('DELETE FROM series WHERE id = ?', id);
  });
}

// Beállítások (pl. a felelősségi nyilatkozat elfogadása): kulcs–érték párok.

export async function getSetting(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  return row?.value ?? null;
}

export function setSetting(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  return serial(async () => {
    await db.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      key, value,
    );
  });
}
