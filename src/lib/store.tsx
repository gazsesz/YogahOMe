// Tárolás telefonon: SQLite (expo-sqlite). A böngészős változat a store.web.ts.
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import type { ReactNode } from 'react';
import { DB_NAME, migrate } from './db';

export {
  deletePlan,
  deleteSeries,
  getPlan,
  getSeries,
  getSetting,
  listPlans,
  listSeries,
  modifyPlan,
  savePlan,
  saveSeries,
  setSetting,
} from './db';

export function StoreProvider({ children }: { children: ReactNode }) {
  return (
    <SQLiteProvider databaseName={DB_NAME} onInit={migrate}>
      {children}
    </SQLiteProvider>
  );
}

export const useDb = useSQLiteContext;
