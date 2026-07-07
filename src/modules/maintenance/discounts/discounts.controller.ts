import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DiscountsService } from './discounts.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { GetDiscountListQueryDto } from './dto/get-discount-list-query.dto';
import { ImportDiscountsDto } from './dto/import-discounts.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';

@UseGuards(JwtAuthGuard)
@ApiTags('Discounts')
@Controller({
  path: 'maintenance/financial-management/discounts',
  version: '1',
})
export class DiscountsController {
  constructor(private readonly discountsService: DiscountsService) {}

  @Get()
  @ApiOkResponse({ description: 'Discount list retrieved.' })
  findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: GetDiscountListQueryDto,
  ) {
    return this.discountsService.findAll(user, query);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Discount retrieved.' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.discountsService.findOne(user, id);
  }

  @Post()
  @ApiCreatedResponse({ description: 'Discount created.' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateDiscountDto) {
    return this.discountsService.create(user, dto);
  }

  @Post('import')
  @ApiCreatedResponse({ description: 'Discounts imported.' })
  importDiscounts(
    @CurrentUser() user: AuthUser,
    @Body() dto: ImportDiscountsDto,
  ) {
    return this.discountsService.importDiscounts(user, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Discount updated.' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateDiscountDto,
  ) {
    return this.discountsService.update(user, id, dto);
  }
}
