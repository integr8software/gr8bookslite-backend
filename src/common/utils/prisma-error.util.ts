import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export function throwConflictOnPrismaUniqueError(error: unknown, message: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new ConflictException(message);
  }
}
