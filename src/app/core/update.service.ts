import { Injectable, inject, signal } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';

/** Avisa cuando hay una versión nueva de la app lista y permite aplicarla. */
@Injectable({ providedIn: 'root' })
export class UpdateService {
  private readonly sw = inject(SwUpdate);
  readonly hayNueva = signal(false);

  constructor() {
    if (!this.sw.isEnabled) return;
    this.sw.versionUpdates
      .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'))
      .subscribe(() => this.hayNueva.set(true));
  }

  async actualizar(): Promise<void> {
    try {
      await this.sw.activateUpdate();
    } finally {
      document.location.reload();
    }
  }
}
