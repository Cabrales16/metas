import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { environment } from '../../environments/environment';
import { Database } from './database.types';

/** Cliente único de Supabase para toda la app. */
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient<Database> = createClient<Database>(
    environment.supabaseUrl,
    environment.supabasePublishableKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // El router usa hash (#/ruta): Supabase lo confundiría con un token de sesión.
        detectSessionInUrl: false,
      },
    },
  );
}
