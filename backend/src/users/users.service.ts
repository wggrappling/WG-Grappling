import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

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
    const users = await this.prisma.user.findMany();

    return {
      module: 'Users',
      total: users.length,
      data: users,
    };
  }

  async findOne(id: number) {
    return await this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string) {
    return await this.prisma.user.findUnique({
      where: { email },
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
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
