import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';

import { BOLSAS, Category, CategoryKind, colorDe } from '../../core/catalog';
import { CategoriesService } from '../../core/categories.service';
import { CategoriaDialog, CategoriaDialogData } from './categoria-dialog';

interface Grupo {
  titulo: string | null;
  items: Category[];
}

@Component({
  selector: 'app-categorias',
  imports: [RouterLink, MatButtonModule, MatButtonToggleModule, MatSlideToggleModule],
  template: `
    <header class="page-header">
      <a class="back" routerLink="/mas" aria-label="Volver a Más">
        <span class="material-symbols-outlined" aria-hidden="true">arrow_back</span>
      </a>
      <h1>Categorías</h1>
      <button mat-flat-button type="button" (click)="abrir()">
        <span class="material-symbols-outlined" matButtonIcon aria-hidden="true">add</span>
        Nueva
      </button>
    </header>

    <mat-button-toggle-group
      class="kind"
      aria-label="Tipo de categoría"
      hideSingleSelectionIndicator
      [value]="kind()"
      (change)="kind.set($event.value)"
    >
      <mat-button-toggle value="expense">Gastos</mat-button-toggle>
      <mat-button-toggle value="income">Ingresos</mat-button-toggle>
    </mat-button-toggle-group>

    <mat-slide-toggle [checked]="verArchivadas()" (change)="verArchivadas.set($event.checked)">
      Mostrar archivadas
    </mat-slide-toggle>

    @if (fallo()) {
      <div class="state">
        <p>No se pudieron cargar las categorías.</p>
        <button mat-stroked-button type="button" (click)="cargar(true)">Reintentar</button>
      </div>
    } @else if (service.loading() && !service.items().length) {
      <p class="state muted">Cargando…</p>
    } @else if (!grupos().length) {
      <p class="state muted">No hay categorías para mostrar.</p>
    } @else {
      @for (g of grupos(); track g.titulo) {
        @if (g.titulo) {
          <h2 class="group-title">{{ g.titulo }}</h2>
        }
        <ul class="list">
          @for (c of g.items; track c.id) {
            <li class="list-row" [class.archivada]="c.is_archived">
              <span class="avatar" [style.--c]="color(c)">
                <span class="material-symbols-outlined" aria-hidden="true">{{
                  c.icon ?? 'category'
                }}</span>
              </span>
              <div class="info">
                <strong>{{ c.name }}</strong>
                @if (c.is_archived) {
                  <span class="muted">Archivada</span>
                }
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
    }
  `,
  styles: `
    .kind {
      display: flex;
      width: 100%;
      margin-bottom: 12px;
    }
    .kind mat-button-toggle {
      flex: 1;
    }
  `,
})
export class Categorias {
  protected readonly service = inject(CategoriesService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly kind = signal<CategoryKind>('expense');
  protected readonly verArchivadas = signal(false);
  protected readonly fallo = signal(false);

  protected readonly grupos = computed<Grupo[]>(() => {
    const kind = this.kind();
    const base = this.verArchivadas() ? this.service.items() : this.service.activas();
    const delTipo = base.filter((c) => c.kind === kind);
    if (kind === 'income') return delTipo.length ? [{ titulo: null, items: delTipo }] : [];
    return BOLSAS.map((b) => ({
      titulo: b.etiqueta,
      items: delTipo.filter((c) => c.bucket === b.valor),
    })).filter((g) => g.items.length);
  });

  protected readonly color = (c: Category) => colorDe(c.color);

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

  protected abrir(categoria?: Category): void {
    this.dialog.open<CategoriaDialog, CategoriaDialogData, boolean>(CategoriaDialog, {
      data: { categoria, kind: this.kind() },
      width: '480px',
      maxWidth: 'calc(100vw - 32px)',
    });
  }

  protected async archivar(categoria: Category): Promise<void> {
    try {
      await this.service.setArchived(categoria.id, !categoria.is_archived);
    } catch (e) {
      this.snackBar.open((e as Error).message, 'Cerrar', { duration: 6000 });
    }
  }
}
