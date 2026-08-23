import { getSupabase } from '@/lib/lore/supabase';
import { ONEWIKI_ACTIVATION_KIND, ONEWIKI_APP_ID } from './constants';

/** Record One Wiki app activation for OneID telemetry (Layer 3). */
export async function activateOneWikiApp(userId: string): Promise<void> {
  const { error } = await getSupabase().rpc('ao_upsert_app_activation', {
    p_app_id: ONEWIKI_APP_ID,
    p_user_id: userId,
    p_activation_kind: ONEWIKI_ACTIVATION_KIND,
  });

  if (error) {
    console.warn('[onewiki] app activation failed', error.message);
  }
}
