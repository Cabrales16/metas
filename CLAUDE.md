# Metas — App personal de finanzas

App personal (un solo usuario: Andrés) para registrar ingresos y gastos, controlar un presupuesto 50/20/20/10, seguir metas de ahorro (ej. una moto), CDTs y préstamos por cobrar. Debe funcionar como **PWA instalable** en PC y celular, con datos **sincronizados vía Supabase**, desplegada en **GitHub Pages**.

Idioma de la UI: **español (Colombia)**. Moneda: **COP sin decimales**. Zona horaria: **America/Bogota**.

---

## 1. Forma de trabajar (preferencias del usuario — obligatorias)

- Antes de cada cambio, explica brevemente qué vas a hacer y por qué.
- Si hay ambigüedad importante, pregunta antes de asumir.
- No cambies nombres existentes sin necesidad, no agregues lógica no pedida, no elimines funcionalidad.
- Si algo puede romper otra parte, adviértelo primero.
- Ante varias opciones, elige la más estable para producción y explica el porqué.
- Señala problemas ocultos que detectes aunque no se hayan mencionado.
- UI/UX: alineación, jerarquía y consistencia visual cuidadas. Nada improvisado.
- Rendimiento: evita consultas innecesarias; agrupa lecturas; no hagas N+1 contra Supabase.
- Trabaja **módulo por módulo** (sección 9). Al terminar cada uno: compila, prueba en el navegador, haz commit (Conventional Commits en español) y resume qué quedó.

---

## 2. Stack

- **Angular** (versión estable más reciente), componentes **standalone**, **signals**, control flow nuevo (`@if`, `@for`), `inject()`.
- **Sin SSR** (sitio estático para GitHub Pages).
- **Angular Material (M3)** para UI consistente. Mobile-first: bottom navigation en móvil, side nav en escritorio.
- **@supabase/supabase-js** v2.
- **@angular/pwa** (service worker + manifest).
- **PapaParse** para leer el CSV de Monefy (tiene comas dentro de campos entre comillas; no parsear con `split(',')`).
- Formularios: **Reactive Forms** tipados.

---

## 3. Supabase (ya creado — NO recrear el esquema)

```
SUPABASE_URL=https://igyuymbguwrlznknrkel.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_uBKuH_xE5nmnsGLXofXLjg_OyyZTFQC
```

- La publishable key va en `src/environments/environment.ts` (es pública por diseño; la seguridad la da RLS).
- **Nunca** usar ni commitear la `service_role` key.
- Todas las tablas tienen RLS: `auth.uid() = user_id`. `user_id` tiene `default auth.uid()`, así que **no enviar `user_id` en los inserts**.
- Al crear el usuario, un trigger crea automáticamente: cuentas "Efectivo" y "Banco", categorías tipo Monefy con su bolsa, y reglas 50/20/20/10.
- Login: email + contraseña (el usuario se crea manualmente en el panel; los registros públicos estarán desactivados). **No construir pantalla de registro.**
- Si necesitas cambiar el esquema, propón la migración SQL y espera confirmación.

### Esquema (resumen)

Enums: `account_type` (cash, savings, checking, wallet, investment) · `tx_kind` (income, expense, transfer) · `budget_bucket` (ahorro, fijos, gustos, regalos) · `payout_frequency` (monthly, quarterly, semiannual, at_maturity) · `investment_status` (active, matured, cancelled) · `receivable_status` (pending, partial, paid, written_off).

| Tabla | Columnas relevantes |
|---|---|
| `accounts` | id, name (único por usuario), type, color, is_archived |
| `categories` | id, name, kind (income/expense), bucket (obligatorio si expense), icon (Material Symbols), color, is_archived |
| `transactions` | id, account_id, to_account_id, category_id, kind, amount (bigint > 0, siempre positivo), occurred_on (date), description, source ('manual'/'monefy'), import_hash (único por usuario) |
| `budget_rules` | bucket, percent, valid_from (date) — vigente = la más reciente con valid_from ≤ mes consultado |
| `goals` | name, target_amount, target_date, is_completed |
| `goal_contributions` | goal_id, transaction_id (opcional), amount (negativo = retiro), contributed_on, note |
| `investments` | account_id, entity, product ('CDT'), principal, rate_ea (0.1250 = 12,50%), start_on, end_on, payout_frequency, withholding_rate (0.04), status, notes |
| `receivables` | person, amount, lent_on, due_on, status, notes |
| `receivable_payments` | receivable_id, amount, paid_on |
| vista `monthly_summary` | user_id, month, bucket, kind, total (security_invoker, respeta RLS) |

Reglas de `transactions` (CHECK en BD):
- `transfer` → requiere `to_account_id` ≠ `account_id` y `category_id` nulo.
- `income`/`expense` → requiere `category_id` y `to_account_id` nulo.
- El signo lo da `kind`, **no** el monto.

Genera los tipos con `supabase gen types typescript --project-id igyuymbguwrlznknrkel` (o el MCP de Supabase si está disponible) y úsalos en los servicios.

---

## 4. Reglas de negocio

**Saldo por cuenta** = ingresos + transferencias entrantes − gastos − transferencias salientes.

**Presupuesto mensual (50/20/20/10):**
- Base = ingresos del mes (`kind = income`).
- Asignado por bolsa = base × percent de la regla vigente.
- Gastado en fijos/gustos/regalos = suma de gastos cuyas categorías pertenecen a esa bolsa.
- Ahorro real = ingresos − gastos de todas las bolsas. Mostrar vs. la meta del 50%.
- Mostrar barras de progreso por bolsa con estado (ok / cerca del límite ≥ 85% / excedido).

**CDT:**
- Interés mensual bruto = `principal × ((1 + rate_ea)^(1/12) − 1)`; neto = bruto × (1 − withholding_rate).
- Para otras periodicidades usar el exponente correspondiente (1/4, 1/2, o días/365 al vencimiento).
- Mostrar días al vencimiento y alerta cuando falten ≤ 15 días ("revisa la tasa antes de renovar").

**Préstamos por cobrar:** saldo pendiente = amount − suma de pagos. Estado se recalcula al registrar pagos (pending → partial → paid).

**Metas:** progreso = suma de contributions / target_amount. Si hay target_date, mostrar cuánto ahorrar al mes para llegar.

---

## 5. Importador del CSV de Monefy

Formato real (cabecera con columna `currency` duplicada):

```
date,account,category,amount,currency,converted amount,currency,description
27/02/2026,Efectivo,Salario,"1,677,679",COP,"1,677,679",COP,Pago nómina Oxohotel
27/02/2026,Efectivo,Restaurante,"-84,900",COP,"-84,900",COP,Invite a mi mamá...
```

- Parsear con PapaParse usando `header: false` (por la columna duplicada) y mapear por índice.
- Fecha `dd/MM/yyyy` → `yyyy-MM-dd`.
- Monto: quitar separadores de miles (`,`), signo negativo = expense, positivo = income; guardar valor absoluto.
- `account`: buscar por nombre; si no existe, ofrecer crearla.
- `category`: mapear por nombre + kind; si no existe, ofrecer crearla eligiendo bolsa.
- Descripción vacía es válida.
- **`import_hash`** = SHA-256 de `fecha|cuenta|categoría|monto_con_signo|descripción|n`, donde `n` es el índice de ocurrencia de esa misma combinación dentro del archivo. **Importante:** el CSV real tiene filas idénticas legítimas (ej. dos "Recibí pago de Spotify grupal" de 7.625 el 09/10/2026); sin `n` la segunda se perdería por el UNIQUE.
- Insertar con `upsert(..., { onConflict: 'user_id,import_hash', ignoreDuplicates: true })` en lotes (ej. 200) para poder reimportar sin duplicar.
- **Vista previa obligatoria** antes de importar: total de filas, nuevas vs. duplicadas, categorías/cuentas a crear.
- Sugerir como posible préstamo (no convertir automáticamente) las filas cuya descripción contenga "preste" o "presté"; el usuario decide si las mueve a `receivables`.

---

## 6. Detalles técnicos que NO se deben olvidar

- **Fechas:** `occurred_on` es `date`. Nunca hacer `new Date('2026-11-19')` para mostrar (se interpreta UTC y en Bogotá muestra el día anterior). Manejar fechas como string `yyyy-MM-dd` o construir con componentes locales.
- **Formato moneda:** `Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })`. Crear un pipe reutilizable.
- **Inputs de monto:** aceptar "50.000" o "50000"; guardar entero.
- **Consultas:** traer transacciones por rango de mes con `.gte/.lte` en `occurred_on`, con joins embebidos (`categories(name,bucket,icon,color)`, `accounts(name)`) en una sola consulta. Cachear catálogos (cuentas, categorías) en signals en memoria.
- **Sesión:** `persistSession: true`. Guard de rutas basado en la sesión; escuchar `onAuthStateChange`.
- **Errores:** mostrar mensajes claros en español (snackbar); nunca tragarse errores de Supabase.

---

## 7. GitHub Pages

- Repo: **`metas`** → URL `https://<usuario>.github.io/metas/`.
- Usar **`withHashLocation()`** en el router (evita 404 al recargar rutas en Pages).
- Build: `ng build --configuration production --base-href /metas/`.
- Deploy con **GitHub Actions** (`actions/upload-pages-artifact` + `actions/deploy-pages`), publicando la carpeta `dist/metas/browser`. En el repo: Settings → Pages → Source: GitHub Actions.
- Verificar que el `manifest.webmanifest` tenga `start_url` y `scope` coherentes con `/metas/`.

## 8. PWA

- `ng add @angular/pwa`. Íconos propios (no plantilla por defecto), `name: "Metas"`, `theme_color` acorde al diseño, `display: "standalone"`.
- **No cachear** respuestas de la API de Supabase en `ngsw-config.json` (los datos deben venir siempre frescos); solo el app shell y assets.
- Usar `SwUpdate` para avisar "Hay una nueva versión — Actualizar".
- v1 requiere conexión para guardar. Si no hay red, mostrar aviso claro y deshabilitar el guardado (cola offline queda para v2).
- Instalación: escritorio vía Chrome/Edge; Android vía Chrome "Instalar app"; iPhone vía Safari → Compartir → "Agregar a inicio".

---

## 9. Plan por módulos (en este orden)

0. **Scaffold + deploy vacío:** proyecto Angular, Material, tema, layout responsive (bottom nav / side nav), workflow de Pages funcionando. Confirmar URL en vivo antes de seguir.
1. **Auth:** login email/contraseña, guard, logout, servicio Supabase singleton.
2. **Catálogos:** CRUD de cuentas y categorías (con bolsa, ícono, color, archivar).
3. **Transacciones:** lista por mes agrupada por día, filtros (cuenta, categoría, tipo), formulario rápido (alta en pocos toques en móvil), editar/eliminar, transferencias.
4. **Dashboard:** ingresos/gastos/neto del mes, saldo por cuenta, dona por categoría, comparativo últimos 6 meses.
5. **Importador Monefy** (sección 5).
6. **Presupuesto 50/20/20/10** con edición de porcentajes (nueva regla con `valid_from`).
7. **Metas** (ej. "Moto") con aportes y proyección mensual.
8. **CDTs** con cálculo de interés neto y alertas de vencimiento.
9. **Préstamos por cobrar** con pagos parciales.
10. **Pulido PWA:** íconos, manifest, SwUpdate, aviso offline, pruebas de instalación en PC y celular.

**Definición de terminado por módulo:** compila sin warnings relevantes, probado en vista móvil y escritorio, sin errores en consola, commit hecho.

---

## 10. Contexto financiero (para datos de ejemplo y textos)

- Ingreso de nómina ~$1.860.000/mes; gasto promedio ~$830.000/mes.
- Metas actuales: ahorrar para una moto; a futuro, cuota inicial de vivienda.
- Tiene ahorros en CDT/cuenta de alto rendimiento y quiere ver intereses mes a mes.