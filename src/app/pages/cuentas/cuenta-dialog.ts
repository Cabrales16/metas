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
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AccountsService } from '../../core/accounts.service';
import { Account, COLOR_POR_DEFECTO, TIPOS_CUENTA } from '../../core/catalog';
import { ColorPicker } from '../../shared/color-picker';

export interface CuentaDialogData {
  cuenta?: Account;
}

@Component({
  selector: 'app-cuenta-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    ColorPicker,
  ],
  template: `
    <h2 mat-dialog-title>{{ cuenta ? 'Editar cuenta' : 'Nueva cuenta' }}</h2>
    <form [formGroup]="form" (ngSubmit)="guardar()" novalidate>
      <mat-dialog-content>
        <mat-form-field appearance="outline">
          <mat-label>Nombre</mat-label>
          <input matInput formControlName="name" maxlength="40" autocomplete="off" />
          @if (form.controls.name.invalid) {
            <mat-error>Escribe un nombre.</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Tipo</mat-label>
          <mat-select formControlName="type">
            @for (t of tipos; track t.valor) {
              <mat-option [value]="t.valor">{{ t.etiqueta }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <p class="label">Color</p>
        <app-color-picker [(value)]="color" />
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="ref.close(false)" [disabled]="guardando()">
          Cancelar
        </button>
        <button mat-flat-button type="submit" [disabled]="guardando()">
          {{ guardando() ? 'Guardando…' : 'Guardar' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    mat-form-field {
      width: 100%;
    }
    .label {
      margin: 4px 0 10px;
      color: var(--app-muted);
      font-size: 0.875rem;
    }
  `,
})
export class CuentaDialog {
  protected readonly ref = inject<MatDialogRef<CuentaDialog, boolean>>(MatDialogRef);
  private readonly accounts = inject(AccountsService);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly cuenta = inject<CuentaDialogData>(MAT_DIALOG_DATA).cuenta;

  protected readonly tipos = TIPOS_CUENTA;
  protected readonly guardando = signal(false);
  protected readonly color = signal<string | null>(this.cuenta?.color ?? COLOR_POR_DEFECTO);

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: [this.cuenta?.name ?? '', [Validators.required, Validators.pattern(/\S/)]],
    type: [this.cuenta?.type ?? ('cash' as Account['type'])],
  });

  protected async guardar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { name, type } = this.form.getRawValue();
    const datos = { name: name.trim(), type, color: this.color() };

    this.guardando.set(true);
    try {
      if (this.cuenta) await this.accounts.update(this.cuenta.id, datos);
      else await this.accounts.create(datos);
      this.ref.close(true);
    } catch (e) {
      this.snackBar.open((e as Error).message, 'Cerrar', { duration: 6000 });
    } finally {
      this.guardando.set(false);
    }
  }
}
