/**
 * Introduce the payments table to back the sandbox payment flow. Each pay
 * attempt on an order gets a Payment row; terminal states (success/failed/
 * cancelled) are driven by a signed gateway callback, not a direct flip.
 *
 * The columns mirror backend/src/models/Payment.ts. Fresh installs get
 * the same shape via database/init.sql.
 */
import { DataTypes } from 'sequelize';
import type { MigrationContext } from '../config/migrator';

const TABLE = 'payments';

export async function up({ context }: { context: MigrationContext }): Promise<void> {
  const { queryInterface } = context;

  await queryInterface.createTable(TABLE, {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
    orderId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    method: { type: DataTypes.STRING(50), allowNull: false },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' },
    gatewayTxId: { type: DataTypes.STRING(64), allowNull: true },
    paidAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  });

  await queryInterface.addIndex(TABLE, ['orderId'], { name: 'idx_payments_order_id' });
  await queryInterface.addIndex(TABLE, ['userId'], { name: 'idx_payments_user_id' });
  await queryInterface.addIndex(TABLE, ['status'], { name: 'idx_payments_status' });

  await queryInterface.addConstraint(TABLE, {
    fields: ['orderId'],
    type: 'foreign key',
    name: 'fk_payments_order',
    references: { table: 'orders', field: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });
  await queryInterface.addConstraint(TABLE, {
    fields: ['userId'],
    type: 'foreign key',
    name: 'fk_payments_user',
    references: { table: 'users', field: 'id' },
    onDelete: 'NO ACTION',
    onUpdate: 'CASCADE',
  });
  // Raw SQL because queryInterface.addConstraint's `check` type with a where
  // clause doesn't generate the plain `CHECK (col >= 0)` we want on MySQL.
  await queryInterface.sequelize.query(
    `ALTER TABLE \`${TABLE}\` ADD CONSTRAINT \`chk_payments_amount_nonneg\` CHECK (\`amount\` >= 0)`,
  );
}

export async function down({ context }: { context: MigrationContext }): Promise<void> {
  await context.queryInterface.dropTable(TABLE);
}
