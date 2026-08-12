import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';
import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects a user changing their own role', async () => {
    await expect(service.update(3, { role: UserRole.TEACHER }, { id: 3, role: UserRole.ADMIN }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });
});
