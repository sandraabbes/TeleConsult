import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  identifier: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ required: false })
  phone?: string;

  @ApiProperty()
  role: string;

  @ApiProperty()
  acceptPrivacyPolicy: boolean;

  @ApiProperty({ required: false, description: 'Format: YYYY-MM-DD' })
  birthdate?: string;

  @ApiProperty({ required: false })
  gender?: string;

  @ApiProperty()
  createdAt: Date;
}