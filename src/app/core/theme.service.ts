import { Injectable, signal } from '@angular/core';

export type Tema = 'claro' | 'oscuro';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly tema = signal<Tema>(document.documentElement.dataset['tema'] === 'oscuro' ? 'oscuro' : 'claro');

  alternar(): void {
    const siguiente: Tema = this.tema() === 'claro' ? 'oscuro' : 'claro';
    this.tema.set(siguiente);
    document.documentElement.dataset['tema'] = siguiente;
    try {
      localStorage.setItem('metas-tema', siguiente);
    } catch {
      /* sin almacenamiento: el tema vale solo para esta sesión */
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', siguiente === 'oscuro' ? '#0f0e0d' : '#1e1c19');
  }
}
