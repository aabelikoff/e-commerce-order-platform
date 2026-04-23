import { Injectable } from '@nestjs/common';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './v1/dto';
import { ResponseListDto } from 'src/common/dto/response-list.dto';
import { CursorPaginationQueryDto } from 'src/common/dto/cursor-pagination-query.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/database/entities';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { paginateQueryBuilderByCursor } from 'src/common/pagination/cursor/paginate-query-builder';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  findAll(query: CursorPaginationQueryDto): Promise<ResponseListDto<User>> {
    const usersQuery = this.usersRepository
      .createQueryBuilder('user')
      .orderBy('user.createdAt', 'DESC')
      .addOrderBy('user.id', 'DESC');

    return paginateQueryBuilderByCursor(usersQuery, query, 'user');
  }

  findOne(id: string): Promise<User> {
    return this.usersRepository.findOneByOrFail({
      id,
    });
  }

  async remove(id: string) {
    await this.usersRepository.delete(id);
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
    };
  }
  async getById(id: string): Promise<User> {
    return this.usersRepository.findOneByOrFail({ id });
  }

  async update(id: string, user: UpdateUserDto): Promise<User> {
    await this.usersRepository.update(id, user);
    return this.usersRepository.findOneByOrFail({ id });
  }

  async delete(id: string): Promise<User> {
    const user = await this.usersRepository.findOneByOrFail({ id });
    await this.usersRepository.delete(id);
    return user;
  }
}
