import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SaveFormSignatoryDto } from './dto/save-form-signatory.dto';
import { FormSignatoriesService } from './form-signatories.service';

@UseGuards(JwtAuthGuard)
@Controller({
  path: 'maintenance/form-signatories',
  version: '1',
})
export class FormSignatoriesController {
  constructor(
    private readonly formSignatoriesService: FormSignatoriesService,
  ) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.formSignatoriesService.findAll(user);
  }

  @Get('options')
  findOptions(@CurrentUser() user: AuthUser) {
    return this.formSignatoriesService.findOptions(user);
  }

  @Get('resolve')
  resolve(
    @CurrentUser() user: AuthUser,
    @Query('unitId', ParseIntPipe) unitId: number,
    @Query('moduleCodes') moduleCodes: string,
  ) {
    return this.formSignatoriesService.resolve(user, unitId, moduleCodes);
  }

  @Get(':setupId')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('setupId', ParseIntPipe) setupId: number,
  ) {
    return this.formSignatoriesService.findOne(user, setupId);
  }

  @Post()
  save(@CurrentUser() user: AuthUser, @Body() dto: SaveFormSignatoryDto) {
    return this.formSignatoriesService.save(user, dto);
  }

  @Patch(':setupId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('setupId', ParseIntPipe) setupId: number,
    @Body() dto: SaveFormSignatoryDto,
  ) {
    return this.formSignatoriesService.update(user, setupId, dto);
  }
}
