import { IsString, IsEnum, IsNotEmpty, MaxLength } from 'class-validator';
import { UserType } from '../entities/user-type.enum';

export class GetUnreadCountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  userId: string;

  @IsEnum(UserType)
  @IsNotEmpty()
  userType: UserType;
}
