import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
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

import { CopPipe } from '../../core/cop.pipe';
import { parseMonto } from '../../core/format';
import { hoy } from '../../core/dates';
import { Goal, GoalsService } from '../../core/goals.service';
import { totalAportado } from '../../core/goals';
import { NetService } from '../../core/net.service';

const montoPositivo = (c: { value: string }) => {
  const n = parseMonto(c.value ?? '');
  return n !== null && n > 0 ? null : { monto: true };
};

// ---------------------------------------------------------------- Meta
@Component({
  selector: 'app-meta-dialog',
  imports: [ReactiveFormsModule, MatDialogTitle, MatDialogContent, MatDialogActions, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ meta ? 'Editar meta' : 'Nueva meta' }}</h2>
    <form class="dialog-form" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
      <mat-dialog-content>
        <mat-form-field appearance="outline">
          <mat-label>Nombre</mat-label>
          <input matInput formControlName="name" maxlength="60" autocomplete="off" placeholder="Mi moto" />
          @if (form.controls.name.invalid) {
            <mat-error>Escribe un nombre.</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Cuánto necesitas (COP)</mat-label>
          <input matInput formControlName="target" inputmode="numeric" autocomplete="off" placeholder="8.000.000" />
          @if (form.controls.target.invalid) {
            <mat-error>Escribe un valor mayor que cero.</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Fecha objetivo (opcional)</mat-label>
          <input matInput type="date" formControlName="date" />
          <mat-hint>Con fecha, te digo cuánto ahorrar al mes.</mat-hint>
        </mat-form-field>
        @if (!net.online()) {
          <p class="offline">Sin conexión: no se puede guardar hasta que vuelva el internet.</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="ref.close(false)" [disabled]="guardando()">Cancelar</button>
        <button mat-flat-button type="submit" [disabled]="guardando() || !net.online()">
          {{ guardando() ? 'Guardando…' : 'Guardar' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
})
export class MetaDialog {
  protected readonly ref = inject<MatDialogRef<MetaDialog, boolean>>(MatDialogRef);
  private readonly goals = inject(GoalsService);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly net = inject(NetService);
  protected readonly meta = inject<{ meta?: Goal }>(MAT_DIALOG_DATA).meta;
  protected readonly guardando = signal(false);

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: [this.meta?.name ?? '', [Validators.required, Validators.pattern(/\S/)]],
    target: [this.meta ? this.meta.target_amount.toLocaleString('es-CO') : '', [Validators.required, montoPositivo]],
    date: [this.meta?.target_date ?? ''],
  });

  protected async guardar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const datos = { name: v.name.trim(), target_amount: parseMonto(v.target)!, target_date: v.date || null };
    this.guardando.set(true);
    try {
      if (this.meta) await this.goals.updateGoal(this.meta.id, datos);
      else await this.goals.createGoal(datos);
      this.ref.close(true);
    } catch (e) {
      this.snackBar.open((e as Error).message, 'Cerrar', { duration: 6000 });
    } finally {
      this.guardando.set(false);
    }
  }
}

// -------------------------------------------------------------- Aporte
@Component({
  selector: 'app-aporte-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatButtonToggleModule,
    CopPipe,
  ],
  template: `
    <h2 mat-dialog-title>{{ meta.name }}</h2>
    <form class="dialog-form" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
      <mat-dialog-content>
        <mat-button-toggle-group class="tipo" formControlName="tipo" aria-label="Tipo" hideSingleSelectionIndicator>
          <mat-button-toggle value="aporte">Aportar</mat-button-toggle>
          <mat-button-toggle value="retiro">Retirar</mat-button-toggle>
        </mat-button-toggle-group>
        <mat-form-field appearance="outline">
          <mat-label>Monto (COP)</mat-label>
          <input matInput formControlName="amount" inputmode="numeric" autocomplete="off" />
          @if (form.controls.amount.invalid) {
            <mat-error>Escribe un monto mayor que cero.</mat-error>
          }
          @if (excedeRetiro()) {
            <mat-hint>Solo has aportado {{ aportado | cop }}.</mat-hint>
          }
        </mat-form-field>
        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Fecha</mat-label>
            <input matInput type="date" formControlName="date" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Nota (opcional)</mat-label>
            <input matInput formControlName="note" maxlength="80" autocomplete="off" />
          </mat-form-field>
        </div>
        @if (!net.online()) {
          <p class="offline">Sin conexión: no se puede guardar hasta que vuelva el internet.</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="ref.close(false)" [disabled]="guardando()">Cancelar</button>
        <button mat-flat-button type="submit" [disabled]="guardando() || !net.online()">
          {{ guardando() ? 'Guardando…' : 'Guardar' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .tipo {
      display: flex;
      width: 100%;
      margin-bottom: 16px;
    }
    .tipo mat-button-toggle {
      flex: 1;
    }
  `,
  providers: [],
})
export class AporteDialog {
  protected readonly ref = inject<MatDialogRef<AporteDialog, boolean>>(MatDialogRef);
  private readonly goals = inject(GoalsService);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly net = inject(NetService);
  protected readonly meta = inject<{ meta: Goal }>(MAT_DIALOG_DATA).meta;
  protected readonly guardando = signal(false);
  protected readonly aportado = totalAportado(this.goals.aportes(), this.meta.id);

  protected readonly form = inject(NonNullableFormBuilder).group({
    tipo: ['aporte' as 'aporte' | 'retiro'],
    amount: ['', [Validators.required, montoPositivo]],
    date: [hoy(), Validators.required],
    note: [''],
  });

  protected excedeRetiro(): boolean {
    const v = this.form.getRawValue();
    return v.tipo === 'retiro' && (parseMonto(v.amount) ?? 0) > this.aportado;
  }

  protected async guardar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const monto = parseMonto(v.amount)!;
    this.guardando.set(true);
    try {
      await this.goals.addAporte({
        goal_id: this.meta.id,
        amount: v.tipo === 'retiro' ? -monto : monto,
        contributed_on: v.date,
        note: v.note.trim() || null,
      });
      this.snackBar.open(v.tipo === 'retiro' ? 'Retiro registrado.' : 'Aporte registrado.', undefined, { duration: 2500 });
      this.ref.close(true);
    } catch (e) {
      this.snackBar.open((e as Error).message, 'Cerrar', { duration: 6000 });
    } finally {
      this.guardando.set(false);
    }
  }
}
