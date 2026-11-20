import { Injectable, signal } from '@angular/core';

/** Estado de la conexión: v1 requiere red para guardar, así que los formularios se bloquean sin ella. */
@Injectable({ providedIn: 'root' })
export class NetService {
  readonly online = signal(navigator.onLine);

  constructor() {
    window.addEventListener('online', () => this.online.set(true));
    window.addEventListener('offline', () => this.online.set(false));
  }
}
