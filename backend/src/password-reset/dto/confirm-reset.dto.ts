import { IsString, MinLength, MaxLength } from 'class-validator';

export class ConfirmResetDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword: string;
}
