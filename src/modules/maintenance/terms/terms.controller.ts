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
import { CreateTermDto } from './dto/create-term.dto';
import { GetTermListQueryDto } from './dto/get-term-list-query.dto';
import { ImportTermsDto } from './dto/import-terms.dto';
import { UpdateTermDto } from './dto/update-term.dto';
import { TermsService } from './terms.service';

@UseGuards(JwtAuthGuard)
@ApiTags('Terms')
@Controller({
  path: 'maintenance/financial-management/terms',
  version: '1',
})
export class TermsController {
  constructor(private readonly termsService: TermsService) {}

  @Get()
  @ApiOkResponse({ description: 'Term list retrieved.' })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetTermListQueryDto) {
    return this.termsService.findAll(user, query);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Term retrieved.' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.termsService.findOne(user, id);
  }

  @Post()
  @ApiCreatedResponse({ description: 'Term created.' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTermDto) {
    return this.termsService.create(user, dto);
  }

  @Post('import')
  @ApiCreatedResponse({ description: 'Terms imported.' })
  importTerms(@CurrentUser() user: AuthUser, @Body() dto: ImportTermsDto) {
    return this.termsService.importTerms(user, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Term updated.' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateTermDto,
  ) {
    return this.termsService.update(user, id, dto);
  }
}
