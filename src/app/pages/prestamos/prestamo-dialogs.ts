import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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

import { hoy } from '../../core/dates';
import { CopPipe } from '../../core/cop.pipe';
import { parseMonto } from '../../core/format';
import { NetService } from '../../core/net.service';
import { saldoPendiente } from '../../core/receivables';
import { Cobro, ReceivablesService } from '../../core/receivables.service';

const montoPositivo = (c: { value: string }) => {
  const n = parseMonto(c.value ?? '');
  return n !== null && n > 0 ? null : { monto: true };
};

// ------------------------------------------------------------- Préstamo
@Component({
  selector: 'app-prestamo-dialog',
  imports: [ReactiveFormsModule, MatDialogTitle, MatDialogContent, MatDialogActions, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ cobro ? 'Editar préstamo' : 'Nuevo préstamo' }}</h2>
    <form class="dialog-form" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
      <mat-dialog-content>
        <mat-form-field appearance="outline">
          <mat-label>¿A quién le prestaste?</mat-label>
          <input matInput formControlName="person" maxlength="60" autocomplete="off" />
          @if (form.controls.person.invalid) {
            <mat-error>Escribe el nombre.</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Monto (COP)</mat-label>
          <input matInput formControlName="amount" inputmode="numeric" autocomplete="off" />
          @if (form.controls.amount.invalid) {
            <mat-error>Escribe un monto mayor que cero.</mat-error>
          }
        </mat-form-field>
        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Fecha del préstamo</mat-label>
            <input matInput type="date" formControlName="lent_on" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Debe pagar antes de (opcional)</mat-label>
            <input matInput type="date" formControlName="due_on" />
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline">
          <mat-label>Notas (opcional)</mat-label>
          <input matInput formControlName="notes" maxlength="160" autocomplete="off" />
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
export class PrestamoDialog {
  protected readonly ref = inject<MatDialogRef<PrestamoDialog, boolean>>(MatDialogRef);
  private readonly receivables = inject(ReceivablesService);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly net = inject(NetService);
  protected readonly cobro = inject<{ cobro?: Cobro }>(MAT_DIALOG_DATA).cobro;
  protected readonly guardando = signal(false);

  protected readonly form = inject(NonNullableFormBuilder).group({
    person: [this.cobro?.person ?? '', [Validators.required, Validators.pattern(/\S/)]],
    amount: [this.cobro ? this.cobro.amount.toLocaleString('es-CO') : '', [Validators.required, montoPositivo]],
    lent_on: [this.cobro?.lent_on ?? hoy(), Validators.required],
    due_on: [this.cobro?.due_on ?? ''],
    notes: [this.cobro?.notes ?? ''],
  });

  protected async guardar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const datos = {
      person: v.person.trim(),
      amount: parseMonto(v.amount)!,
      lent_on: v.lent_on,
      due_on: v.due_on || null,
      notes: v.notes.trim() || null,
    };
    this.guardando.set(true);
    try {
      if (this.cobro) await this.receivables.update(this.cobro.id, datos);
      else await this.receivables.create(datos);
      this.ref.close(true);
    } catch (e) {
      this.snackBar.open((e as Error).message, 'Cerrar', { duration: 6000 });
    } finally {
      this.guardando.set(false);
    }
  }
}

// ----------------------------------------------------------------- Pago
@Component({
  selector: 'app-pago-dialog',
  imports: [ReactiveFormsModule, MatDialogTitle, MatDialogContent, MatDialogActions, MatFormFieldModule, MatInputModule, MatButtonModule, CopPipe],
  template: `
    <h2 mat-dialog-title>Registrar pago de {{ cobro.person }}</h2>
    <form class="dialog-form" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
      <mat-dialog-content>
        <p class="muted pend">Saldo pendiente: <strong class="num">{{ saldo | cop }}</strong></p>
        <mat-form-field appearance="outline">
          <mat-label>Monto del pago (COP)</mat-label>
          <input matInput formControlName="amount" inputmode="numeric" autocomplete="off" />
          @if (form.controls.amount.invalid) {
            <mat-error>Escribe un monto mayor que cero.</mat-error>
          }
          @if (superaSaldo()) {
            <mat-hint>Es más que el saldo pendiente.</mat-hint>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Fecha del pago</mat-label>
          <input matInput type="date" formControlName="date" />
        </mat-form-field>
        @if (!net.online()) {
          <p class="offline">Sin conexión: no se puede guardar hasta que vuelva el internet.</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="ref.close(false)" [disabled]="guardando()">Cancelar</button>
        <button mat-flat-button type="submit" [disabled]="guardando() || !net.online()">
          {{ guardando() ? 'Guardando…' : 'Registrar' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .pend {
      margin-bottom: 12px;
    }
  `,
})
export class PagoDialog {
  protected readonly ref = inject<MatDialogRef<PagoDialog, boolean>>(MatDialogRef);
  private readonly receivables = inject(ReceivablesService);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly net = inject(NetService);
  protected readonly cobro = inject<{ cobro: Cobro }>(MAT_DIALOG_DATA).cobro;
  protected readonly guardando = signal(false);
  protected readonly saldo = saldoPendiente(
    this.cobro.amount,
    this.receivables.pagos().filter((p) => p.receivable_id === this.cobro.id),
  );

  protected readonly form = inject(NonNullableFormBuilder).group({
    amount: [this.saldo > 0 ? this.saldo.toLocaleString('es-CO') : '', [Validators.required, montoPositivo]],
    date: [hoy(), Validators.required],
  });

  protected superaSaldo(): boolean {
    return (parseMonto(this.form.getRawValue().amount) ?? 0) > this.saldo;
  }

  protected async guardar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.guardando.set(true);
    try {
      await this.receivables.addPago(this.cobro, parseMonto(v.amount)!, v.date);
      this.snackBar.open('Pago registrado.', undefined, { duration: 2500 });
      this.ref.close(true);
    } catch (e) {
      this.snackBar.open((e as Error).message, 'Cerrar', { duration: 6000 });
    } finally {
      this.guardando.set(false);
    }
  }
}
