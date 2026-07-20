import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WarehouseStorageService } from './warehouse-storage.service';

@UseGuards(JwtAuthGuard)
@ApiTags('Warehouse Storage')
@Controller({
  path: 'maintenance/warehouse-storage',
  version: '1',
})
export class WarehouseStorageController {
  constructor(private readonly warehouseStorageService: WarehouseStorageService) {}

  @Get()
  @ApiOkResponse({ description: 'Warehouse storage list retrieved.' })
  findAll(@CurrentUser() user: AuthUser) {
    return this.warehouseStorageService.findAll(user);
  }
}
