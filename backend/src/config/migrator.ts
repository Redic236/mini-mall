import path from 'node:path';
import { Umzug, SequelizeStorage } from 'umzug';
import type { QueryInterface } from 'sequelize';
import { sequelize } from './database';

export interface MigrationContext {
  queryInterface: QueryInterface;
}

/**
 * Umzug runner with a SequelizeMeta table for tracking applied migrations.
 *
 * Migration files live in src/migrations/ as `NNN-description.ts`, each
 * exporting `up({ context })` and `down({ context })` where `context` is a
 * { queryInterface } object. Ordering is alphabetical, so always prefix
 * with a zero-padded number so the sequence stays stable.
 */
export const migrator = new Umzug<MigrationContext>({
  migrations: {
    // __dirname resolves to backend/src/config at runtime (tsx). Migrations
    // live one level up. Allow .ts and .js so both `tsx` (dev) and compiled
    // dist runs (if any) work.
    glob: ['../migrations/*.{ts,js}', { cwd: __dirname }],
  },
  context: { queryInterface: sequelize.getQueryInterface() },
  storage: new SequelizeStorage({ sequelize, tableName: 'SequelizeMeta' }),
  logger: console,
});

export type Migration = typeof migrator._types.migration;
