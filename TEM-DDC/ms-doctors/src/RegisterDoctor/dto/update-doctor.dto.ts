import { IsString, IsEmail, MinLength, IsInt, IsOptional } from 'class-validator';

export class UpdateDoctorDto {
  @IsString()
  @IsOptional()
  fullName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @MinLength(8)
  @IsOptional()
  password?: string;

  @IsString()
  @MinLength(8)
  @IsOptional()
  confirmPassword?: string;

  @IsString()
  @IsOptional()
  specialty?: string;

  @IsInt()
  @IsOptional()
  experience?: number;

  @IsString()
  @IsOptional()
  practicePlace?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  clinicAddress?: string;

  // 🔹 Champs uploadés
  @IsString()
  @IsOptional()
  licenceImg?: string;

  @IsString()
  @IsOptional()
  identityImg?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsOptional()
  consultationPrice?: number;

  @IsString()
  @IsOptional()
  profilePhotoUrl?: string;
}
