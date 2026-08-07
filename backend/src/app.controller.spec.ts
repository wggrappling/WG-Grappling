import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
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
