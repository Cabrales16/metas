import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AccountsService } from '../../core/accounts.service';
import { Account, colorDe, etiquetaTipoCuenta, iconoTipoCuenta } from '../../core/catalog';
import { CuentaDialog, CuentaDialogData } from './cuenta-dialog';

import { PageHero } from '../../shared/page-hero';

@Component({
  selector: 'app-cuentas',
  imports: [PageHero, MatButtonModule, MatSlideToggleModule],
  template: `
    <app-page-hero titulo="Cuentas" subtitulo="Dónde tienes tu plata: efectivo, banco y otras." imagen="img/banner-bogota.jpg" volverA="/mas">
      <button mat-flat-button type="button" (click)="abrir()">
        <span class="material-symbols-outlined" matButtonIcon aria-hidden="true">add</span>
        Nueva
      </button>
    </app-page-hero>

    <mat-slide-toggle [checked]="verArchivadas()" (change)="verArchivadas.set($event.checked)">
      Mostrar archivadas
    </mat-slide-toggle>

    @if (fallo()) {
      <div class="state">
        <p>No se pudieron cargar las cuentas.</p>
        <button mat-stroked-button type="button" (click)="cargar(true)">Reintentar</button>
      </div>
    } @else if (service.loading() && !service.items().length) {
      <p class="state muted">Cargando…</p>
    } @else if (!visibles().length) {
      <p class="state muted">No hay cuentas para mostrar.</p>
    } @else {
      <ul class="list">
        @for (c of visibles(); track c.id) {
          <li class="list-row" [class.archivada]="c.is_archived">
            <span class="avatar" [style.--c]="color(c)">
              <span class="material-symbols-outlined" aria-hidden="true">{{ icono(c) }}</span>
            </span>
            <div class="info">
              <strong>{{ c.name }}</strong>
              <span class="muted">{{ tipo(c) }}@if (c.is_archived) { · Archivada }</span>
            </div>
            <button
              type="button"
              class="icon-btn"
              [attr.aria-label]="'Editar ' + c.name"
              (click)="abrir(c)"
            >
              <span class="material-symbols-outlined" aria-hidden="true">edit</span>
            </button>
            <button
              type="button"
              class="icon-btn"
              [attr.aria-label]="(c.is_archived ? 'Restaurar ' : 'Archivar ') + c.name"
              (click)="archivar(c)"
            >
              <span class="material-symbols-outlined" aria-hidden="true">{{
                c.is_archived ? 'unarchive' : 'archive'
              }}</span>
            </button>
          </li>
        }
      </ul>
    }
  `,
})
export class Cuentas {
  protected readonly service = inject(AccountsService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly verArchivadas = signal(false);
  protected readonly fallo = signal(false);
  protected readonly visibles = computed(() =>
    this.verArchivadas() ? this.service.items() : this.service.activas(),
  );

  protected readonly color = (c: Account) => colorDe(c.color);
  protected readonly icono = (c: Account) => iconoTipoCuenta(c.type);
  protected readonly tipo = (c: Account) => etiquetaTipoCuenta(c.type);

  constructor() {
    this.cargar();
  }

  protected async cargar(forzar = false): Promise<void> {
    this.fallo.set(false);
    try {
      await this.service.load(forzar);
    } catch (e) {
      this.fallo.set(true);
      this.snackBar.open((e as Error).message, 'Cerrar', { duration: 6000 });
    }
  }

  protected abrir(cuenta?: Account): void {
    this.dialog.open<CuentaDialog, CuentaDialogData, boolean>(CuentaDialog, {
      data: { cuenta },
      width: '440px',
      maxWidth: 'calc(100vw - 32px)',
    });
  }

  protected async archivar(cuenta: Account): Promise<void> {
    try {
      await this.service.setArchived(cuenta.id, !cuenta.is_archived);
    } catch (e) {
      this.snackBar.open((e as Error).message, 'Cerrar', { duration: 6000 });
    }
  }
}
