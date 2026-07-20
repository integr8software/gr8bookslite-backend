import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDefined, IsIn, IsInt, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';

export class UserSidebarTreeItemDto {
  @IsString() @MaxLength(120) key!: string;
  @IsString() @MaxLength(160) label!: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsIn(['SECTION', 'CONTAINER', 'LINK']) itemType!: 'SECTION' | 'CONTAINER' | 'LINK';
  @IsOptional() @IsInt() @Min(1) moduleId?: number;
  @IsOptional() @IsString() iconName?: string;
  @IsOptional() @IsBoolean() isHidden?: boolean;
  @IsOptional() @IsBoolean() isPinned?: boolean;
  @IsOptional() @IsBoolean() isCollapsed?: boolean;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserSidebarTreeItemDto)
  children!: UserSidebarTreeItemDto[];
}

export class SaveUserSidebarDto {
  @IsDefined()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  version!: number;
  @IsOptional() @IsIn(['CURRENT_BRANCH', 'ALL_BRANCHES']) applyScope?: 'CURRENT_BRANCH' | 'ALL_BRANCHES';
  @IsDefined()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserSidebarTreeItemDto)
  items!: UserSidebarTreeItemDto[];
}
