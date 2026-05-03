import { IsEmail, MaxLength } from 'class-validator';

export class RequestResetDto {
  @IsEmail()
  @MaxLength(255)
  email: string;
}
