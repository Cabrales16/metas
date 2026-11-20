import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

/** Solo deja pasar con sesión iniciada; si no, manda al login. */
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.whenReady;
  return auth.isAuthenticated() ? true : router.createUrlTree(['/login']);
};

/** Para el login: si ya hay sesión, manda al inicio. */
export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.whenReady;
  return auth.isAuthenticated() ? router.createUrlTree(['/inicio']) : true;
};
