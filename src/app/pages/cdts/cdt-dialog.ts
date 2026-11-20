import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
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
import { startWith } from 'rxjs';

import { AccountsService } from '../../core/accounts.service';
import { CdtDatos, PERIODICIDADES, Periodicidad, proyectarCdt } from '../../core/cdt';
import { hoy, sumarMeses } from '../../core/dates';
import { cop, parseMonto } from '../../core/format';
import { Investment, InvestmentsService } from '../../core/investments.service';
import { NetService } from '../../core/net.service';

/** «12,5» o «12.5» -> 12.5; null si no es un número. */
export function parsePorcentaje(texto: string): number | null {
  const n = Number(texto.trim().replace(',', '.'));
  return texto.trim() !== '' && Number.isFinite(n) ? n : null;
}

const montoPositivo = (c: AbstractControl): ValidationErrors | null => {
  const n = parseMonto(c.value ?? '');
  return n !== null && n > 0 ? null : { monto: true };
};
const tasaValida = (c: AbstractControl): ValidationErrors | null => {
  const n = parsePorcentaje(c.value ?? '');
  return n !== null && n > 0 && n < 100 ? null : { tasa: true };
};
const retencionValida = (c: AbstractControl): ValidationErrors | null => {
  const n = parsePorcentaje(c.value ?? '');
  return n !== null && n >= 0 && n < 100 ? null : { retencion: true };
};

@Component({
  selector: 'app-cdt-dialog',
  imports: [ReactiveFormsModule, MatDialogTitle, MatDialogContent, MatDialogActions, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ inv ? 'Editar CDT' : 'Nuevo CDT' }}</h2>
    <form class="dialog-form" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
      <mat-dialog-content>
        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Entidad</mat-label>
            <input matInput formControlName="entity" maxlength="60" autocomplete="off" />
            @if (form.controls.entity.invalid) {
              <mat-error>Escribe la entidad.</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Producto</mat-label>
            <input matInput formControlName="product" maxlength="30" autocomplete="off" />
          </mat-form-field>
        </div>
        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Capital (COP)</mat-label>
            <input matInput formControlName="principal" inputmode="numeric" autocomplete="off" />
            @if (form.controls.principal.invalid) {
              <mat-error>Escribe un valor mayor que cero.</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Tasa efectiva anual (%)</mat-label>
            <input matInput formControlName="rate" inputmode="decimal" autocomplete="off" placeholder="12,5" />
            @if (form.controls.rate.invalid) {
              <mat-error>Entre 0 y 100, por ejemplo 12,5.</mat-error>
            }
          </mat-form-field>
        </div>
        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Inicio</mat-label>
            <input matInput type="date" formControlName="start_on" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Vencimiento</mat-label>
            <input matInput type="date" formControlName="end_on" />
          </mat-form-field>
        </div>
        @if (form.hasError('orden')) {
          <p class="error-orden" role="alert">El vencimiento debe ser posterior al inicio.</p>
        }
        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Pago de intereses</mat-label>
            <mat-select formControlName="payout_frequency">
              @for (p of periodicidades; track p.valor) {
                <mat-option [value]="p.valor">{{ p.etiqueta }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Retención (%)</mat-label>
            <input matInput formControlName="withholding" inputmode="decimal" autocomplete="off" />
            @if (form.controls.withholding.invalid) {
              <mat-error>Entre 0 y 100.</mat-error>
            }
          </mat-form-field>
        </div>
        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Cuenta (opcional)</mat-label>
            <mat-select formControlName="account_id">
              <mat-option value="">Sin cuenta</mat-option>
              @for (a of accounts.items(); track a.id) {
                <mat-option [value]="a.id">{{ a.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          @if (inv) {
            <mat-form-field appearance="outline">
              <mat-label>Estado</mat-label>
              <mat-select formControlName="status">
                <mat-option value="active">Activo</mat-option>
                <mat-option value="matured">Vencido</mat-option>
                <mat-option value="cancelled">Cancelado</mat-option>
              </mat-select>
            </mat-form-field>
          }
        </div>
        <mat-form-field appearance="outline">
          <mat-label>Notas (opcional)</mat-label>
          <input matInput formControlName="notes" maxlength="160" autocomplete="off" />
        </mat-form-field>

        @if (vista(); as v) {
          <p class="proyeccion" role="status">
            Interés neto {{ v.etiquetaPeriodo }}: <strong class="num">{{ v.netoPorPeriodo }}</strong>
            · Total neto proyectado: <strong class="num">{{ v.netoTotal }}</strong>
          </p>
        }
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
    .error-orden {
      margin: -8px 0 12px;
      color: var(--err);
      font-size: 0.875rem;
    }
    .proyeccion {
      padding: 10px 12px;
      font-size: 0.9375rem;
      background: var(--prim-bg);
      border-radius: 12px;
    }
  `,
})
export class CdtDialog {
  protected readonly ref = inject<MatDialogRef<CdtDialog, boolean>>(MatDialogRef);
  private readonly investments = inject(InvestmentsService);
  protected readonly accounts = inject(AccountsService);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly net = inject(NetService);
  protected readonly inv = inject<{ inv?: Investment }>(MAT_DIALOG_DATA).inv;

  protected readonly periodicidades = PERIODICIDADES;
  protected readonly guardando = signal(false);

  protected readonly form = inject(NonNullableFormBuilder).group(
    {
      entity: [this.inv?.entity ?? '', [Validators.required, Validators.pattern(/\S/)]],
      product: [this.inv?.product ?? 'CDT'],
      principal: [this.inv ? this.inv.principal.toLocaleString('es-CO') : '', [Validators.required, montoPositivo]],
      rate: [this.inv ? String(Number(this.inv.rate_ea) * 100).replace('.', ',') : '', [Validators.required, tasaValida]],
      start_on: [this.inv?.start_on ?? hoy(), Validators.required],
      end_on: [this.inv?.end_on ?? sumarMeses(hoy().slice(0, 7), 12) + hoy().slice(7), Validators.required],
      payout_frequency: [(this.inv?.payout_frequency ?? 'monthly') as Periodicidad],
      withholding: [this.inv ? String(Number(this.inv.withholding_rate) * 100).replace('.', ',') : '4', [Validators.required, retencionValida]],
      account_id: [this.inv?.account_id ?? ''],
      status: [(this.inv?.status ?? 'active') as Investment['status']],
      notes: [this.inv?.notes ?? ''],
    },
    {
      validators: (g: AbstractControl): ValidationErrors | null => {
        const { start_on, end_on } = g.getRawValue();
        return start_on && end_on && end_on <= start_on ? { orden: true } : null;
      },
    },
  );

  private readonly valores = toSignal(this.form.valueChanges.pipe(startWith(this.form.getRawValue())), {
    initialValue: this.form.getRawValue(),
  });

  /** Vista previa del interés, con las mismas fórmulas que la lista. */
  protected readonly vista = computed(() => {
    const v = this.valores() as ReturnType<typeof this.form.getRawValue>;
    const datos = this.aDatos(v);
    if (!datos) return null;
    const p = proyectarCdt(datos);
    const nombre = { monthly: 'mensual', quarterly: 'trimestral', semiannual: 'semestral', at_maturity: 'al vencimiento' }[datos.payout_frequency];
    return { etiquetaPeriodo: nombre, netoPorPeriodo: cop(p.netoPorPeriodo), netoTotal: cop(p.netoTotal) };
  });

  constructor() {
    void this.accounts.load();
  }

  private aDatos(v: ReturnType<typeof this.form.getRawValue>): CdtDatos | null {
    const principal = parseMonto(v.principal ?? '');
    const tasa = parsePorcentaje(v.rate ?? '');
    const ret = parsePorcentaje(v.withholding ?? '');
    if (!principal || tasa === null || tasa <= 0 || tasa >= 100 || ret === null || !v.start_on || !v.end_on || v.end_on <= v.start_on) return null;
    return {
      principal,
      rate_ea: tasa / 100,
      start_on: v.start_on,
      end_on: v.end_on,
      payout_frequency: v.payout_frequency,
      withholding_rate: ret / 100,
    };
  }

  protected async guardar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const d = this.aDatos(v)!;
    const datos = {
      entity: v.entity.trim(),
      product: v.product.trim() || 'CDT',
      principal: d.principal,
      rate_ea: d.rate_ea,
      start_on: d.start_on,
      end_on: d.end_on,
      payout_frequency: d.payout_frequency,
      withholding_rate: d.withholding_rate,
      account_id: v.account_id || null,
      status: v.status,
      notes: v.notes.trim() || null,
    };
    this.guardando.set(true);
    try {
      if (this.inv) await this.investments.update(this.inv.id, datos);
      else await this.investments.create(datos);
      this.ref.close(true);
    } catch (e) {
      this.snackBar.open((e as Error).message, 'Cerrar', { duration: 6000 });
    } finally {
      this.guardando.set(false);
    }
  }
}
