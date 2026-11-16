import {mkdirSync} from 'node:fs';
import {env} from './config/env.js';
import {closeMongo, connectMongo} from './db/mongo.js';
import {ensureFirstAdmin, seedListings} from './db/seed.js';
import {log} from './lib/logger.js';
import {verifyMailer} from './lib/mailer.js';
import {createApp} from './app.js';

const closeAll = () => closeMongo().catch(() => {});

async function main() {
  if (env.session.usingDevSecret) log.warn('SESSION_SECRET not set: using an insecure development secret.');

  await connectMongo().catch(e => {
    throw new Error(`Cannot connect to MongoDB: ${(e as Error).message}`);
  });

  await seedListings();
  await ensureFirstAdmin();
  await verifyMailer();
  mkdirSync(env.limits.uploadDir, {recursive: true});

  const server = createApp().listen(env.port, () => {
    log.info(
      `Elevare API on http://localhost:${env.port} (${env.nodeEnv}); allowed origins: ${env.allowedOrigins.join(', ')}`
    );
  });

  const shutdown = (signal: string) => {
    log.info(`${signal} received, shutting down…`);
    server.close(() => closeAll().finally(() => process.exit(0)));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch(e => {
  log.error((e as Error).message);
  closeAll().finally(() => process.exit(1));
});
