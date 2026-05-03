import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AuthUser,
  LoginRequest,
  LoginResponse,
  RefreshResponse,
} from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  // ── In-memory token store (never written to localStorage/sessionStorage) ──
  private _accessToken: string | null = null;
  private _expiresAt: number | null = null; // epoch ms

  // ── Signals for reactive auth state ──────────────────────────────────────
  private readonly _currentUser = signal<AuthUser | null>(null);
  readonly currentUser = this._currentUser.asReadonly();
  readonly isLoggedIn = computed(() => this._currentUser() !== null);
  readonly isAdmin = computed(() => this._currentUser()?.role === 'admin');
  readonly isCoordinator = computed(
    () =>
      this._currentUser()?.role === 'coordinator' ||
      this._currentUser()?.role === 'admin',
  );

  private readonly baseUrl = `${environment.apiUrl}/auth`;

  // ── Public API ────────────────────────────────────────────────────────────

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, credentials, { withCredentials: true }).pipe(
      tap((res) => this.handleTokenResponse(res.accessToken, res.expiresIn, res.user)),
    );
  }

  logout(): void {
    this.http
      .post(`${this.baseUrl}/logout`, {}, { withCredentials: true })
      .pipe(catchError(() => throwError(() => null))) // ignore backend errors on logout
      .subscribe({
        complete: () => this.clearSession(),
        error: () => this.clearSession(),
      });
  }

  /**
   * Refresh the access token using the HttpOnly refresh-token cookie.
   * Called by the HTTP interceptor when a 401 is received.
   */
  refresh(): Observable<RefreshResponse> {
    return this.http
      .post<RefreshResponse>(`${this.baseUrl}/refresh`, {}, { withCredentials: true })
      .pipe(
        tap((res) => {
          this._accessToken = res.accessToken;
          this._expiresAt = Date.now() + res.expiresIn * 1000;
        }),
      );
  }

  getAccessToken(): string | null {
    return this._accessToken;
  }

  isTokenExpired(): boolean {
    if (!this._expiresAt) return true;
    // Treat token as expired 30 s before actual expiry (clock drift buffer)
    return Date.now() >= this._expiresAt - 30_000;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private handleTokenResponse(
    accessToken: string,
    expiresIn: number,
    user: AuthUser,
  ): void {
    this._accessToken = accessToken;
    this._expiresAt = Date.now() + expiresIn * 1000;
    this._currentUser.set(user);
  }

  private clearSession(): void {
    this._accessToken = null;
    this._expiresAt = null;
    this._currentUser.set(null);
    this.router.navigate(['/login']);
  }
}
