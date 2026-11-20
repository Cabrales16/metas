import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/auth.guard';
import { Shell } from './layout/shell';
import { Mas } from './pages/mas';
import { Placeholder } from './pages/placeholder';

// Rutas de relleno del Módulo 0; cada módulo las reemplazará por su página real.
export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login').then((m) => m.Login),
  },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      { path: 'inicio', component: Placeholder, data: { titulo: 'Inicio', modulo: 'Dashboard' } },
      { path: 'movimientos', component: Placeholder, data: { titulo: 'Movimientos', modulo: 'Transacciones' } },
      { path: 'presupuesto', component: Placeholder, data: { titulo: 'Presupuesto', modulo: 'Presupuesto 50/20/20/10' } },
      { path: 'metas', component: Placeholder, data: { titulo: 'Metas', modulo: 'Metas de ahorro' } },
      { path: 'mas', component: Mas },
      {
        path: 'mas/cuentas',
        loadComponent: () => import('./pages/cuentas/cuentas').then((m) => m.Cuentas),
      },
      {
        path: 'mas/categorias',
        loadComponent: () => import('./pages/categorias/categorias').then((m) => m.Categorias),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
