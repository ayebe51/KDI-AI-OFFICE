import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import { AppModule } from './app.module.js';
import { loadAppConfig } from '@kdi/config';
import { StructuredLogger } from '@kdi/shared';

async function bootstrap() {
  const config = loadAppConfig();
  const logger = new StructuredLogger('NestJS-Bootstrap');

  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: config.corsOrigins,
      credentials: true,
    },
  });

  // Attach WebSocket adapter for standard ws protocol
  app.useWebSocketAdapter(new WsAdapter(app));

  const port = config.port;
  const host = config.host;

  await app.listen(port, host);
  logger.info(
    'bootstrap',
    `KDI AI Office API & Realtime Service started successfully on http://${host}:${port} [${config.env}]`
  );
  logger.info('bootstrap', `WebSocket Telemetry active on ws://${host}:${port}/ws/v1/events`);
}

bootstrap().catch((err: unknown) => {
  console.error('Fatal bootstrapping error:', err);
  process.exit(1);
});
