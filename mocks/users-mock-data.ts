import { IUser } from 'src/users/v1/types/user.interface';
import raw from './users-raw-mock-data.json';

export interface IUserRawMockData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  createdAt: string;
  updatedAt: string;
}

const usersRawMockData: IUserRawMockData[] = raw;
export const usersMockData: IUser[] = usersRawMockData
  .map((rawUser) => {
    return {
      ...rawUser,
      createdAt: new Date(rawUser.createdAt),
      updatedAt: new Date(rawUser.updatedAt),
    };
  })
    .sort((a: IUser, b: IUser) => {
        const diff = a.createdAt.getTime() - b.createdAt.getTime();
        if (diff !== 0) {
            return diff;
        }
        return a.id.localeCompare(b.id);
  });
