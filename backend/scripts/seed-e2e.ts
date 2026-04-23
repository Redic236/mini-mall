/**
 * Force-seed the E2E database. Safe to run repeatedly — drops all tables and
 * repopulates a deterministic fixture set that specs can assume exists.
 *
 * Run via:  npm run e2e:seed   (cross-env sets DB_NAME=mini_mall_e2e)
 *
 * Creates the DB if it doesn't exist (via a server-level bootstrap connection),
 * then uses the app's Sequelize singleton with sync({ force: true }). The
 * _e2e suffix guard is defense-in-depth against the script being invoked
 * against a non-e2e database.
 */
import mysql from 'mysql2/promise';
import 'dotenv/config';
import { sequelize } from '../src/config/database';
import { Product, User, USER_ROLE } from '../src/models';
import { hashPassword } from '../src/utils/password';

async function main(): Promise<void> {
  const host = process.env.DB_HOST ?? '127.0.0.1';
  const port = Number(process.env.DB_PORT ?? 3306);
  const user = process.env.DB_USER ?? 'root';
  const password = process.env.DB_PASSWORD ?? '';
  const dbName = sequelize.getDatabaseName() as string;

  if (!dbName.endsWith('_e2e')) {
    throw new Error(
      `Refusing to seed e2e DB "${dbName}" — the DB name must end with _e2e.`,
    );
  }

  const bootstrap = await mysql.createConnection({ host, port, user, password });
  await bootstrap.query(
    `CREATE DATABASE IF NOT EXISTS \`${dbName}\` DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_unicode_ci`,
  );
  await bootstrap.end();

  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  await Product.bulkCreate([
    { name: 'E2E T-Shirt', price: 59, stock: 100, description: 'apparel fixture', category: '服装', image: null },
    { name: 'E2E Jeans', price: 199, stock: 50, description: 'apparel fixture', category: '服装', image: null },
    { name: 'E2E Sneakers', price: 399, stock: 10, description: 'footwear fixture', category: '鞋履', image: null },
  ]);

  // Fixed admin account for admin-flavoured specs. Credentials are public
  // in the E2E helpers — this DB is thrown away per run.
  await User.create({
    username: 'e2eadmin',
    email: 'admin@e2e.test',
    passwordHash: await hashPassword('AdminPass123'),
    avatar: null,
    role: USER_ROLE.ADMIN,
  });

  await sequelize.close();
  process.stdout.write(`E2E seed complete (${dbName})\n`);
}

main().catch((err: unknown) => {
  process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
