import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello() {
    return {
      name: 'WG Grappling API',
      version: '1.0.0',
      status: 'online',
      message: 'Bem-vindo à API da WG Grappling!',
    };
  }
}