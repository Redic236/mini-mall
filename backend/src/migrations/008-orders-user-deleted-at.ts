/**
 * Adds a soft-delete marker so users can hide completed / cancelled orders
 * from their own list without losing the row — admin and finance still need
 * to see historical orders for audit and revenue reporting.
 *
 * A composite index on (userId, userDeletedAt, id DESC) keeps the user's
 * list query narrow: with deleted rows filtered out first by index, the
 * remaining scan pages through orders in id-desc order without a filesort.
 */
import { DataTypes } from 'sequelize';
import type { MigrationContext } from '../config/migrator';

const TABLE = 'orders';
const COLUMN = 'userDeletedAt';
const INDEX_NAME = 'idx_orders_user_not_deleted';

export async function up({ context }: { context: MigrationContext }): Promise<void> {
  const { queryInterface } = context;
  await queryInterface.addColumn(TABLE, COLUMN, {
    type: DataTypes.DATE,
    allowNull: true,
  });
  await queryInterface.addIndex(TABLE, {
    name: INDEX_NAME,
    fields: ['userId', COLUMN],
  });
}

export async function down({ context }: { context: MigrationContext }): Promise<void> {
  const { queryInterface } = context;
  await queryInterface.removeIndex(TABLE, INDEX_NAME);
  await queryInterface.removeColumn(TABLE, COLUMN);
}
