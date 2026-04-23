import { DataTypes } from 'sequelize';
import type { MigrationContext } from '../config/migrator';

const TABLE = 'shipment_events';

export async function up({ context }: { context: MigrationContext }): Promise<void> {
  const { queryInterface } = context;
  await queryInterface.createTable(TABLE, {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
    orderId: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.STRING(30), allowNull: false },
    location: { type: DataTypes.STRING(100), allowNull: true },
    note: { type: DataTypes.STRING(255), allowNull: true },
    happenedAt: { type: DataTypes.DATE, allowNull: false },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  });
  await queryInterface.addIndex(TABLE, ['orderId'], { name: 'idx_shipment_events_order_id' });
  await queryInterface.addConstraint(TABLE, {
    fields: ['orderId'],
    type: 'foreign key',
    name: 'fk_shipment_events_order',
    references: { table: 'orders', field: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });
}

export async function down({ context }: { context: MigrationContext }): Promise<void> {
  await context.queryInterface.dropTable(TABLE);
}
