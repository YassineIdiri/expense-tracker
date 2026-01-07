// src/app/core/interceptors/auth.interceptor.ts
import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import {
  BehaviorSubject,
  catchError,
  filter,
  switchMap,
  take,
  throwError,
} from 'rxjs';

import { AuthApiService } from '../services/auth-api.service';
import { TokenStore } from '../services/token-store.service';
import { AuthService } from '../services/auth.service';

let refreshing = false;
const refreshedToken$ = new BehaviorSubject<string | null>(null);

/**
 * True si l'URL cible un endpoint d'auth.
 * Important: on exclut tout /api/auth/** du mécanisme refresh,
 * sinon risque de boucle et de comportement bizarre (login/reset etc).
 */
function isAuthRoute(url: string): boolean {
  return url.includes('/api/auth/');
}

function hasBearer(req: HttpRequest<unknown>): boolean {
  const h = req.headers.get('Authorization');
  return !!h && h.startsWith('Bearer ');
}

function withBearer(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStore = inject(TokenStore);
  const authApi = inject(AuthApiService);
  const auth = inject(AuthService);

  // ✅ 1) On ne touche jamais aux routes /api/auth/** (login/register/refresh/logout/forgot/reset)
  // => l'erreur remonte directement au composant (tu verras ton message d'erreur)
  if (isAuthRoute(req.url)) {
    return next(req);
  }

  // ✅ 2) Inject Bearer si token présent
  const token = tokenStore.get();
  const request = token ? withBearer(req, token) : req;

  return next(request).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse)) {
        return throwError(() => err);
      }

      // ✅ 3) Si pas 401 => on laisse remonter
      if (err.status !== 401) {
        return throwError(() => err);
      }

      // ✅ 4) Si la requête n’avait PAS de Bearer, ce n’est pas un cas "token expiré"
      // Exemple typique: endpoint public appelé sans token, ou bug de route
      // => on laisse l'erreur remonter (SINON tu peux bloquer l'UI avec refresh inutile)
      if (!hasBearer(request)) {
        return throwError(() => err);
      }

      // ✅ 5) Refresh one-at-a-time
      if (!refreshing) {
        refreshing = true;
        refreshedToken$.next(null);

        return authApi.refresh().pipe(
          switchMap((res) => {
            refreshing = false;

            tokenStore.set(res.accessToken);
            refreshedToken$.next(res.accessToken);

            // Retry la requête originale avec le nouveau token
            return next(withBearer(req, res.accessToken));
          }),
          catchError((refreshErr) => {
            refreshing = false;

            // Refresh KO => session expirée => logout global front
            tokenStore.clear();
            auth.logoutAndRedirect('expired');

            return throwError(() => refreshErr);
          })
        );
      }

      // ✅ 6) Si un refresh est déjà en cours, on attend un nouveau token puis on rejoue
      return refreshedToken$.pipe(
        filter((t): t is string => t !== null),
        take(1),
        switchMap((newToken) => next(withBearer(req, newToken)))
      );
    })
  );
};
