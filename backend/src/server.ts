import { createApp } from './app';
import { appConfig } from './config/app';
import { sequelize, testDbConnection } from './config/database';
import './models';
import { logger } from './utils/logger';

async function bootstrap(): Promise<void> {
  try {
    await testDbConnection();
    logger.info('Database connected');
  } catch (err) {
    logger.error('Database connection failed', { err });
    process.exit(1);
  }

  const app = createApp();
  app.listen(appConfig.port, () => {
    logger.info(`Server listening on http://localhost:${appConfig.port}`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, shutting down`);
    await sequelize.close();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

void bootstrap();
