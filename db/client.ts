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

/**
 * Unidad de trabajo de los services: abre la transacción y le pasa `db` a cada
 * repository, que así queda como SQL puro sin decidir sus propios límites
 * transaccionales. Si `fn` lanza, se hace rollback de todo.
 */
export async function enTransaccion<T>(fn: (db: SQLite.SQLiteDatabase) => Promise<T>): Promise<T> {
  const db = await getDb();
  let resultado: T | undefined;
  await db.withTransactionAsync(async () => {
    resultado = await fn(db);
  });
  return resultado as T;
}
