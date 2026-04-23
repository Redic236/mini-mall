/**
 * Snapshot the shipping address onto each order at creation time so that
 * editing or deleting the address later does not retroactively change what
 * the order was shipped to. Before this, an order only held a FK (addressId)
 * to the live addresses row.
 *
 * Steps:
 *   1. Add 6 snapshot columns as nullable so the ALTER can run on a table
 *      that already has rows.
 *   2. Backfill from the referenced addresses row (UPDATE ... JOIN).
 *   3. Tighten to NOT NULL — new inserts must populate the snapshot.
 *
 * The FK to addresses and the existing addressId column are intentionally
 * kept as-is. Address deletion is still guarded by the FK (RESTRICT by
 * default), so no risk of dangling joins. The snapshot exists for display
 * correctness, not for FK relaxation.
 */
import { DataTypes } from 'sequelize';
import type { MigrationContext } from '../config/migrator';

const TABLE = 'orders';

const COLUMNS = {
  receiverName: { type: DataTypes.STRING(50) },
  receiverPhone: { type: DataTypes.STRING(20) },
  province: { type: DataTypes.STRING(50) },
  city: { type: DataTypes.STRING(50) },
  district: { type: DataTypes.STRING(50) },
  detailAddress: { type: DataTypes.STRING(255) },
} as const;

type ColumnName = keyof typeof COLUMNS;
const COLUMN_NAMES = Object.keys(COLUMNS) as ColumnName[];

// Snapshot column -> source column on `addresses`.
const BACKFILL_SOURCE: Record<ColumnName, string> = {
  receiverName: 'name',
  receiverPhone: 'phone',
  province: 'province',
  city: 'city',
  district: 'district',
  detailAddress: 'detail',
};

export async function up({ context }: { context: MigrationContext }): Promise<void> {
  const { queryInterface } = context;
  const sequelize = queryInterface.sequelize;

  for (const name of COLUMN_NAMES) {
    await queryInterface.addColumn(TABLE, name, {
      ...COLUMNS[name],
      allowNull: true,
    });
  }

  for (const name of COLUMN_NAMES) {
    const source = BACKFILL_SOURCE[name];
    await sequelize.query(
      `UPDATE \`${TABLE}\` o
       JOIN \`addresses\` a ON a.id = o.addressId
       SET o.\`${name}\` = a.\`${source}\`
       WHERE o.\`${name}\` IS NULL`,
    );
  }

  for (const name of COLUMN_NAMES) {
    await queryInterface.changeColumn(TABLE, name, {
      ...COLUMNS[name],
      allowNull: false,
    });
  }
}

export async function down({ context }: { context: MigrationContext }): Promise<void> {
  const { queryInterface } = context;
  for (const name of COLUMN_NAMES) {
    await queryInterface.removeColumn(TABLE, name);
  }
}
