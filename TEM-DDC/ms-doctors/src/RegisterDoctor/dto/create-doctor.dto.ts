import { IsString, IsEmail, MinLength, IsInt, IsNotEmpty, Matches } from 'class-validator';
import { Match } from '../../common/decorators/match.decorator';

export class CreateDoctorDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*\W).+$/, {
    message: 'Password must include uppercase, lowercase, number and special character',
  })
  password: string;

  @IsString()
  @MinLength(8)
  @Match('password', { message: 'Passwords do not match' })
  confirmPassword: string;

  @IsString()
  @IsNotEmpty()
  specialty: string;

  @IsInt()
  experience: number;

  @IsString()
  @IsNotEmpty()
  practicePlace: string;

  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  clinicAddress: string;
}
