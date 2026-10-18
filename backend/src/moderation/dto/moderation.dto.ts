import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ReportStatus } from '@prisma/client';

export class BlockUserDto {
  @IsString()
  @IsNotEmpty()
  targetUserId: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class ReportUserDto {
  @IsString()
  @IsNotEmpty()
  reportedUserId: string;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsOptional()
  details?: string;
}

export class UpdateReportStatusDto {
  @IsEnum(ReportStatus)
  status: ReportStatus;

  @IsString()
  @IsOptional()
  adminNotes?: string;
}
