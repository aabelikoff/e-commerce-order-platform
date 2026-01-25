import {
  Body,
  Controller,
  DefaultValuePipe,
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
import {
  CreateUserDto,
  UpdateUserDto,
  UserResponseDto,
} from './dto';
import { UsersService } from '../users.service';
import { IUser } from './types/user.interface';
import { ApiOkResponse } from '@nestjs/swagger';
import {
  ApiOkWrappedResponse,
  ApiOkWrappedArrayResponse,
} from '../../common/decorators';
import { ResponseListDto } from 'src/common/dto/response-list.dto';
import { CursorPaginationQueryDto } from 'src/common/dto/cursor-pagination-query.dto';
import { OffsetPaginationQueryDto } from 'src/common/dto/offset-pagination-query.dto';
import { UsersListResponseDto } from './dto/user-response.dto';

@Controller({ path: 'users', version: '1' })
export class UsersV1Controller {
  constructor(private usersService: UsersService) {}

  @Post()
  async create(@Body() dto: CreateUserDto): Promise<IUser> {
    return this.usersService.create(dto);
  }

  @Get(':id')
  @ApiOkWrappedResponse(UserResponseDto)
  async getOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserResponseDto> {
    return this.usersService.getById(id);
  }

  @Get()
  @ApiOkWrappedArrayResponse(UsersListResponseDto)
  async getAll(
    @Query() query: OffsetPaginationQueryDto,
  ): Promise<ResponseListDto<IUser>> {
    const users = await this.usersService.getAll(query);
    return users;
  }

  // @Get()
  // @ApiOkWrappedArrayResponse(UsersListResponseDto)
  // async getAll(
  //   @Query() query: CursorPaginationQueryDto
  // ): Promise<ResponseListDto<IUser>> {
  //   const users = await this.usersService.getAll(query);
  //   return users;
  // }

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
