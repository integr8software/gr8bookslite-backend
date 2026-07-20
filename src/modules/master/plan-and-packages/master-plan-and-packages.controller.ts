import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AppRole } from '../../../common/enums/app-role.enum';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateMasterPlanAndPackageDto } from './dto/create-master-plan-and-package.dto';
import { MasterPlanAndPackagesService } from './master-plan-and-packages.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.SUPER_ADMIN)
@Controller({
  path: 'master/plan-and-packages',
  version: '1',
})
export class MasterPlanAndPackagesController {
  constructor(private readonly masterPlanAndPackagesService: MasterPlanAndPackagesService) {}

  @Get()
  listPlans() {
    return this.masterPlanAndPackagesService.listPlans();
  }

  @Post()
  createPlan(@Body() dto: CreateMasterPlanAndPackageDto) {
    return this.masterPlanAndPackagesService.createPlan(dto);
  }
}
