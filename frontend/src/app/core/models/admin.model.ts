import { UserRole } from './user.model';

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  forcePasswordChange: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  temporaryPassword: string;
  role: UserRole;
}

export interface UpdateUserRequest {
  role?: UserRole;
  isActive?: boolean;
}
