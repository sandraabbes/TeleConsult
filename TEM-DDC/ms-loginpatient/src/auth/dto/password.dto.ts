// src/auth/dto/password.dto.ts
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RequestResetDto {
  @IsEmail()
  email: string;
}

export class VerifyResetCodeDto {
  @IsEmail()
  email: string;

  @IsString()
  resetCode: string;
}

export class ResetPasswordDto {
  @IsEmail()
  email: string;

  @IsString()
  resetCode: string;

  @IsString()
  @MinLength(8)
  newPassword: string;

  @IsString()
  @MinLength(8)
  confirmPassword: string;
}
