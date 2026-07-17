import { PartialType } from '@nestjs/swagger';
import { CreateResponsibilityCenterDto } from './create-responsibility-center.dto';

export class UpdateResponsibilityCenterDto extends PartialType(CreateResponsibilityCenterDto) {}
