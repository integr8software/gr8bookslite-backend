import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SaveTablePreferenceDto } from './dto/save-table-preference.dto';
import { TablePreferencesService } from './table-preferences.service';

@UseGuards(JwtAuthGuard)
@ApiTags('Table Preferences')
@Controller({ path: 'table-preferences', version: '1' })
export class TablePreferencesController {
  constructor(private readonly tablePreferencesService: TablePreferencesService) {}

  @Get(':moduleKey')
  @ApiOkResponse({ description: 'Table preference retrieved.' })
  findOne(@CurrentUser() user: AuthUser, @Param('moduleKey') moduleKey: string) {
    return this.tablePreferencesService.findOne(user, moduleKey);
  }

  @Put(':moduleKey')
  @ApiOkResponse({ description: 'Table preference saved.' })
  save(@CurrentUser() user: AuthUser, @Param('moduleKey') moduleKey: string, @Body() dto: SaveTablePreferenceDto) {
    return this.tablePreferencesService.save(user, moduleKey, dto);
  }
}
