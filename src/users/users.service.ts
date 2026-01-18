import { Injectable, NotFoundException } from '@nestjs/common';
import { IUser } from './types/user.interface';
import { CreateUserDto, ListAllUsersQuery, UpdateUserDto } from './dto';
import { randomUUID } from 'crypto';

@Injectable()
export class UsersService {
  private readonly users: IUser[] = [];
  private idCounter = 1;

  private delay<T>(value: T, ms: number): Promise<T> {
    return new Promise((resolve) => setTimeout(() => resolve(value), ms));
  }

  async create(user: CreateUserDto): Promise<IUser> {
    const newUser = { ...user, id: randomUUID() } as IUser;
    this.users.push(newUser);
    return this.delay(newUser, 100);
  }

  async getAll(query: ListAllUsersQuery): Promise<IUser[]> {
    const { page = 1, limit = 10 } = query;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUsers = this.users.slice(startIndex, endIndex);
    return this.delay(paginatedUsers, 100);
  }

  async getById(id: string): Promise<IUser> {
    const user = this.users.find((user) => user.id === id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return this.delay(user, 100);
  }

  async update(id: string, user: UpdateUserDto): Promise<IUser> {
    const index = this.users.findIndex((u) => u.id === id);
    if (index === -1) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    this.users[index] = { ...this.users[index], ...user };
    return this.delay(this.users[index], 100);
  }

  async remove(id: string): Promise<IUser> {
    const index = this.users.findIndex((u) => u.id === id);
    if (index === -1) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return this.delay(this.users.splice(index, 1)[0], 100);
  }
}
