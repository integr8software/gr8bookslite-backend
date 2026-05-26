import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateCompanyUnitDto } from './dto/create-company-unit.dto';
import { CreateWorkspaceCompanyDto } from './dto/create-workspace-company.dto';
import { UpdateCompanyUnitDto } from './dto/update-company-unit.dto';
import { UpdateWorkspaceCompanyDto } from './dto/update-workspace-company.dto';
import type { UploadedCompanyLogoFile } from './types/uploaded-company-logo-file.type';
import { WorkspaceCompaniesService } from './workspace-companies.service';

@UseGuards(JwtAuthGuard)
@Controller({
  path: 'workspace/companies',
  version: '1',
})
export class WorkspaceCompaniesController {
  constructor(
    private readonly workspaceCompaniesService: WorkspaceCompaniesService,
  ) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.workspaceCompaniesService.findAll(user);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateWorkspaceCompanyDto,
  ) {
    return this.workspaceCompaniesService.create(user, dto);
  }

  @Get(':companyId')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('companyId', ParseIntPipe) companyId: number,
  ) {
    return this.workspaceCompaniesService.findOne(user, companyId);
  }

  @Patch(':companyId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('companyId', ParseIntPipe) companyId: number,
    @Body() dto: UpdateWorkspaceCompanyDto,
  ) {
    return this.workspaceCompaniesService.update(user, companyId, dto);
  }

  @Post(':companyId/logo')
  @UseInterceptors(FileInterceptor('logo'))
  uploadLogo(
    @CurrentUser() user: AuthUser,
    @Param('companyId', ParseIntPipe) companyId: number,
    @UploadedFile() file: UploadedCompanyLogoFile | undefined,
  ) {
    return this.workspaceCompaniesService.uploadLogo(user, companyId, file);
  }

  @Delete(':companyId')
  deactivate(
    @CurrentUser() user: AuthUser,
    @Param('companyId', ParseIntPipe) companyId: number,
  ) {
    return this.workspaceCompaniesService.deactivate(user, companyId);
  }

  @Get(':companyId/units')
  findUnits(
    @CurrentUser() user: AuthUser,
    @Param('companyId', ParseIntPipe) companyId: number,
  ) {
    return this.workspaceCompaniesService.findUnits(user, companyId);
  }

  @Post(':companyId/units')
  createUnit(
    @CurrentUser() user: AuthUser,
    @Param('companyId', ParseIntPipe) companyId: number,
    @Body() dto: CreateCompanyUnitDto,
  ) {
    return this.workspaceCompaniesService.createUnit(user, companyId, dto);
  }

  @Patch('units/:unitId')
  updateUnit(
    @CurrentUser() user: AuthUser,
    @Param('unitId', ParseIntPipe) unitId: number,
    @Body() dto: UpdateCompanyUnitDto,
  ) {
    return this.workspaceCompaniesService.updateUnit(user, unitId, dto);
  }

  @Delete('units/:unitId')
  deactivateUnit(
    @CurrentUser() user: AuthUser,
    @Param('unitId', ParseIntPipe) unitId: number,
  ) {
    return this.workspaceCompaniesService.deactivateUnit(user, unitId);
  }
}
