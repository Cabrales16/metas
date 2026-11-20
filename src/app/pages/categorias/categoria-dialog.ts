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
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';

import {
  BOLSAS,
  Bucket,
  COLOR_POR_DEFECTO,
  Category,
  CategoryKind,
} from '../../core/catalog';
import { CategoriesService } from '../../core/categories.service';
import { ColorPicker } from '../../shared/color-picker';
import { IconPicker } from '../../shared/icon-picker';

export interface CategoriaDialogData {
  categoria?: Category;
  /** Tipo con el que se abre el formulario al crear. */
  kind: CategoryKind;
}

@Component({
  selector: 'app-categoria-dialog',
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
    ColorPicker,
    IconPicker,
  ],
  template: `
    <h2 mat-dialog-title>{{ categoria ? 'Editar categoría' : 'Nueva categoría' }}</h2>
    <form [formGroup]="form" (ngSubmit)="guardar()" novalidate>
      <mat-dialog-content>
        <mat-button-toggle-group
          class="kind"
          formControlName="kind"
          aria-label="Tipo de categoría"
          hideSingleSelectionIndicator
        >
          <mat-button-toggle value="expense">Gasto</mat-button-toggle>
          <mat-button-toggle value="income">Ingreso</mat-button-toggle>
        </mat-button-toggle-group>
        @if (categoria) {
          <p class="hint">El tipo no se puede cambiar: los movimientos ya registrados dependen de él.</p>
        }

        <mat-form-field appearance="outline">
          <mat-label>Nombre</mat-label>
          <input matInput formControlName="name" maxlength="40" autocomplete="off" />
          @if (form.controls.name.invalid) {
            <mat-error>Escribe un nombre.</mat-error>
          }
        </mat-form-field>

        @if (esGasto()) {
          <mat-form-field appearance="outline">
            <mat-label>Bolsa del presupuesto</mat-label>
            <mat-select formControlName="bucket">
              @for (b of bolsas; track b.valor) {
                <mat-option [value]="b.valor">{{ b.etiqueta }}</mat-option>
              }
            </mat-select>
            @if (form.controls.bucket.invalid) {
              <mat-error>Elige una bolsa.</mat-error>
            }
            @if (categoria && !form.controls.bucket.invalid) {
              <mat-hint>Cambiar la bolsa también afecta a los meses anteriores.</mat-hint>
            }
          </mat-form-field>
        }

        <p class="label">Ícono</p>
        <app-icon-picker [(value)]="icono" />

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
    .kind {
      width: 100%;
    }
    .kind mat-button-toggle {
      flex: 1;
    }
    .hint,
    .label {
      margin: 8px 0 10px;
      color: var(--app-muted);
      font-size: 0.875rem;
    }
    .hint {
      margin-bottom: 16px;
    }
    .label {
      margin-top: 16px;
    }
  `,
})
export class CategoriaDialog {
  protected readonly ref = inject<MatDialogRef<CategoriaDialog, boolean>>(MatDialogRef);
  private readonly categories = inject(CategoriesService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly data = inject<CategoriaDialogData>(MAT_DIALOG_DATA);

  protected readonly categoria = this.data.categoria;
  protected readonly bolsas = BOLSAS;
  protected readonly guardando = signal(false);
  protected readonly icono = signal<string | null>(this.categoria?.icon ?? 'category');
  protected readonly color = signal<string | null>(this.categoria?.color ?? COLOR_POR_DEFECTO);

  protected readonly form = inject(NonNullableFormBuilder).group({
    kind: [{ value: (this.categoria?.kind ?? this.data.kind) as CategoryKind, disabled: !!this.categoria }],
    name: [this.categoria?.name ?? '', [Validators.required, Validators.pattern(/\S/)]],
    bucket: [(this.categoria?.bucket ?? null) as Bucket | null],
  });

  protected readonly esGasto = signal(this.form.getRawValue().kind === 'expense');

  constructor() {
    // La bolsa solo aplica (y es obligatoria) a los gastos.
    this.form.controls.kind.valueChanges.subscribe((kind) => this.aplicarTipo(kind));
    this.aplicarTipo(this.form.getRawValue().kind);
  }

  private aplicarTipo(kind: CategoryKind): void {
    this.esGasto.set(kind === 'expense');
    const bucket = this.form.controls.bucket;
    if (kind === 'expense') bucket.addValidators(Validators.required);
    else bucket.removeValidators(Validators.required);
    bucket.updateValueAndValidity();
  }

  protected async guardar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { kind, name, bucket } = this.form.getRawValue();
    const datos = {
      name: name.trim(),
      bucket: kind === 'expense' ? bucket : null,
      icon: this.icono(),
      color: this.color(),
    };

    this.guardando.set(true);
    try {
      if (this.categoria) await this.categories.update(this.categoria.id, datos);
      else await this.categories.create({ ...datos, kind });
      this.ref.close(true);
    } catch (e) {
      this.snackBar.open((e as Error).message, 'Cerrar', { duration: 6000 });
    } finally {
      this.guardando.set(false);
    }
  }
}
