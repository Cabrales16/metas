import { Routes } from '@angular/router';

import { Placeholder } from './pages/placeholder';

// Rutas de relleno del Módulo 0; cada módulo las reemplazará por su página real.
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  { path: 'inicio', component: Placeholder, data: { titulo: 'Inicio', modulo: 'Dashboard' } },
  { path: 'movimientos', component: Placeholder, data: { titulo: 'Movimientos', modulo: 'Transacciones' } },
  { path: 'presupuesto', component: Placeholder, data: { titulo: 'Presupuesto', modulo: 'Presupuesto 50/20/20/10' } },
  { path: 'metas', component: Placeholder, data: { titulo: 'Metas', modulo: 'Metas de ahorro' } },
  { path: 'mas', component: Placeholder, data: { titulo: 'Más', modulo: 'CDTs, préstamos e importador' } },
  { path: '**', redirectTo: 'inicio' },
];
