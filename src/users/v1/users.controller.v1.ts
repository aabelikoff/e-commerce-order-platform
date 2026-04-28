import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './dto';
import { UsersService } from '../users.service';
import { ApiOkWrappedResponse } from 'src/common/decorators';
import { ResponseListDto } from 'src/common/dto/response-list.dto';
import { CursorPaginationQueryDto } from 'src/common/dto/cursor-pagination-query.dto';
import { UsersListResponseDto } from './dto/user-response.dto';
import { User } from 'src/database/entities';
import { ERoles } from 'src/auth/access/roles';
import { Roles } from 'src/auth/decorators';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AccessGuard } from 'src/auth/guards/access.guard';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

@Controller({ path: 'users', version: '1' })
@ApiTags('users')
export class UsersV1Controller {
  constructor(private usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create user' })
  async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by id' })
  @ApiParam({ name: 'id', description: 'User id (UUID)' })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List users (admin/support)' })
  @ApiOkWrappedResponse(UsersListResponseDto)
  async getAll(
    @Query() query: CursorPaginationQueryDto,
  ): Promise<ResponseListDto<User>> {
    return this.usersService.findAll(query);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user by id' })
  @ApiParam({ name: 'id', description: 'User id (UUID)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<User> {
    return this.usersService.update(id, dto);
  }
}
