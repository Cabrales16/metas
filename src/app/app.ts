import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly secciones = [
    { ruta: '/inicio', etiqueta: 'Inicio', icono: 'home' },
    { ruta: '/movimientos', etiqueta: 'Movimientos', icono: 'receipt_long' },
    { ruta: '/presupuesto', etiqueta: 'Presupuesto', icono: 'pie_chart' },
    { ruta: '/metas', etiqueta: 'Metas', icono: 'flag' },
    { ruta: '/mas', etiqueta: 'Más', icono: 'more_horiz' },
  ];
}
