/**
 * Add the coupons table + order.couponId / order.discountAmount columns
 * to support the simple coupon-code flow: user types a code at checkout,
 * server validates + applies discount + bumps usedCount atomically.
 *
 * No separate user_coupons table — per-user usage is counted directly off
 * orders.couponId, which keeps the schema small.
 */
import { DataTypes } from 'sequelize';
import type { MigrationContext } from '../config/migrator';

const COUPONS_TABLE = 'coupons';
const ORDERS_TABLE = 'orders';

export async function up({ context }: { context: MigrationContext }): Promise<void> {
  const { queryInterface } = context;

  await queryInterface.createTable(COUPONS_TABLE, {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
    code: { type: DataTypes.STRING(40), allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    type: { type: DataTypes.STRING(20), allowNull: false },
    value: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    minOrderAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    startsAt: { type: DataTypes.DATE, allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    totalQuantity: { type: DataTypes.INTEGER, allowNull: true },
    usedCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    perUserLimit: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  });
  await queryInterface.addIndex(COUPONS_TABLE, ['code'], { name: 'idx_coupons_code', unique: true });
  await queryInterface.addIndex(COUPONS_TABLE, ['isActive'], { name: 'idx_coupons_is_active' });
  await queryInterface.sequelize.query(
    `ALTER TABLE \`${COUPONS_TABLE}\` ADD CONSTRAINT \`chk_coupons_value_nonneg\` CHECK (\`value\` >= 0)`,
  );

  await queryInterface.addColumn(ORDERS_TABLE, 'couponId', {
    type: DataTypes.INTEGER,
    allowNull: true,
  });
  await queryInterface.addColumn(ORDERS_TABLE, 'discountAmount', {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  });
  await queryInterface.addConstraint(ORDERS_TABLE, {
    fields: ['couponId'],
    type: 'foreign key',
    name: 'fk_orders_coupon',
    references: { table: COUPONS_TABLE, field: 'id' },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  });
}

export async function down({ context }: { context: MigrationContext }): Promise<void> {
  const { queryInterface } = context;
  await queryInterface.removeConstraint(ORDERS_TABLE, 'fk_orders_coupon');
  await queryInterface.removeColumn(ORDERS_TABLE, 'discountAmount');
  await queryInterface.removeColumn(ORDERS_TABLE, 'couponId');
  await queryInterface.dropTable(COUPONS_TABLE);
}
