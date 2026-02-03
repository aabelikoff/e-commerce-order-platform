import { Module } from '@nestjs/common';
import { UsersV1Controller } from './v1/users.controller.v1';
import { UsersService } from './users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/database/entities';

@Module({
  imports:[TypeOrmModule.forFeature([User])],
  controllers: [UsersV1Controller],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
