import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { FinancialCycleService } from '../src/charge/financial-cycle.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  try {
    const result = await app.get(FinancialCycleService).run();
    console.log(JSON.stringify(result));
    if (result.errors > 0) process.exitCode = 1;
  } finally {
    await app.close();
  }
}

main().catch(() => {
  console.error('Falha ao executar o ciclo financeiro.');
  process.exitCode = 1;
});
