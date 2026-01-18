import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CreateUserDto, UpdateUserDto, ListAllUsersQuery } from './dto';
import { UsersService } from './users.service';
import { IUser } from './types/user.interface';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  async create(@Body() dto: CreateUserDto): Promise<IUser> {
    return this.usersService.create(dto);
  }

  @Get(':id')
  async getOne(@Param('id', ParseUUIDPipe) id: string): Promise<IUser> {
    return this.usersService.getById(id);
  }

  @Get()
  async getAll(@Query() query: ListAllUsersQuery): Promise<IUser[]> {
    return this.usersService.getAll(query);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<IUser> {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<IUser> {
    return this.usersService.remove(id);
  }
}
