import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Address')
@UseGuards(JwtAuthGuard)
@Controller('address')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Get()
  @ApiOperation({ summary: 'Listar endereços' })
  @ApiResponse({ status: 200, description: 'Lista de endereços retornada com sucesso.' })
  findAll() {
    return this.addressService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar endereço por ID' })
  @ApiParam({ name: 'id', description: 'ID do endereço' })
  @ApiResponse({ status: 200, description: 'Endereço retornado com sucesso.' })
  findOne(@Param('id') id: string) {
    return this.addressService.findOne(Number(id));
  }

  @Post()
  @ApiOperation({ summary: 'Criar endereço' })
  @ApiBody({ type: CreateAddressDto })
  @ApiResponse({ status: 201, description: 'Endereço criado com sucesso.' })
  create(@Body() createAddressDto: CreateAddressDto) {
    return this.addressService.create(createAddressDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar endereço' })
  @ApiParam({ name: 'id', description: 'ID do endereço' })
  @ApiBody({ type: UpdateAddressDto })
  @ApiResponse({ status: 200, description: 'Endereço atualizado com sucesso.' })
  update(@Param('id') id: string, @Body() updateAddressDto: UpdateAddressDto) {
    return this.addressService.update(Number(id), updateAddressDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover endereço' })
  @ApiParam({ name: 'id', description: 'ID do endereço' })
  @ApiResponse({ status: 200, description: 'Endereço removido com sucesso.' })
  remove(@Param('id') id: string) {
    return this.addressService.remove(Number(id));
  }
}
