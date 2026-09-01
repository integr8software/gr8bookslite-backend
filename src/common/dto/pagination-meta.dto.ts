import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({ example: 1, minimum: 1 })
  page: number;

  @ApiProperty({ example: 10, minimum: 1 })
  limit: number;

  @ApiProperty({ example: 1, minimum: 0 })
  total: number;

  @ApiProperty({ example: 1, minimum: 0 })
  totalPages: number;
}

export class NavigablePaginationMetaDto extends PaginationMetaDto {
  @ApiProperty({ example: false })
  hasNextPage: boolean;

  @ApiProperty({ example: false })
  hasPreviousPage: boolean;
}
