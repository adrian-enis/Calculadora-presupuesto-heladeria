import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrate';

const DB_NAME = 'dibuluc.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Devuelve la conexión a SQLite, ya al día con el schema (ver db/migrations/).
 * Los repositories SIEMPRE deben obtener la db a través de esta función
 * (nunca abrir su propia conexión) — así hay un solo punto de inicialización.
 */
export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;

  // Evita correr las migraciones dos veces si getDb() se llama varias veces en
  // paralelo (ej: dos hooks montándose al mismo tiempo al abrir la app).
  if (!initPromise) {
    initPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync('PRAGMA foreign_keys = ON;');
      await runMigrations(db);
      dbInstance = db;
      return db;
    })();
  }

  return initPromise;
}
