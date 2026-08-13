import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, { provide: PrismaService, useValue: { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) } }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('reports the database connection', async () => {
      await expect(appController.getHealth()).resolves.toEqual({ status: 'ok', database: 'up' });
    });
  });

  describe('root', () => {
    it('should return the API information payload', () => {
      expect(appController.getHello()).toEqual({
        name: 'WG Grappling API',
        version: '1.0.0',
        status: 'online',
        message: 'Bem-vindo à API da WG Grappling!',
      });
    });
  });
});
