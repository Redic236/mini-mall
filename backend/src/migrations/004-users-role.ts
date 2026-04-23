/**
 * Add a role column to users to distinguish admins from regular shoppers.
 * Existing rows default to 'user' so legacy installs keep their current
 * behaviour until someone explicitly promotes an account.
 */
import { DataTypes } from 'sequelize';
import type { MigrationContext } from '../config/migrator';

const TABLE = 'users';
const COLUMN = 'role';

export async function up({ context }: { context: MigrationContext }): Promise<void> {
  await context.queryInterface.addColumn(TABLE, COLUMN, {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'user',
  });
}

export async function down({ context }: { context: MigrationContext }): Promise<void> {
  await context.queryInterface.removeColumn(TABLE, COLUMN);
}
