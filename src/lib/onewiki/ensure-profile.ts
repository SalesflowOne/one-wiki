import type { User } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/lore/supabase';
import { activateOneWikiApp } from './activation';
import { fetchOneIdHandle, oneIdFromUserMetadata } from './oneid';

export async function ensureOneWikiProfile(user: User, workspaceId?: string | null): Promise<void> {
  const oneId = oneIdFromUserMetadata(user) ?? (await fetchOneIdHandle(user.id));
  const sb = getSupabase();

  const { error } = await sb.from('onewiki_profiles').upsert(
    {
      user_id: user.id,
      email: user.email ?? null,
      display_name:
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        user.user_metadata?.display_name ??
        null,
      avatar_url: user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
      one_id: oneId,
      workspace_id: workspaceId ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (error) console.warn('[onewiki] profile upsert', error.message);

  await activateOneWikiApp(user.id);
}
