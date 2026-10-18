import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Must provide a valid email address' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(64)
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Display name is required' })
  @MaxLength(50)
  displayName: string;

  @IsString()
  @IsOptional()
  institution?: string;

  @IsString()
  @IsOptional()
  major?: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'Must provide a valid email address' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class ResetPasswordRequestDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordConfirmDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}
