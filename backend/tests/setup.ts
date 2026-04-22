import path from 'node:path';
import dotenv from 'dotenv';
import { beforeAll, afterAll } from 'vitest';

// Load the shared .env for DB_HOST/DB_USER/DB_PASSWORD first ...
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ... then force the test database name BEFORE any app module loads.
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'mini_mall_test';

// Silence winston output during tests — override the default console transport.
process.env.LOG_LEVEL = 'error';

// Now we can safely import app modules.
import { sequelize } from '../src/config/database';
import '../src/models';

beforeAll(async () => {
  await sequelize.authenticate();
  // Drop and recreate tables from models. CHECK constraints from init.sql
  // are tested separately; this keeps tests fast and isolated from prod schema.
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});
