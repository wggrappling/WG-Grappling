import { INestApplication, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function configureSwagger(app: INestApplication, nodeEnv?: string) {
  if (nodeEnv === 'production') return false;

  const config = new DocumentBuilder()
    .setTitle('WG Grappling API')
    .setDescription('Sistema de gestão da academia WG Grappling')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  return true;
}

export function logStartup(logger: Pick<Logger, 'log'>, nodeEnv: string | undefined, port: number) {
  if (nodeEnv === 'production') {
    logger.log('API iniciada em modo de produção');
    return;
  }
  logger.log(`API iniciada em: http://localhost:${port}`);
  logger.log(`Swagger em: http://localhost:${port}/api`);
}
