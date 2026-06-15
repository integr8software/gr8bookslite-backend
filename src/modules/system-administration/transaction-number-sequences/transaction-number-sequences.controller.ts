import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  SaveTransactionNumberSequenceResponseDto,
  TransactionNumberSequenceBootstrapResponseDto,
} from './dto/transaction-number-sequence-response.dto';
import { UpdateTransactionNumberSequenceDto } from './dto/update-transaction-number-sequence.dto';
import { TransactionNumberSequencesService } from './transaction-number-sequences.service';

@UseGuards(JwtAuthGuard)
@ApiTags('Transaction Number Sequences')
@Controller({
  path: 'system-administration/transaction-number-sequences',
  version: '1',
})
export class TransactionNumberSequencesController {
  constructor(
    private readonly transactionNumberSequencesService: TransactionNumberSequencesService,
  ) {}

  @Get('bootstrap')
  @Throttle({
    default: {
      limit: 120,
      ttl: 60_000,
    },
  })
  @ApiOkResponse({ type: TransactionNumberSequenceBootstrapResponseDto })
  findBootstrap(@CurrentUser() user: AuthUser) {
    return this.transactionNumberSequencesService.findBootstrap(user);
  }

  @Patch(':sequenceId')
  @Throttle({
    default: {
      limit: 30,
      ttl: 60_000,
    },
  })
  @ApiOkResponse({ type: SaveTransactionNumberSequenceResponseDto })
  update(
    @CurrentUser() user: AuthUser,
    @Param('sequenceId', ParseIntPipe) permissionId: number,
    @Body() dto: UpdateTransactionNumberSequenceDto,
  ) {
    return this.transactionNumberSequencesService.update(
      user,
      permissionId,
      dto,
    );
  }
}
