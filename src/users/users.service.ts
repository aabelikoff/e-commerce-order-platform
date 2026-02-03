import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IUser } from './v1/types/user.interface';
import { CreateUserDto, UpdateUserDto } from './v1/dto';
import { randomUUID } from 'crypto';
import { usersMockData } from 'mocks/users-mock-data';
import { paginateByCursor } from 'src/common/pagination/cursor/paginate-by-cursor';
import { ResponseListDto } from 'src/common/dto/response-list.dto';
import { CursorPaginationQueryDto } from 'src/common/dto/cursor-pagination-query.dto';
import { OffsetPaginationQueryDto } from 'src/common/dto/offset-pagination-query.dto';
import { paginateOffset } from 'src/common/pagination/offset/paginate-offset';
import { ProblemTypes } from 'src/common/types/problem-types';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/database/entities';
import { Repository } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  findOne(id: string): Promise<User> {
    return this.usersRepository.findOneByOrFail({
      id,
    });
  }

  async remove(id: string) {
    this.usersRepository.delete(id);
  }

  private readonly users: IUser[] = usersMockData;

  private existEmail(email: string): boolean {
    return this.users.some((user) => user.email === email);
  }

  private delay<T>(value: T, ms: number): Promise<T> {
    return new Promise((resolve) => setTimeout(() => resolve(value), ms));
  }

  async create(user: CreateUserDto): Promise<Omit<IUser, 'password'>> {
    const normalizedEmail = user.email.toLowerCase();
    if (this.existEmail(normalizedEmail)) {
      throw new ConflictException({
        type: ProblemTypes.USER_EMAIL_EXISTS,
        title: 'User email exists',
        detail: `Email ${normalizedEmail} already exists`,
        code: 'USER_EMAIL_EXISTS',
        errors: { email: ['already exists'] },
      });
    }
    const now = new Date();
    const newUser = {
      ...user,
      email: normalizedEmail,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    } as IUser;
    this.users.push(newUser);
    const { password, ...result } = newUser;
    return this.delay(result, 100);
  }

  async getAll(
    query: OffsetPaginationQueryDto,
  ): Promise<ResponseListDto<IUser>> {
    return paginateOffset(query, this.users);
  }
  // async getAll(
  //   query: CursorPaginationQueryDto,
  // ): Promise<ResponseListDto<IUser>> {
  //   return paginateByCursor(query, this.users);
  // }

  async getById(id: string): Promise<IUser> {
    const user = this.users.find((user) => user.id === id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    const { password, ...result } = user;
    return this.delay(result, 100);
  }

  async update(id: string, user: UpdateUserDto): Promise<IUser> {
    const index = this.users.findIndex((u) => u.id === id);
    if (index === -1) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    this.users[index] = { ...this.users[index], ...user };
    const { password, ...result } = this.users[index];
    return this.delay(result, 100);
  }

  // async remove(id: string): Promise<IUser> {
  //   const index = this.users.findIndex((u) => u.id === id);
  //   if (index === -1) {
  //     throw new NotFoundException(`User with ID ${id} not found`);
  //   }
  //   return this.delay(this.users.splice(index, 1)[0], 100);
  // }
}
