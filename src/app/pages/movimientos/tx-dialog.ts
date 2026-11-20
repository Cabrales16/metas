import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
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
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { startWith } from 'rxjs';

import { AccountsService } from '../../core/accounts.service';
import { TxKind } from '../../core/aggregates';
import { CategoriesService } from '../../core/categories.service';
import { hoy } from '../../core/dates';
import { parseMonto } from '../../core/format';
import { NetService } from '../../core/net.service';
import { Tx, TransactionsService } from '../../core/transactions.service';

export interface TxDialogData {
  tx?: Tx;
  kind?: TxKind;
}

const CLAVE_ULT_CUENTA = 'metas-ult-cuenta';

const leerUltCuenta = (): string => {
  try {
    return localStorage.getItem(CLAVE_ULT_CUENTA) ?? '';
  } catch {
    return '';
  }
};

/** Alta y edición de movimientos: pensado para registrar un gasto en pocos toques desde el celular. */
@Component({
  selector: 'app-tx-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatButtonToggleModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ tx ? 'Editar movimiento' : 'Nuevo movimiento' }}</h2>
    <form class="dialog-form" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
      <mat-dialog-content>
        <mat-button-toggle-group
          class="kind"
          formControlName="kind"
          aria-label="Tipo de movimiento"
          hideSingleSelectionIndicator
        >
          <mat-button-toggle value="expense">Gasto</mat-button-toggle>
          <mat-button-toggle value="income">Ingreso</mat-button-toggle>
          <mat-button-toggle value="transfer">Transferencia</mat-button-toggle>
        </mat-button-toggle-group>

        <mat-form-field appearance="outline">
          <mat-label>Monto (COP)</mat-label>
          <input
            matInput
            formControlName="amount"
            inputmode="numeric"
            autocomplete="off"
            placeholder="50.000"
            (blur)="formatearMonto()"
          />
          @if (form.controls.amount.invalid) {
            <mat-error>Escribe un monto mayor que cero.</mat-error>
          }
        </mat-form-field>

        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>{{ esTransferencia() ? 'Desde la cuenta' : 'Cuenta' }}</mat-label>
            <mat-select formControlName="account_id">
              @for (a of cuentas(); track a.id) {
                <mat-option [value]="a.id">{{ a.name }}</mat-option>
              }
            </mat-select>
            @if (form.controls.account_id.invalid) {
              <mat-error>Elige una cuenta.</mat-error>
            }
          </mat-form-field>

          @if (esTransferencia()) {
            <mat-form-field appearance="outline">
              <mat-label>Hacia la cuenta</mat-label>
              <mat-select formControlName="to_account_id">
                @for (a of cuentas(); track a.id) {
                  <mat-option [value]="a.id">{{ a.name }}</mat-option>
                }
              </mat-select>
              @if (form.controls.to_account_id.hasError('required')) {
                <mat-error>Elige la cuenta de destino.</mat-error>
              } @else if (form.controls.to_account_id.hasError('igual')) {
                <mat-error>Debe ser distinta de la cuenta de origen.</mat-error>
              }
            </mat-form-field>
          } @else {
            <mat-form-field appearance="outline">
              <mat-label>Categoría</mat-label>
              <mat-select formControlName="category_id">
                @for (c of categorias(); track c.id) {
                  <mat-option [value]="c.id">{{ c.name }}</mat-option>
                }
              </mat-select>
              @if (form.controls.category_id.invalid) {
                <mat-error>Elige una categoría.</mat-error>
              }
            </mat-form-field>
          }
        </div>

        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Fecha</mat-label>
            <input matInput type="date" formControlName="occurred_on" />
            @if (form.controls.occurred_on.invalid) {
              <mat-error>Elige una fecha.</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Descripción (opcional)</mat-label>
            <input matInput formControlName="description" maxlength="120" autocomplete="off" />
          </mat-form-field>
        </div>
        @if (!net.online()) {
          <p class="offline">Sin conexión: no se puede guardar hasta que vuelva el internet.</p>
        }
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        @if (tx) {
          <button mat-button type="button" class="eliminar" (click)="ref.close('eliminar')" [disabled]="guardando() || !net.online()">
            Eliminar
          </button>
        }
        <button mat-button type="button" (click)="ref.close(false)" [disabled]="guardando()">Cancelar</button>
        <button mat-flat-button type="submit" [disabled]="guardando() || !net.online()">
          {{ guardando() ? 'Guardando…' : 'Guardar' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .kind {
      display: flex;
      width: 100%;
      margin-bottom: 16px;
    }
    .kind mat-button-toggle {
      flex: 1;
    }
    .eliminar {
      margin-right: auto;
      color: var(--err);
    }
  `,
})
export class TxDialog {
  protected readonly ref = inject<MatDialogRef<TxDialog, boolean | 'eliminar'>>(MatDialogRef);
  private readonly txs = inject(TransactionsService);
  private readonly accounts = inject(AccountsService);
  private readonly categories = inject(CategoriesService);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly net = inject(NetService);
  private readonly data = inject<TxDialogData>(MAT_DIALOG_DATA);

  protected readonly tx = this.data.tx;
  protected readonly guardando = signal(false);

  protected readonly form = inject(NonNullableFormBuilder).group({
    kind: [(this.tx?.kind ?? this.data.kind ?? 'expense') as TxKind],
    amount: [this.tx ? this.tx.amount.toLocaleString('es-CO') : '', [Validators.required, this.montoValido]],
    account_id: [this.tx?.account_id ?? leerUltCuenta(), Validators.required],
    to_account_id: [this.tx?.to_account_id ?? ''],
    category_id: [this.tx?.category_id ?? ''],
    occurred_on: [this.tx?.occurred_on ?? hoy(), Validators.required],
    description: [this.tx?.description ?? ''],
  });

  private readonly kind = toSignal(this.form.controls.kind.valueChanges.pipe(startWith(this.form.controls.kind.value)), {
    initialValue: this.form.controls.kind.value,
  });
  protected readonly esTransferencia = computed(() => this.kind() === 'transfer');

  /** Cuentas activas; al editar se conserva la cuenta del movimiento aunque esté archivada. */
  protected readonly cuentas = computed(() =>
    this.accounts.items().filter((a) => !a.is_archived || a.id === this.tx?.account_id || a.id === this.tx?.to_account_id),
  );
  protected readonly categorias = computed(() => {
    const kind = this.kind();
    return this.categories
      .items()
      .filter((c) => c.kind === kind && (!c.is_archived || c.id === this.tx?.category_id));
  });

  constructor() {
    void Promise.all([this.accounts.load(), this.categories.load()]).then(() => this.alElegirCuentaPorDefecto());

    this.form.controls.kind.valueChanges.subscribe((k) => this.alCambiarTipo(k));
    this.alCambiarTipo(this.form.controls.kind.value, true);
  }

  private montoValido(c: { value: string }): { monto: true } | null {
    const n = parseMonto(c.value ?? '');
    return n !== null && n > 0 ? null : { monto: true };
  }

  private alElegirCuentaPorDefecto(): void {
    const f = this.form.controls.account_id;
    const validas = this.cuentas();
    if (!f.value || !validas.some((a) => a.id === f.value)) f.setValue(validas[0]?.id ?? '');
  }

  private alCambiarTipo(kind: TxKind, inicial = false): void {
    const { category_id, to_account_id } = this.form.controls;
    category_id.clearValidators();
    to_account_id.clearValidators();
    if (kind === 'transfer') {
      to_account_id.setValidators([Validators.required, (c) => (c.value && c.value === this.form.controls.account_id.value ? { igual: true } : null)]);
      category_id.setValue('');
    } else {
      category_id.setValidators(Validators.required);
      to_account_id.setValue('');
      // La categoría de un tipo no sirve para el otro.
      if (!inicial) category_id.setValue('');
    }
    category_id.updateValueAndValidity();
    to_account_id.updateValueAndValidity();
  }

  protected formatearMonto(): void {
    const n = parseMonto(this.form.controls.amount.value);
    if (n !== null) this.form.controls.amount.setValue(n.toLocaleString('es-CO'));
  }

  protected async guardar(): Promise<void> {
    this.form.controls.to_account_id.updateValueAndValidity();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const esTransf = v.kind === 'transfer';
    const datos = {
      kind: v.kind,
      amount: parseMonto(v.amount)!,
      account_id: v.account_id,
      to_account_id: esTransf ? v.to_account_id : null,
      category_id: esTransf ? null : v.category_id,
      occurred_on: v.occurred_on,
      description: v.description.trim() || null,
    };

    this.guardando.set(true);
    try {
      if (this.tx) await this.txs.update(this.tx.id, datos);
      else await this.txs.create({ ...datos, source: 'manual' });
      try {
        localStorage.setItem(CLAVE_ULT_CUENTA, v.account_id);
      } catch {
        /* sin almacenamiento: no se recuerda la última cuenta */
      }
      this.snackBar.open(this.tx ? 'Movimiento actualizado.' : 'Movimiento guardado.', undefined, { duration: 2500 });
      this.ref.close(true);
    } catch (e) {
      this.snackBar.open((e as Error).message, 'Cerrar', { duration: 6000 });
    } finally {
      this.guardando.set(false);
    }
  }
}
