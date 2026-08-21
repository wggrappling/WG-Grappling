import { ForbiddenException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from '../../generated/prisma/enums';

type UserActor = { id: number; role: UserRole };

const assertCanAssignRole = (actor: UserActor, role: UserRole) => {
  if (role === UserRole.OWNER && actor.role !== UserRole.OWNER) {
    throw new ForbiddenException('Somente OWNER pode atribuir a role OWNER.');
  }
};

const assertCanManageOwner = (actor: UserActor, targetRole: UserRole) => {
  if (targetRole === UserRole.OWNER && actor.role !== UserRole.OWNER) {
    throw new ForbiddenException('Somente OWNER pode administrar outro OWNER.');
  }
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto, actor: UserActor) {
    assertCanAssignRole(actor, createUserDto.role as UserRole);
    const passwordHash = await bcrypt.hash(createUserDto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: passwordHash,
      },
    });

    const { password, ...safeUser } = user;
    return {
      message: 'Usuário cadastrado com sucesso!',
      data: safeUser,
    };
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    return {
      module: 'Users',
      total: users.length,
      data: users,
    };
  }

  async findOne(id: number) {
    return await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });
  }

  async findForAuthentication(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        sessionVersion: true,
        createdAt: true,
      },
    });
  }

  async findByEmail(email: string) {
    return await this.prisma.user.findUnique({
      where: { email },
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto, actor: UserActor) {
    if (actor.id === id && updateUserDto.role !== undefined) {
      throw new ForbiddenException('Usuário não pode alterar o próprio role.');
    }

    const current = await this.prisma.user.findUniqueOrThrow({
      where: { id },
      select: { role: true, active: true },
    });
    assertCanManageOwner(actor, current.role);
    if (updateUserDto.role !== undefined) {
      assertCanAssignRole(actor, updateUserDto.role as UserRole);
    }

    const password = updateUserDto.password
      ? await bcrypt.hash(updateUserDto.password, 10)
      : undefined;
    const invalidatesSession = password !== undefined
      || (updateUserDto.role !== undefined && updateUserDto.role !== current.role)
      || (updateUserDto.active !== undefined && updateUserDto.active !== current.active);
    const { password: _plainPassword, ...nonPasswordUpdates } = updateUserDto;
    const data = {
      ...nonPasswordUpdates,
      ...(password === undefined ? {} : { password }),
      ...(invalidatesSession ? { sessionVersion: { increment: 1 } } : {}),
    };

    const user = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    return {
      message: 'Usuário atualizado com sucesso!',
      data: user,
    };
  }

  async remove(id: number, actor: UserActor) {
    const current = await this.prisma.user.findUniqueOrThrow({
      where: { id },
      select: { role: true },
    });
    assertCanManageOwner(actor, current.role);
    await this.prisma.user.delete({
      where: { id },
    });

    return {
      message: 'Usuário removido com sucesso!',
    };
  }
}
