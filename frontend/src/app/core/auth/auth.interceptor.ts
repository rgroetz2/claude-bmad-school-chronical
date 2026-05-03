import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Functional HTTP interceptor that:
 *  1. Attaches the in-memory Bearer token to every outgoing request.
 *  2. On 401, attempts a silent token refresh once, then retries the request.
 *  3. On second 401 (refresh also failed), clears the session.
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  const authService = inject(AuthService);

  // Don't attach token to auth endpoints (login / refresh / logout)
  if (isAuthEndpoint(req.url)) {
    return next(req);
  }

  const authorisedReq = attachToken(req, authService.getAccessToken());

  return next(authorisedReq).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        // Try to silently refresh
        return authService.refresh().pipe(
          switchMap((res) => {
            const retried = attachToken(req, res.accessToken);
            return next(retried);
          }),
          catchError((refreshError: unknown) => {
            // Refresh also failed → session is dead
            authService.logout();
            return throwError(() => refreshError);
          }),
        );
      }
      return throwError(() => error);
    }),
  );
};

function attachToken(
  req: HttpRequest<unknown>,
  token: string | null,
): HttpRequest<unknown> {
  if (!token) return req;
  return req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
    withCredentials: true,
  });
}

function isAuthEndpoint(url: string): boolean {
  return url.includes('/auth/login') || url.includes('/auth/refresh');
}
