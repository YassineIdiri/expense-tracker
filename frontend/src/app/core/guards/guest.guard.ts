import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenStore } from '../services/token-store.service';

export const guestGuard: CanActivateFn = () => {
  const tokenStore = inject(TokenStore);
  const router = inject(Router);

  if (tokenStore.exists()) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};
