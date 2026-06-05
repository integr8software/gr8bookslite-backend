import { Type } from 'class-transformer';
import { ArrayMinSize, IsInt, Min } from 'class-validator';

export class WorkspaceUserAssignmentDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  companyId!: number;

  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @ArrayMinSize(1, {
    message: 'Select at least one head office, branch, or satellite.',
  })
  unitIds!: number[];
}
