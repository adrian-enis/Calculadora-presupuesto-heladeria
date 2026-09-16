import type { SQLiteDatabase } from 'expo-sqlite';
import { migrations } from './migrations';

async function ensureSchemaVersionTable(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version     INTEGER PRIMARY KEY,
      name        TEXT NOT NULL,
      applied_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

async function getAppliedVersions(db: SQLiteDatabase): Promise<Set<number>> {
  const rows = await db.getAllAsync<{ version: number }>('SELECT version FROM schema_version');
  return new Set(rows.map((r) => r.version));
}

/**
 * Corre las migraciones pendientes en orden, cada una en su propia transacción
 * (si una falla a la mitad, esa migración se revierte entera y schema_version
 * no queda con un registro a medio aplicar). Las ya registradas en
 * schema_version se saltean — así una instalación existente no vuelve a
 * correr DDL que ya aplicó.
 */
export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  await ensureSchemaVersionTable(db);
  const applied = await getAppliedVersions(db);

  const pending = migrations.filter((m) => !applied.has(m.version)).sort((a, b) => a.version - b.version);

  for (const migration of pending) {
    await db.withTransactionAsync(async () => {
      await migration.up(db);
      await db.runAsync('INSERT INTO schema_version (version, name) VALUES (?, ?)', [
        migration.version,
        migration.name,
      ]);
    });
  }
}
