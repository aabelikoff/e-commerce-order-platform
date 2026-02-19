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
  UseGuards,
} from '@nestjs/common';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './dto';
import { UsersService } from '../users.service';
import { IUser } from './types/user.interface';
import { ApiBody, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiOkWrappedResponse } from 'src/common/decorators';
import { ResponseListDto } from 'src/common/dto/response-list.dto';
import { CursorPaginationQueryDto } from 'src/common/dto/cursor-pagination-query.dto';
import { OffsetPaginationQueryDto } from 'src/common/dto/offset-pagination-query.dto';
import { UsersListResponseDto } from './dto/user-response.dto';
import { User } from 'src/database/entities';
import { ERoles } from 'src/auth/access/roles';
import { Roles, Scopes } from 'src/auth/decorators';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AccessGuard } from 'src/auth/guards/access.guard';

@Controller({ path: 'users', version: '1' })
export class UsersV1Controller {
  constructor(private usersService: UsersService) {}

  @Post()
  async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(dto);
  }

  @Get(':id')
  @ApiOkWrappedResponse(UserResponseDto)
  async getOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserResponseDto> {
    return this.usersService.getById(id);
  }

  @UseGuards(JwtAuthGuard, AccessGuard)
  @Roles(ERoles.ADMIN, ERoles.SUPPORT)
  // @Scopes(UserScopes.USER_READ)
  @Get()
  @ApiOkWrappedResponse(UsersListResponseDto)
  async getAll(
    @Query() query: OffsetPaginationQueryDto,
  ): Promise<ResponseListDto<User>> {
    const users = await this.usersService.findAll(query);
    return {
      items: users,
      pagination: {
        offset: query.page - 1,
        limit: query.limit,
      },
    };
  }

  // @Get()
  // @ApiOkWrappeResponse(UsersListResponseDto)
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
  ): Promise<User> {
    return this.usersService.update(id, dto);
  }

  // @Delete(':id')
  // async remove(@Param('id', ParseUUIDPipe) id: string): Promise<IUser> {
  //   return this.usersService.remove(id);
  // }
}
