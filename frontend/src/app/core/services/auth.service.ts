// auth.service.ts
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TokenStore } from './token-store.service';
import {catchError, Observable, of} from 'rxjs';
import {AuthApiService} from './auth-api.service';
import {tap} from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);
  private readonly tokenStore = inject(TokenStore);
  private readonly authApi = inject(AuthApiService);

  isLoggedIn(): boolean {
    return this.tokenStore.exists();
  }

  setAccessToken(token: string): void {
    this.tokenStore.set(token);
  }

  clearSession(): void {
    this.tokenStore.clear();
  }

  /** Logout complet: revoke refresh cookie côté backend + clear access token */
  logout(): Observable<void> {
    return this.authApi.logout().pipe(
      // même si le backend répond 401/500, on veut quand même clear côté front
      catchError(() => of(void 0)),
      tap(() => this.tokenStore.clear())
    );
  }

  logoutAndRedirect(reason: 'expired' | 'unauthorized' = 'expired'): void {
    this.clearSession();
    this.router.navigate(['/login'], { queryParams: { reason } });
  }
}
