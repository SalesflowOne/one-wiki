import { getSupabase } from '@/lib/lore/supabase';

export function oneIdFromUserMetadata(user: { user_metadata?: Record<string, unknown> }): string | null {
  const raw = user.user_metadata?.one_id;
  return typeof raw === 'string' && raw.length > 0 ? raw : null;
}

export function formatOneId(handle: string | null | undefined): string | null {
  if (!handle) return null;
  const normalized = handle.replace(/^@/, '').toLowerCase();
  return normalized ? `@${normalized}` : null;
}

export async function fetchOneIdHandle(userId: string): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from('one_id_profiles')
    .select('one_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.warn('[onewiki] one_id lookup failed', error.message);
    return null;
  }

  return data?.one_id ?? null;
}
