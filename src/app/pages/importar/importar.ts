import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';

import { AccountsService } from '../../core/accounts.service';
import { AccountType, BOLSAS, Bucket, TIPOS_CUENTA } from '../../core/catalog';
import { CategoriesService } from '../../core/categories.service';
import { CopPipe } from '../../core/cop.pipe';
import { formatoFecha } from '../../core/dates';
import { ImportService, ResumenImportacion } from '../../core/import.service';
import { PlanImportacion, ResultadoParseo, parsearMonefy, planificarImportacion } from '../../core/monefy';
import { NetService } from '../../core/net.service';

type Paso = 'inicio' | 'leyendo' | 'vista' | 'importando' | 'listo';

import { PageHero } from '../../shared/page-hero';

@Component({
  selector: 'app-importar',
  imports: [PageHero, RouterLink, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatSelectModule, CopPipe],
  template: `
    <app-page-hero titulo="Importar desde Monefy" subtitulo="Sube el CSV exportado de Monefy. Antes de guardar nada verás una vista previa." imagen="img/banner-bogota.jpg" posicion="center 30%" volverA="/mas" />

    @switch (paso()) {
      @case ('inicio') {
        <label class="card zona" [class.off]="!net.online()">
          <span class="material-symbols-outlined" aria-hidden="true">upload_file</span>
          <strong>Elige tu archivo CSV</strong>
          <span class="muted">Se puede volver a importar sin duplicar movimientos.</span>
          <input type="file" accept=".csv,text/csv" (change)="elegir($event)" [disabled]="!net.online()" />
        </label>
        @if (!net.online()) {
          <p class="offline">Sin conexión: necesitas internet para importar.</p>
        }
      }

      @case ('leyendo') {
        <div class="skel" style="height: 160px; border-radius: 16px" aria-busy="true"></div>
      }

      @case ('vista') {
        @if (plan(); as p) {
          <p class="muted archivo">Archivo: {{ archivo() }} · del {{ fecha(rango().desde) }} al {{ fecha(rango().hasta) }}</p>

          <section class="kpis" aria-label="Vista previa">
            <div class="card kpi">
              <span class="label">Filas leídas</span>
              <span class="value">{{ filas().length }}</span>
            </div>
            <div class="card kpi">
              <span class="label">Nuevas</span>
              <span class="value pos">{{ p.nuevas.length }}</span>
            </div>
            <div class="card kpi">
              <span class="label">Ya importadas</span>
              <span class="value">{{ p.duplicadas.length }}</span>
            </div>
          </section>

          @if (parseo()!.invalidas.length) {
            <details class="card bloque">
              <summary>{{ parseo()!.invalidas.length }} filas no válidas (no se importarán)</summary>
              <ul class="invalidas">
                @for (i of invalidasVisibles(); track i.linea) {
                  <li>Línea {{ i.linea }}: {{ i.motivo }}</li>
                }
              </ul>
            </details>
          }

          @if (p.cuentasFaltantes.length || p.categoriasFaltantes.length) {
            <section class="card bloque">
              <div class="card-head"><h2>Se crearán</h2></div>
              <div class="card-body crear">
                @for (c of p.cuentasFaltantes; track c) {
                  <div class="fila-crear">
                    <span><strong>{{ c }}</strong> <span class="muted">cuenta</span></span>
                    <mat-form-field appearance="outline" subscriptSizing="dynamic">
                      <mat-label>Tipo</mat-label>
                      <mat-select [value]="tipos()[c]" (selectionChange)="fijarTipo(c, $event.value)">
                        @for (t of tiposCuenta; track t.valor) {
                          <mat-option [value]="t.valor">{{ t.etiqueta }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>
                  </div>
                }
                @for (c of p.categoriasFaltantes; track c.nombre + c.kind) {
                  <div class="fila-crear">
                    <span><strong>{{ c.nombre }}</strong> <span class="muted">categoría de {{ c.kind === 'income' ? 'ingreso' : 'gasto' }}</span></span>
                    @if (c.kind === 'expense') {
                      <mat-form-field appearance="outline" subscriptSizing="dynamic">
                        <mat-label>Bolsa</mat-label>
                        <mat-select [value]="bolsas()[clave(c)]" (selectionChange)="fijarBolsa(c, $event.value)">
                          @for (b of bolsasOpciones; track b.valor) {
                            <mat-option [value]="b.valor">{{ b.etiqueta }}</mat-option>
                          }
                        </mat-select>
                      </mat-form-field>
                    }
                  </div>
                }
              </div>
            </section>
          }

          @if (p.posiblesPrestamos.length) {
            <section class="card bloque">
              <div class="card-head"><h2>Posibles préstamos</h2></div>
              <div class="card-body">
                <p class="muted">
                  Estas filas mencionan «presté». Marca las que quieras guardar como préstamo por cobrar
                  (no se importarán como gasto). Las demás se importan normalmente.
                </p>
                <ul class="prestamos">
                  @for (f of p.posiblesPrestamos; track f.hash) {
                    <li>
                      <mat-checkbox [checked]="comoPrestamo().has(f.hash)" (change)="marcarPrestamo(f.hash, $event.checked)">
                        {{ fecha(f.fecha) }} · {{ f.monto | cop }} · {{ f.descripcion }}
                      </mat-checkbox>
                    </li>
                  }
                </ul>
              </div>
            </section>
          }

          <div class="acciones">
            <button mat-flat-button type="button" (click)="importar()" [disabled]="!p.nuevas.length || !net.online()">
              {{ p.nuevas.length ? 'Importar ' + p.nuevas.length + ' movimientos' : 'No hay nada nuevo que importar' }}
            </button>
            <button mat-button type="button" (click)="reiniciar()">Elegir otro archivo</button>
          </div>
        }
      }

      @case ('importando') {
        <section class="card bloque">
          <div class="card-body">
            <p><strong>Importando…</strong> {{ progreso().hecho }} de {{ progreso().total }}</p>
            <div class="progress prim" role="progressbar" [attr.aria-valuenow]="pctProgreso()" aria-valuemin="0" aria-valuemax="100">
              <span [style.width.%]="pctProgreso()"></span>
            </div>
            <p class="muted">No cierres esta pantalla hasta que termine.</p>
          </div>
        </section>
      }

      @case ('listo') {
        @if (resumen(); as r) {
          <section class="card empty">
            <span class="material-symbols-outlined" aria-hidden="true">check_circle</span>
            <strong>Importación terminada</strong>
            <p>
              {{ r.insertadas }} movimientos nuevos
              @if (r.yaExistian) { · {{ r.yaExistian }} ya existían }
              @if (r.comoPrestamo) { · {{ r.comoPrestamo }} guardados como préstamo }
            </p>
            @if (r.comoPrestamo) {
              <p class="muted">Los préstamos quedaron a nombre de «Por definir»: edítalos en «Por cobrar» para poner el nombre.</p>
            }
            <div class="acciones">
              <a mat-flat-button routerLink="/movimientos">Ver movimientos</a>
              <button mat-button type="button" (click)="reiniciar()">Importar otro archivo</button>
            </div>
          </section>
        }
      }
    }
  `,
  styles: `
    .zona {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 48px 20px;
      text-align: center;
      border-style: dashed;
      cursor: pointer;
    }
    .zona:hover:not(.off) {
      background: var(--prim-bg);
    }
    .zona .material-symbols-outlined {
      font-size: 40px;
      color: var(--prim-text);
    }
    .zona input {
      position: absolute;
      inset: 0;
      opacity: 0;
      cursor: pointer;
    }
    .archivo {
      margin-bottom: 12px;
    }
    .bloque {
      margin-top: 16px;
    }
    details.bloque {
      padding: 14px 20px;
    }
    summary {
      cursor: pointer;
      font-weight: 600;
    }
    .invalidas {
      margin: 10px 0 0;
      padding-left: 20px;
      color: var(--muted);
      font-size: 0.875rem;
    }
    .crear {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .fila-crear {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .fila-crear mat-form-field {
      min-width: 180px;
    }
    .prestamos {
      list-style: none;
      margin: 8px 0 0;
      padding: 0;
    }
    .acciones {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 20px;
    }
    .offline {
      margin-top: 8px;
      color: var(--err);
    }
  `,
})
export class Importar {
  private readonly importer = inject(ImportService);
  private readonly accounts = inject(AccountsService);
  private readonly categories = inject(CategoriesService);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly net = inject(NetService);

  protected readonly tiposCuenta = TIPOS_CUENTA;
  protected readonly bolsasOpciones = BOLSAS;
  protected readonly fecha = formatoFecha;

  protected readonly paso = signal<Paso>('inicio');
  protected readonly archivo = signal('');
  protected readonly parseo = signal<ResultadoParseo | null>(null);
  protected readonly plan = signal<PlanImportacion | null>(null);
  protected readonly tipos = signal<Record<string, AccountType>>({});
  protected readonly bolsas = signal<Record<string, Bucket>>({});
  protected readonly comoPrestamo = signal<Set<string>>(new Set());
  protected readonly progreso = signal({ hecho: 0, total: 0 });
  protected readonly resumen = signal<ResumenImportacion | null>(null);

  protected readonly filas = computed(() => this.parseo()?.filas ?? []);
  protected readonly invalidasVisibles = computed(() => (this.parseo()?.invalidas ?? []).slice(0, 10));
  protected readonly pctProgreso = computed(() => {
    const { hecho, total } = this.progreso();
    return total > 0 ? Math.round((hecho / total) * 100) : 0;
  });
  protected readonly rango = computed(() => {
    const fechas = this.filas().map((f) => f.fecha).sort();
    return { desde: fechas[0] ?? '', hasta: fechas[fechas.length - 1] ?? '' };
  });

  protected clave = (c: { nombre: string; kind: string }) => `${c.nombre}|${c.kind}`;

  protected async elegir(evento: Event): Promise<void> {
    const entrada = evento.target as HTMLInputElement;
    const archivo = entrada.files?.[0];
    entrada.value = '';
    if (!archivo) return;
    this.paso.set('leyendo');
    try {
      const parseo = await parsearMonefy(await archivo.text());
      if (!parseo.filas.length) {
        throw new Error('No se encontraron movimientos válidos. ¿Es el CSV exportado de Monefy?');
      }
      await Promise.all([this.accounts.load(), this.categories.load()]);
      const fechas = parseo.filas.map((f) => f.fecha).sort();
      const existentes = await this.importer.hashesExistentes(fechas[0], fechas[fechas.length - 1]);
      const plan = planificarImportacion(parseo.filas, this.accounts.items(), this.categories.items(), existentes);

      this.tipos.set(Object.fromEntries(plan.cuentasFaltantes.map((c) => [c, /efectivo/i.test(c) ? 'cash' : 'savings'])));
      this.bolsas.set(Object.fromEntries(plan.categoriasFaltantes.filter((c) => c.kind === 'expense').map((c) => [this.clave(c), 'gustos' as Bucket])));
      this.comoPrestamo.set(new Set());
      this.archivo.set(archivo.name);
      this.parseo.set(parseo);
      this.plan.set(plan);
      this.paso.set('vista');
    } catch (e) {
      this.snackBar.open((e as Error).message, 'Cerrar', { duration: 7000 });
      this.paso.set('inicio');
    }
  }

  protected fijarTipo(cuenta: string, tipo: AccountType): void {
    this.tipos.update((t) => ({ ...t, [cuenta]: tipo }));
  }

  protected fijarBolsa(c: { nombre: string; kind: string }, bolsa: Bucket): void {
    this.bolsas.update((b) => ({ ...b, [this.clave(c)]: bolsa }));
  }

  protected marcarPrestamo(hash: string, marcado: boolean): void {
    this.comoPrestamo.update((s) => {
      const copia = new Set(s);
      if (marcado) copia.add(hash);
      else copia.delete(hash);
      return copia;
    });
  }

  protected async importar(): Promise<void> {
    const plan = this.plan();
    if (!plan) return;
    this.paso.set('importando');
    this.progreso.set({ hecho: 0, total: plan.nuevas.length });
    try {
      const resumen = await this.importer.importar(
        plan.nuevas,
        {
          cuentas: plan.cuentasFaltantes.map((nombre) => ({ nombre, type: this.tipos()[nombre] })),
          categorias: plan.categoriasFaltantes.map((c) => ({
            nombre: c.nombre,
            kind: c.kind,
            bucket: c.kind === 'expense' ? (this.bolsas()[this.clave(c)] ?? 'gustos') : null,
          })),
        },
        this.comoPrestamo(),
        (hecho, total) => this.progreso.set({ hecho, total }),
      );
      this.resumen.set(resumen);
      this.paso.set('listo');
    } catch (e) {
      this.snackBar.open(`${(e as Error).message} Puedes volver a intentarlo: lo ya guardado no se duplica.`, 'Cerrar', { duration: 9000 });
      this.paso.set('vista');
    }
  }

  protected reiniciar(): void {
    this.parseo.set(null);
    this.plan.set(null);
    this.resumen.set(null);
    this.paso.set('inicio');
  }
}
