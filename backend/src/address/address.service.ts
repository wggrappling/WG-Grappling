import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const addresses = await this.prisma.address.findMany({
      include: { person: true },
    });

    return {
      module: 'Address',
      total: addresses.length,
      data: addresses,
    };
  }

  async findOne(id: number) {
    const address = await this.prisma.address.findUnique({
      where: { id },
      include: { person: true },
    });

    if (!address) {
      throw new NotFoundException(`Endereço com id ${id} não encontrado.`);
    }

    return address;
  }

  async create(createAddressDto: CreateAddressDto) {
    const person = await this.prisma.person.findUnique({
      where: { id: createAddressDto.personId },
    });

    if (!person) {
      throw new NotFoundException(`Person com id ${createAddressDto.personId} não encontrada.`);
    }

    const address = await this.prisma.address.create({
      data: createAddressDto,
      include: { person: true },
    });

    return {
      message: 'Endereço cadastrado com sucesso!',
      data: address,
    };
  }

  async update(id: number, updateAddressDto: UpdateAddressDto) {
    const existing = await this.prisma.address.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Endereço com id ${id} não encontrado.`);
    }

    if (updateAddressDto.personId) {
      const person = await this.prisma.person.findUnique({
        where: { id: updateAddressDto.personId },
      });

      if (!person) {
        throw new NotFoundException(`Person com id ${updateAddressDto.personId} não encontrada.`);
      }
    }

    const address = await this.prisma.address.update({
      where: { id },
      data: updateAddressDto,
      include: { person: true },
    });

    return {
      message: 'Endereço atualizado com sucesso!',
      data: address,
    };
  }

  async remove(id: number) {
    await this.prisma.address.delete({
      where: { id },
    });

    return {
      message: 'Endereço removido com sucesso!',
    };
  }
}
