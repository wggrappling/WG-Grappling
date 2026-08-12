import { ForbiddenException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from '../../generated/prisma/enums';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
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

  async findByEmail(email: string) {
    return await this.prisma.user.findUnique({
      where: { email },
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto, actor?: { id: number; role: UserRole }) {
    if (actor?.id === id && updateUserDto.role !== undefined) {
      throw new ForbiddenException('Usuário não pode alterar o próprio role.');
    }
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
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

  async remove(id: number) {
    await this.prisma.user.delete({
      where: { id },
    });

    return {
      message: 'Usuário removido com sucesso!',
    };
  }
}
