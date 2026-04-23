/**
 * Adds a composite index on orders(status, createdAt). The expiry scheduler
 * runs `SELECT id FROM orders WHERE status = '待支付' AND createdAt < ?`
 * every minute. Without this index, MySQL uses the existing idx_orders_status
 * (status-only) and then filters createdAt row-by-row. A leading (status,
 * createdAt) index lets it do a direct range scan.
 *
 * For fresh installs this is already baked into init.sql; this migration
 * exists so databases created before the index existed can catch up.
 */
import type { MigrationContext } from '../config/migrator';

const INDEX_NAME = 'idx_orders_status_created_at';
const TABLE = 'orders';
const COLUMNS: [string, string] = ['status', 'createdAt'];

export async function up({ context }: { context: MigrationContext }): Promise<void> {
  await context.queryInterface.addIndex(TABLE, COLUMNS, { name: INDEX_NAME });
}

export async function down({ context }: { context: MigrationContext }): Promise<void> {
  await context.queryInterface.removeIndex(TABLE, INDEX_NAME);
}
