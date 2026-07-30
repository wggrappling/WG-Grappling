import { Module } from '@nestjs/common';
import { PeopleController } from './people.controller';
import { PeopleService } from './people.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PeopleController],
  providers: [PeopleService],
})
export class PeopleModule {}