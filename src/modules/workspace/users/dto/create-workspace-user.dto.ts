import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { WorkspaceUserAssignmentDto } from './workspace-user-assignment.dto';

const ContactNumberPattern = /^\+63 [\d ]{7,14}$/;

export class CreateWorkspaceUserDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @Matches(ContactNumberPattern, {
    message: 'Enter a valid contact number in the format.',
  })
  contactNumber?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Add at least one company.' })
  @ValidateNested({ each: true })
  @Type(() => WorkspaceUserAssignmentDto)
  companyAssignments!: WorkspaceUserAssignmentDto[];
}
