import { ApiProperty } from "@nestjs/swagger";

export class ResponseMetaDto {
    @ApiProperty({ example: '2023-01-01T00:00:00.000Z', description: 'The timestamp when the response was generated' })
    timestamp: string;

    @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'The unique identifier for the request' })
    requestId?: string;
}