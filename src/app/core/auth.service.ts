import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthError, Session, isAuthRetryableFetchError } from '@supabase/supabase-js';

import { SupabaseService } from './supabase.service';

/** Convierte un error de Supabase Auth en un mensaje claro en español. */
export function traducirErrorAuth(error: AuthError): string {
  if (isAuthRetryableFetchError(error)) {
    return 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.';
  }
  switch (error.code) {
    case 'invalid_credentials':
      return 'Correo o contraseña incorrectos.';
    case 'email_not_confirmed':
      return 'Tu correo aún no está confirmado.';
    case 'over_request_rate_limit':
      return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.';
    default:
      return 'No se pudo iniciar sesión. Inténtalo de nuevo.';
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(SupabaseService).client.auth;

  private readonly _session = signal<Session | null>(null);
  private readonly _ready = signal(false);
  private resolverListo!: () => void;

  readonly session = this._session.asReadonly();
  readonly user = computed(() => this._session()?.user ?? null);
  readonly isAuthenticated = computed(() => this._session() !== null);
  /** true cuando ya se leyó la sesión guardada (evita redirigir al login por error al recargar). */
  readonly ready = this._ready.asReadonly();
  readonly whenReady = new Promise<void>((resolve) => (this.resolverListo = resolve));

  constructor() {
    // No hacer llamadas a Supabase dentro de este callback (puede bloquear el cliente).
    this.auth.onAuthStateChange((_evento, session) => this.fijarSesion(session));
    this.auth.getSession().then(({ data }) => {
      if (!this._ready()) this.fijarSesion(data.session);
    });
  }

  async signIn(email: string, password: string): Promise<void> {
    const { error } = await this.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error(traducirErrorAuth(error));
  }

  async signOut(): Promise<void> {
    const { error } = await this.auth.signOut();
    if (error) throw new Error('No se pudo cerrar la sesión. Inténtalo de nuevo.');
  }

  private fijarSesion(session: Session | null): void {
    this._session.set(session);
    this._ready.set(true);
    this.resolverListo();
  }
}
