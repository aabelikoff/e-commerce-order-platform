import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './v1/dto';
import { paginateByCursor } from 'src/common/pagination/cursor/paginate-by-cursor';
import { ResponseListDto } from 'src/common/dto/response-list.dto';
import { CursorPaginationQueryDto } from 'src/common/dto/cursor-pagination-query.dto';
import { OffsetPaginationQueryDto } from 'src/common/dto/offset-pagination-query.dto';
import { paginateOffset } from 'src/common/pagination/offset/paginate-offset';
import { ProblemTypes } from 'src/common/types/problem-types';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/database/entities';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  findAll(query: OffsetPaginationQueryDto): Promise<User[]> {
    const { limit, page } = query;
    const offset = (page - 1) * limit;
    console.log('Find all in service');
    return this.usersRepository.find({
      take: limit,
      skip: offset,
      order: { createdAt: 'DESC' },
    });
  }

  findOne(id: string): Promise<User> {
    return this.usersRepository.findOneByOrFail({
      id,
    });
  }

  async remove(id: string) {
    this.usersRepository.delete(id);
  }

  async create(user: CreateUserDto): Promise<UserResponseDto> {
    const passwordHash = await bcrypt.hash(user.password, 10);

    const newUser = {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      isActive: true,
      passwordHash,
    };
    const resultUser = this.usersRepository.create(newUser);
    await this.usersRepository.save(resultUser);
    return {
      id: resultUser.id,
      firstName: resultUser.firstName,
      lastName: resultUser.lastName,
      email: resultUser.email,
      createdAt: resultUser.createdAt,
      updatedAt: resultUser.updatedAt,
    }
  }

  // async getAll(
  //   query: OffsetPaginationQueryDto,
  // ): Promise<ResponseListDto<User>> {
  //   return paginateOffset(query, await this.usersRepository.find());
  // }

  async getById(id: string): Promise<User> {
    return this.usersRepository.findOneByOrFail({ id });
  }

  async update(id: string, user: UpdateUserDto): Promise<User> {
    await this.usersRepository.update(id, user);
    return this.usersRepository.findOneByOrFail({ id });
  }

  async delete(id: string): Promise<User> {
    return this.delete(id);
  }
}
