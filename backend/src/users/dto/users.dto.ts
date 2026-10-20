import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsUrl,
  IsBoolean,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { LearningFormat, ThemePreference } from '@prisma/client';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  @MaxLength(60)
  displayName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  headline?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  institution?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  major?: string;

  @IsNumber()
  @IsOptional()
  @Min(1980)
  @Max(2100)
  graduationYear?: number;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  location?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  bio?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @IsString()
  @IsOptional()
  portfolioUrl?: string;

  @IsEnum(LearningFormat)
  @IsOptional()
  preferredFormat?: LearningFormat;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  availability?: string;

  @IsString()
  @IsOptional()
  timeZone?: string;
}

export class SocialLinkDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  platform: string; // LINKEDIN, GITHUB, PORTFOLIO, TWITTER, WEBSITE, OTHER

  @IsString()
  @IsNotEmpty()
  @Matches(/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i, {
    message: 'Must provide a valid URL with http or https protocol',
  })
  url: string;
}

export class UpdateSettingsDto {
  @IsEnum(ThemePreference)
  @IsOptional()
  theme?: ThemePreference;

  @IsBoolean()
  @IsOptional()
  isProfilePublic?: boolean;

  @IsBoolean()
  @IsOptional()
  showSocialLinks?: boolean;

  @IsBoolean()
  @IsOptional()
  showEmail?: boolean;

  @IsBoolean()
  @IsOptional()
  showAvailability?: boolean;

  @IsBoolean()
  @IsOptional()
  showInstitution?: boolean;

  @IsBoolean()
  @IsOptional()
  emailNotifications?: boolean;

  @IsBoolean()
  @IsOptional()
  friendRequestNotifications?: boolean;

  @IsBoolean()
  @IsOptional()
  sessionNotifications?: boolean;

  @IsBoolean()
  @IsOptional()
  chatNotifications?: boolean;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Current password is required' })
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  @MaxLength(64)
  newPassword: string;
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
  skillType?: 'TEACH' | 'LEARN';

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
