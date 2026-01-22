import { ApiProperty } from "@nestjs/swagger";

export class UserResponseDto {
    @ApiProperty({ example: '1', description: 'The unique identifier of the user' })
    id: string;

    @ApiProperty({ example: 'John', description: 'The first name of the user' })
    firstName: string;

    @ApiProperty({ example: 'Doe', description: 'The last name of the user' })
    lastName: string;

    @ApiProperty({ example: 'john.doe@example.com' , description: 'The email address of the user' })
    email: string;

    @ApiProperty({ example: '2023-01-01T00:00:00.000Z', description: 'The date and time when the user was created' })
    createdAt: Date;

    @ApiProperty({ example: '2023-01-02T00:00:00.000Z', description: 'The date and time when the user was last updated' })
    updatedAt: Date;
}

export class UsersListResponseDto {
    @ApiProperty({ description: 'List of users', type: [UserResponseDto] })
    users: UserResponseDto[];
}