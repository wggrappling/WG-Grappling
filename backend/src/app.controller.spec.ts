import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;
  let queryRaw: jest.Mock;

  beforeEach(async () => {
    queryRaw = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, { provide: PrismaService, useValue: { $queryRaw: queryRaw } }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('reports the database connection', async () => {
      await expect(appController.getHealth()).resolves.toEqual({ status: 'ok', database: 'up' });
    });

    it('returns a safe 503 response when the database is unavailable', async () => {
      queryRaw.mockRejectedValueOnce(new Error('connection failed for postgresql://user:secret@host/db'));

      try {
        await appController.getHealth();
        throw new Error('Expected health check to fail');
      } catch (error) {
        expect(error).toBeInstanceOf(ServiceUnavailableException);
        const exception = error as ServiceUnavailableException;
        expect(exception.getStatus()).toBe(503);
        expect(exception.getResponse()).toEqual({ status: 'unavailable', database: 'down' });
        expect(JSON.stringify(exception.getResponse())).not.toContain('secret');
        expect(JSON.stringify(exception.getResponse())).not.toContain('postgresql://');
      }
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
