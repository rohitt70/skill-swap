import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { SkillType, ProficiencyLevel } from '@prisma/client';

export class CreateSkillDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class AddUserSkillDto {
  @IsString()
  @IsNotEmpty()
  skillName: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsEnum(SkillType)
  type: SkillType; // TEACH or LEARN

  @IsEnum(ProficiencyLevel)
  @IsOptional()
  proficiencyLevel?: ProficiencyLevel;

  @IsString()
  @IsOptional()
  notes?: string;
}
