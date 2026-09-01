import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DiscountType } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DiscountMaintenanceService } from './discount-maintenance.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import {
  DiscountContainerResponseDto,
  DiscountListResponseDto,
  DiscountOptionsResponseDto,
  ImportDiscountsResponseDto,
  SaveDiscountResponseDto,
} from './dto/discount-response.dto';
import { DiscountLookupQueryDto } from './dto/discount-lookup-query.dto';
import { GetDiscountListQueryDto } from './dto/get-discount-list-query.dto';
import { ImportDiscountsDto } from './dto/import-discounts.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { DiscountLookupService } from './lookups/discount-lookup.service';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Discount Maintenance')
@Controller({
  path: 'maintenance/discount-maintenance',
  version: '1',
})
export class DiscountMaintenanceController {
  constructor(
    private readonly discountMaintenanceService: DiscountMaintenanceService,
    private readonly discountLookupService: DiscountLookupService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated list of discount records' })
  @ApiOkResponse({ type: DiscountListResponseDto })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetDiscountListQueryDto) {
    return this.discountMaintenanceService.findAll(user, query);
  }

  @Get('options')
  @ApiOperation({ summary: 'Get discount options' })
  @ApiOkResponse({ type: DiscountOptionsResponseDto })
  findOptions(@CurrentUser() user: AuthUser, @Query() query: DiscountLookupQueryDto) {
    return this.discountLookupService.findOptionsForCompanyUser(user, query);
  }

  @Get('options/:type')
  @ApiOperation({ summary: 'Get discount options by type' })
  @ApiOkResponse({ type: DiscountOptionsResponseDto })
  findOptionsByType(@CurrentUser() user: AuthUser, @Param('type') type: string, @Query() query: DiscountLookupQueryDto) {
    const discountType = type.trim().toUpperCase().replace(/-/g, '_') as DiscountType;

    if (!Object.values(DiscountType).includes(discountType)) {
      throw new BadRequestException('Discount option type must be sales or purchase.');
    }

    return this.discountLookupService.findOptionsForCompanyUser(user, {
      ...query,
      type: discountType,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get discount details by ID' })
  @ApiOkResponse({ type: DiscountContainerResponseDto })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.discountMaintenanceService.findOne(user, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a discount record' })
  @ApiCreatedResponse({ type: SaveDiscountResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateDiscountDto) {
    return this.discountMaintenanceService.create(user, dto);
  }

  @Post('import')
  @ApiOperation({ summary: 'Import discount records' })
  @ApiCreatedResponse({ type: ImportDiscountsResponseDto })
  importDiscounts(@CurrentUser() user: AuthUser, @Body() dto: ImportDiscountsDto) {
    return this.discountMaintenanceService.importDiscounts(user, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a discount record' })
  @ApiOkResponse({ type: SaveDiscountResponseDto })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateDiscountDto) {
    return this.discountMaintenanceService.update(user, id, dto);
  }
}
