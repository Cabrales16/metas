import { Pipe, PipeTransform } from '@angular/core';

import { cop } from './format';

/** {{ valor | cop }} -> $ 1.860.000 */
@Pipe({ name: 'cop' })
export class CopPipe implements PipeTransform {
  transform(valor: number | null | undefined): string {
    return valor == null ? '—' : cop(valor);
  }
}
