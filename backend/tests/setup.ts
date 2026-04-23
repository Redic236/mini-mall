import { beforeAll, afterAll } from 'vitest';
import { sequelize } from '../src/config/database';
import '../src/models';

// NODE_ENV / DB_NAME / LOG_LEVEL are set via vitest.config.ts `test.env`
// (must be applied before any app module loads due to ES module import hoisting).

beforeAll(async () => {
  // Hard guard — never run schema-resetting operations against a non-test DB.
  const dbName = (sequelize.getDatabaseName() as string) ?? '';
  if (!dbName.endsWith('_test')) {
    throw new Error(
      `Refusing to run tests against database "${dbName}". Test DB name must end with "_test".`,
    );
  }

  await sequelize.authenticate();
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});
