import { MatDialog } from '@angular/material/dialog';

import { TxKind } from '../core/aggregates';

/** Abre el formulario de movimientos (cargado bajo demanda para no inflar el arranque). */
export async function abrirMovimiento(dialog: MatDialog, kind: TxKind = 'expense'): Promise<void> {
  const { TxDialog } = await import('../pages/movimientos/tx-dialog');
  dialog.open(TxDialog, { data: { kind }, width: '520px', maxWidth: 'calc(100vw - 24px)' });
}
