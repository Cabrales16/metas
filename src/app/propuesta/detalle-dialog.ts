import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';

import { CopPipe } from '../core/cop.pipe';

export interface FilaDetalle {
  id: string;
  titulo: string;
  detalle: string;
  signo: string;
  monto: number;
  icono: string;
  color: string;
}

export interface DetalleData {
  titulo: string;
  subtitulo: string;
  total: number;
  filas: FilaDetalle[];
}

/** Ventana emergente con los movimientos detrás de una categoría o de un día. */
@Component({
  selector: 'app-detalle-dialog',
  imports: [CopPipe],
  template: `
    <header>
      <div>
        <h2>{{ data.titulo }}</h2>
        <p>{{ data.subtitulo }}</p>
      </div>
      <button type="button" class="cerrar" (click)="ref.close()" aria-label="Cerrar">
        <span class="material-symbols-outlined" aria-hidden="true">close</span>
      </button>
    </header>

    <div class="total">
      <span>Total</span>
      <strong>{{ data.total | cop }}</strong>
    </div>

    <ul>
      @for (f of data.filas; track f.id; let i = $index) {
        <li [style.animation-delay.ms]="i * 40">
          <span class="av" [style.--c]="f.color"><span class="material-symbols-outlined" aria-hidden="true">{{ f.icono }}</span></span>
          <span class="info"><strong>{{ f.titulo }}</strong><small>{{ f.detalle }}</small></span>
          <span class="monto">{{ f.signo }}{{ f.monto | cop }}</span>
        </li>
      } @empty {
        <li class="vacio">No hay movimientos para mostrar.</li>
      }
    </ul>

    <footer>
      <button type="button" class="ver" (click)="verMovimientos()">Ver en Movimientos</button>
    </footer>
  `,
  styles: `
    :host {
      display: block;
      padding: 24px;
      color: #f2efe6;
      animation: subir 360ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
    }
    header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }
    h2 {
      font-size: 1.375rem;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    header p {
      margin-top: 2px;
      color: #a9bdb6;
      font-size: 0.9375rem;
    }
    .cerrar {
      width: 40px;
      height: 40px;
      display: grid;
      place-items: center;
      flex: none;
      color: inherit;
      background: rgba(255, 255, 255, 0.08);
      border: 0;
      border-radius: 50%;
      cursor: pointer;
    }
    .cerrar:hover {
      background: rgba(255, 255, 255, 0.18);
    }
    .total {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin: 18px 0 8px;
      padding: 14px 16px;
      background: rgba(198, 255, 61, 0.1);
      border-radius: 16px;
    }
    .total span {
      color: #a9bdb6;
    }
    .total strong {
      color: #c6ff3d;
      font-size: 1.5rem;
      font-variant-numeric: tabular-nums;
    }
    ul {
      list-style: none;
      margin: 0;
      padding: 0;
      max-height: 46vh;
      overflow-y: auto;
    }
    li {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 4px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.07);
      animation: subir 380ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
    }
    li.vacio {
      justify-content: center;
      color: #a9bdb6;
      border: 0;
    }
    .av {
      flex: none;
      width: 38px;
      height: 38px;
      display: grid;
      place-items: center;
      color: var(--c);
      background: color-mix(in srgb, var(--c) 18%, transparent);
      border-radius: 12px;
    }
    .info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }
    .info strong,
    .info small {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .info small {
      color: #a9bdb6;
      font-size: 0.8125rem;
    }
    .monto {
      flex: none;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    footer {
      display: flex;
      justify-content: flex-end;
      margin-top: 16px;
    }
    .ver {
      height: 44px;
      padding: 0 20px;
      color: #10200a;
      font: inherit;
      font-weight: 700;
      background: #c6ff3d;
      border: 0;
      border-radius: 999px;
      cursor: pointer;
      transition: transform 160ms ease;
    }
    .ver:hover {
      transform: translateY(-1px);
    }
    @keyframes subir {
      from {
        opacity: 0;
        transform: translateY(14px);
      }
      to {
        opacity: 1;
        transform: none;
      }
    }
  `,
})
export class DetalleDialog {
  protected readonly ref = inject<MatDialogRef<DetalleDialog>>(MatDialogRef);
  protected readonly data = inject<DetalleData>(MAT_DIALOG_DATA);
  private readonly router = inject(Router);

  protected verMovimientos(): void {
    this.ref.close();
    void this.router.navigateByUrl('/movimientos');
  }
}
