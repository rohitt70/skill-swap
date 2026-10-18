import { IsString, IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { LearningFormat } from '@prisma/client';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  institution?: string;

  @IsString()
  @IsOptional()
  major?: string;

  @IsNumber()
  @IsOptional()
  graduationYear?: number;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @IsEnum(LearningFormat)
  @IsOptional()
  preferredFormat?: LearningFormat;

  @IsString()
  @IsOptional()
  availability?: string;

  @IsString()
  @IsOptional()
  timeZone?: string;
}

export class SearchUsersDto {
  @IsString()
  @IsOptional()
  query?: string;

  @IsString()
  @IsOptional()
  skill?: string;

  @IsString()
  @IsOptional()
  institution?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(50)
  limit?: number;
}
