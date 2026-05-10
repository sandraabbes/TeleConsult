import { IsString, IsOptional } from 'class-validator';

export class UpdateDisponibiliteDto {
  @IsString()
  @IsOptional()
  day?: string;

  @IsString()
  @IsOptional()
  date?: string;

    readonly slots?: { start: string; end: string }[];
  }
  