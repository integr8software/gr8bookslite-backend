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
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  FormSignatoryBootstrapResponseDto,
  FormSignatoryOptionsResponseDto,
  FormSignatorySetupContainerResponseDto,
  FormSignatorySetupsResponseDto,
  SaveFormSignatoryResponseDto,
} from './dto/form-signatory-response.dto';
import { SaveFormSignatoryDto } from './dto/save-form-signatory.dto';
import { FormSignatoriesService } from './form-signatories.service';

@UseGuards(JwtAuthGuard)
@ApiTags('Form Signatories')
@Controller({
  path: 'maintenance/form-signatories',
  version: '1',
})
export class FormSignatoriesController {
  constructor(
    private readonly formSignatoriesService: FormSignatoriesService,
  ) {}

  @Get()
  @ApiOkResponse({ type: FormSignatorySetupsResponseDto })
  findAll(@CurrentUser() user: AuthUser) {
    return this.formSignatoriesService.findAll(user);
  }

  @Get('options')
  @ApiOkResponse({ type: FormSignatoryOptionsResponseDto })
  findOptions(@CurrentUser() user: AuthUser) {
    return this.formSignatoriesService.findOptions(user);
  }

  @Get('bootstrap')
  @ApiOkResponse({ type: FormSignatoryBootstrapResponseDto })
  findBootstrap(@CurrentUser() user: AuthUser) {
    return this.formSignatoriesService.findBootstrap(user);
  }

  @Get('resolve')
  @ApiOkResponse({ type: FormSignatorySetupContainerResponseDto })
  resolve(
    @CurrentUser() user: AuthUser,
    @Query('unitId', ParseIntPipe) unitId: number,
    @Query('moduleCodes') moduleCodes: string,
  ) {
    return this.formSignatoriesService.resolve(user, unitId, moduleCodes);
  }

  @Get(':setupId')
  @ApiOkResponse({ type: FormSignatorySetupContainerResponseDto })
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('setupId', ParseIntPipe) setupId: number,
  ) {
    return this.formSignatoriesService.findOne(user, setupId);
  }

  @Post()
  @ApiCreatedResponse({ type: SaveFormSignatoryResponseDto })
  save(@CurrentUser() user: AuthUser, @Body() dto: SaveFormSignatoryDto) {
    return this.formSignatoriesService.save(user, dto);
  }

  @Patch(':setupId')
  @ApiOkResponse({ type: SaveFormSignatoryResponseDto })
  update(
    @CurrentUser() user: AuthUser,
    @Param('setupId', ParseIntPipe) setupId: number,
    @Body() dto: SaveFormSignatoryDto,
  ) {
    return this.formSignatoriesService.update(user, setupId, dto);
  }
}
