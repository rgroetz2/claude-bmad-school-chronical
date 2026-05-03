import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { UserRole } from '../models/user.model';

/**
 * Guard that blocks navigation to protected routes when the user is not
 * authenticated. Redirects to /login.
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};

/**
 * Guard factory that checks whether the current user has at least the
 * required role. Uses the same hierarchy as the backend RolesGuard:
 *   admin(3) ≥ coordinator(2) ≥ teacher(1)
 */
export const roleGuard = (requiredRole: UserRole): CanActivateFn =>
  () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const user = authService.currentUser();
    if (!user) return router.createUrlTree(['/login']);

    const hierarchy: Record<UserRole, number> = {
      teacher: 1,
      coordinator: 2,
      admin: 3,
    };

    const userLevel = hierarchy[user.role] ?? 0;
    const requiredLevel = hierarchy[requiredRole] ?? 999;

    return userLevel >= requiredLevel ? true : router.createUrlTree(['/dashboard']);
  };
