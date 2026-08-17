import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

import { AppModule } from './app.module';
import { configureSwagger, logStartup } from './bootstrap-config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT');
  const nodeEnv = configService.get<string>('NODE_ENV');
  const origins = configService.get<string>('CORS_ORIGIN')?.split(',').map((value) => value.trim()).filter(Boolean) ?? [];
  app.enableCors({ origin: nodeEnv === 'production' ? origins : origins.length ? origins : ['http://localhost:5173'], credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  configureSwagger(app, nodeEnv);

  const listenPort = port ?? 3000;
  await app.listen(listenPort);
  logStartup(logger, nodeEnv, listenPort);
}

bootstrap();
