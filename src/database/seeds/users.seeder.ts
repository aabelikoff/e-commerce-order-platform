import { Seeder } from 'typeorm-extension';
import { DataSource } from 'typeorm';
import { User } from '../entities';

export default class UsersSeed implements Seeder {
  public async run(dataSource: DataSource) {
    const repo = dataSource.getRepository(User);
    console.log('UsersSeed started...');
    for (let user of seedUsers) {
      if (await repo.findOne({ where: { email: user.email } })) continue;
      await repo.insert(user);
    }
  }
}

const seedUsers = [
  {
    firstName: 'Demo',
    lastName: 'User',
    email: 'demouser@gmail.com',
    isActive: true,
  },
  {
    firstName: 'John',
    lastName: 'Doe',
    email: 'johndoe@gmail.com',
    isActive: true,
  },
];
