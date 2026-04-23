import { createApp } from './app';
import { appConfig } from './config/app';
import { sequelize, testDbConnection } from './config/database';
import './models';
import { startExpiryScheduler, stopExpiryScheduler } from './jobs/expiryScheduler';
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

  // Background: auto-cancel 待支付 orders past the payment window.
  // Tests drive expiry directly by calling the service; skip here.
  if (process.env.NODE_ENV !== 'test') {
    startExpiryScheduler();
  }

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, shutting down`);
    stopExpiryScheduler();
    await sequelize.close();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

void bootstrap();
