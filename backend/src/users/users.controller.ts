import { Controller, Get, Post, Body, Patch, Param, Delete, Request, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UserRole } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Audit } from '../audit/audit.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
@Roles(UserRole.OWNER, UserRole.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Audit({ action: 'CREATE', entity: 'User' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Patch(':id')
  @Audit({ action: 'UPDATE', entity: 'User', entityIdParam: 'id' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Request() req: any) {
    return this.usersService.update(+id, updateUserDto, req.user);
  }

  @Delete(':id')
  @Audit({ action: 'DELETE', entity: 'User', entityIdParam: 'id' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
