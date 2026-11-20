import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/auth.guard';
import { Shell } from './layout/shell';

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
      { path: 'inicio', loadComponent: () => import('./pages/inicio/inicio').then((m) => m.Inicio) },
      { path: 'movimientos', loadComponent: () => import('./pages/movimientos/movimientos').then((m) => m.Movimientos) },
      { path: 'presupuesto', loadComponent: () => import('./pages/presupuesto/presupuesto').then((m) => m.Presupuesto) },
      { path: 'metas', loadComponent: () => import('./pages/metas/metas').then((m) => m.Metas) },
      { path: 'mas', loadComponent: () => import('./pages/mas').then((m) => m.Mas) },
      { path: 'mas/cdts', loadComponent: () => import('./pages/cdts/cdts').then((m) => m.Cdts) },
      { path: 'mas/prestamos', loadComponent: () => import('./pages/prestamos/prestamos').then((m) => m.Prestamos) },
      { path: 'mas/cuentas', loadComponent: () => import('./pages/cuentas/cuentas').then((m) => m.Cuentas) },
      { path: 'mas/categorias', loadComponent: () => import('./pages/categorias/categorias').then((m) => m.Categorias) },
      { path: 'mas/importar', loadComponent: () => import('./pages/importar/importar').then((m) => m.Importar) },
    ],
  },
  {
    path: 'propuesta',
    canActivate: [authGuard],
    loadComponent: () => import('./propuesta/propuesta').then((m) => m.Propuesta),
  },
  { path: '**', redirectTo: '' },
];
