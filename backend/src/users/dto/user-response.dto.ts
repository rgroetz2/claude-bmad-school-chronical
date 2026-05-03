import { UserRole } from '../../entities/user.entity';
import { User } from '../../entities/user.entity';

export class UserResponseDto {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  forcePasswordChange: boolean;
  createdAt: Date;
  updatedAt: Date;

  static from(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.username = user.username;
    dto.email = user.email;
    dto.role = user.role;
    dto.isActive = user.isActive;
    dto.forcePasswordChange = user.forcePasswordChange;
    dto.createdAt = user.createdAt;
    dto.updatedAt = user.updatedAt;
    return dto;
  }
}
