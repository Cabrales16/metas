import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-placeholder',
  template: `
    <h1>{{ titulo }}</h1>
    <p>Esta sección se construye en el módulo «{{ modulo }}».</p>
  `,
  styles: `
    :host {
      display: block;
    }
    h1 {
      margin: 0 0 8px;
      font-size: 1.75rem;
      font-weight: 600;
    }
    p {
      margin: 0;
      color: var(--app-muted);
    }
  `,
})
export class Placeholder {
  private readonly route = inject(ActivatedRoute);
  protected readonly titulo: string = this.route.snapshot.data['titulo'];
  protected readonly modulo: string = this.route.snapshot.data['modulo'];
}
