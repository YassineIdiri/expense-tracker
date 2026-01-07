// token-store.service.ts
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class TokenStore {
  private readonly KEY = 'access_token';
  private readonly platformId = inject(PLATFORM_ID);

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  get(): string | null {
    if (!this.isBrowser) return null;
    return sessionStorage.getItem(this.KEY);
  }

  set(token: string): void {
    if (!this.isBrowser) return;
    sessionStorage.setItem(this.KEY, token);
  }

  clear(): void {
    if (!this.isBrowser) return;
    sessionStorage.removeItem(this.KEY);
  }

  exists(): boolean {
    return !!this.get();
  }
}
