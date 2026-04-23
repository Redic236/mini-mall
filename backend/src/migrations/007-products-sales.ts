/**
 * Adds a denormalised salesCount column to products, bumped at order create
 * and rolled back at order cancel. Used by the sort=sales listing option.
 *
 * Backfills from order_items for non-cancelled orders so existing rows get
 * a sensible starting count instead of zero.
 */
import { DataTypes } from 'sequelize';
import type { MigrationContext } from '../config/migrator';

const TABLE = 'products';
const COLUMN = 'salesCount';

export async function up({ context }: { context: MigrationContext }): Promise<void> {
  const { queryInterface } = context;
  await queryInterface.addColumn(TABLE, COLUMN, {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  });

  // Backfill: sum quantities of order_items whose order is not cancelled.
  await queryInterface.sequelize.query(
    `UPDATE \`${TABLE}\` p SET p.\`${COLUMN}\` = (
       SELECT COALESCE(SUM(oi.quantity), 0)
       FROM \`order_items\` oi
       JOIN \`orders\` o ON o.id = oi.orderId
       WHERE oi.productId = p.id AND o.status <> '已取消'
     )`,
  );
}

export async function down({ context }: { context: MigrationContext }): Promise<void> {
  await context.queryInterface.removeColumn(TABLE, COLUMN);
}
