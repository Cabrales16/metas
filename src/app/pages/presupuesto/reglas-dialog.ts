import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';

import { sumaPorcentajes } from '../../core/budget';
import { BudgetService } from '../../core/budget.service';
import { BOLSAS, Bucket } from '../../core/catalog';
import { etiquetaMes, rangoMes } from '../../core/dates';
import { NetService } from '../../core/net.service';

export interface ReglasDialogData {
  porcentajes: Record<Bucket, number>;
  /** Mes (yyyy-MM) desde el que regirá la nueva regla. */
  desde: string;
}

@Component({
  selector: 'app-reglas-dialog',
  imports: [FormsModule, MatDialogTitle, MatDialogContent, MatDialogActions, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Porcentajes del presupuesto</h2>
    <form class="dialog-form" (ngSubmit)="guardar()">
      <mat-dialog-content>
        <p class="muted intro">
          Rigen desde {{ desdeTexto }}. Los meses anteriores conservan sus propios porcentajes.
        </p>
        @for (b of bolsas; track b.valor) {
          <mat-form-field appearance="outline">
            <mat-label>{{ b.etiqueta }} (%)</mat-label>
            <input
              matInput
              type="number"
              inputmode="decimal"
              min="0"
              max="100"
              step="0.5"
              [name]="b.valor"
              [ngModel]="valores()[b.valor]"
              (ngModelChange)="cambiar(b.valor, $event)"
            />
          </mat-form-field>
        }
        <p class="suma" [class.mal]="!suma100()" role="status">
          Suman {{ suma() }} %. {{ suma100() ? 'Todo en orden.' : 'Deben sumar exactamente 100 %.' }}
        </p>
        @if (!net.online()) {
          <p class="offline">Sin conexión: no se puede guardar hasta que vuelva el internet.</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="ref.close(false)" [disabled]="guardando()">Cancelar</button>
        <button mat-flat-button type="submit" [disabled]="guardando() || !suma100() || !net.online()">
          {{ guardando() ? 'Guardando…' : 'Guardar' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .intro {
      margin-bottom: 12px;
    }
    .suma {
      font-weight: 600;
      color: var(--ok);
    }
    .suma.mal {
      color: var(--err);
    }
  `,
})
export class ReglasDialog {
  protected readonly ref = inject<MatDialogRef<ReglasDialog, boolean>>(MatDialogRef);
  private readonly budget = inject(BudgetService);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly net = inject(NetService);
  private readonly data = inject<ReglasDialogData>(MAT_DIALOG_DATA);

  protected readonly bolsas = BOLSAS;
  protected readonly desdeTexto = etiquetaMes(this.data.desde);
  protected readonly guardando = signal(false);
  protected readonly valores = signal<Record<Bucket, number>>({ ...this.data.porcentajes });
  protected readonly suma = computed(() => sumaPorcentajes(this.valores()));
  protected readonly suma100 = computed(() => this.suma() === 100);

  protected cambiar(b: Bucket, v: number | string | null): void {
    const n = Number(v);
    this.valores.update((x) => ({ ...x, [b]: Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0 }));
  }

  protected async guardar(): Promise<void> {
    if (!this.suma100()) return;
    this.guardando.set(true);
    try {
      await this.budget.guardar(this.valores(), rangoMes(this.data.desde).desde);
      this.snackBar.open('Porcentajes guardados.', undefined, { duration: 2500 });
      this.ref.close(true);
    } catch (e) {
      this.snackBar.open((e as Error).message, 'Cerrar', { duration: 6000 });
    } finally {
      this.guardando.set(false);
    }
  }
}
