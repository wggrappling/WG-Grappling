import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';

@Injectable()
export class PeopleService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const people = await this.prisma.person.findMany();

    return {
      module: 'People',
      total: people.length,
      data: people,
    };
  }

  async findOne(id: number) {
    const person = await this.prisma.person.findUnique({
      where: {
        id,
      },
    });

    return person;
  }

  async create(createPersonDto: CreatePersonDto) {
    const person = await this.prisma.person.create({
      data: createPersonDto,
    });

    return {
      message: 'Pessoa cadastrada com sucesso!',
      data: person,
    };
  }

  async update(id: number, updatePersonDto: UpdatePersonDto) {
    const person = await this.prisma.person.update({
      where: {
        id,
      },
      data: updatePersonDto,
    });

    return {
      message: 'Pessoa atualizada com sucesso!',
      data: person,
    };
  }

  async remove(id: number) {
    await this.prisma.person.delete({
      where: {
        id,
      },
    });

    return {
      message: 'Pessoa removida com sucesso!',
    };
  }
}