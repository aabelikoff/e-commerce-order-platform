import { Seeder } from 'typeorm-extension';
import { DataSource } from 'typeorm';
import { User } from '../entities';
import * as bcrypt from 'bcrypt';

export default class UsersSeed implements Seeder {
  public async run(dataSource: DataSource) {
    const repo = dataSource.getRepository(User);
    console.log('UsersSeed started...');

    const passwordHash = await bcrypt.hash('password', 10);

    await repo.upsert(seedUsers.map((user) => ({ ...user, passwordHash })), ['email']); 

    console.log('UsersSeed done');
  }
}

const seedUsers = [
  {
    firstName: 'Alice',
    lastName: 'Walker',
    email: 'alice@example.com',
    roles: ['user'],
    scopes: ['order:read', 'order:write'],
  },
  {
    firstName: 'Bob',
    lastName: 'Miller',
    email: 'bob@example.com',
    roles: ['support'],
    scopes: ['order:read', 'payment:read', 'payment:write'],
  },
  {
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@example.com',
    roles: ['admin'],
    scopes: [
      'order:read',
      'order:write',
      'payment:read',
      'payment:write',
      'refund:write',
    ],
  },
];
