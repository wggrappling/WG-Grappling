import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('WG Grappling API')
    .setDescription('Sistema de gestão da academia WG Grappling')
    .setVersion('1.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    }, 'access-token')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api', app, document);

  await app.listen(port ?? 3000);

  if (process.env.NODE_ENV === 'production') {
    logger.log('API iniciada em modo de produção');
    logger.log('Swagger disponível');
    return;
  }

  logger.log(`API iniciada em: http://localhost:${port ?? 3000}`);
  logger.log(`Swagger em: http://localhost:${port ?? 3000}/api`);
}

bootstrap();