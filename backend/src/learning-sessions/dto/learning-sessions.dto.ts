import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsNumber,
  IsEnum,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { LearningFormat } from '@prisma/client';

export class CreateLearningSessionDto {
  @IsString()
  @IsNotEmpty()
  teacherId: string;

  @IsString()
  @IsNotEmpty()
  skillName: string;

  @IsString()
  @IsNotEmpty()
  topic: string;

  @IsDateString()
  scheduledAt: string;

  @IsNumber()
  @Min(15)
  @Max(240)
  durationMins: number;

  @IsEnum(LearningFormat)
  @IsOptional()
  format?: LearningFormat;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateReviewDto {
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @IsOptional()
  feedback?: string;
}
