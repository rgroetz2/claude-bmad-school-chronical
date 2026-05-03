export type UserRole = 'teacher' | 'coordinator' | 'admin';

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
  forcePasswordChange: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  expiresIn: number;
  user: AuthUser;
}

export interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
}
