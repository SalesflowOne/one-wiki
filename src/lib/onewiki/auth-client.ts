'use client';

import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { AUTH_STORAGE_KEY, WORKSPACE_STORAGE_KEY } from './constants';
import { getBrowserSupabase } from './supabase-browser';

export type OneWikiAuthState = {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  workspaceId: string | null;
  displayLabel: string | null;
};

export function getSupabaseClientOrNull(): SupabaseClient | null {
  try {
    return getBrowserSupabase();
  } catch {
    return null;
  }
}

export function readWorkspaceId(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
}

export function writeWorkspaceId(workspaceId: string | null): void {
  if (typeof window === 'undefined') return;
  if (workspaceId) {
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, workspaceId);
  } else {
    window.localStorage.removeItem(WORKSPACE_STORAGE_KEY);
  }
}

export function formatAuthLabel(user: User | null, workspaceId: string | null): string | null {
  if (!user) return null;

  const meta = user.user_metadata ?? {};
  const oneId =
    typeof meta.one_id === 'string' && meta.one_id.length > 0
      ? meta.one_id.startsWith('@')
        ? meta.one_id
        : `@${meta.one_id}`
      : null;
  const name =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    (typeof meta.display_name === 'string' && meta.display_name) ||
    user.email ||
    null;

  if (oneId && name && oneId !== name) return `${name} (${oneId})`;
  return oneId || name;
}

export function formatWorkspaceLabel(workspaceId: string | null): string | null {
  if (!workspaceId) return null;
  if (workspaceId.length <= 10) return workspaceId;
  return `${workspaceId.slice(0, 8)}…`;
}

/** Best-effort activation ping after a browser session is established. */
export async function activateOneWikiSession(
  session: Session,
  workspaceId?: string | null,
): Promise<void> {
  try {
    await fetch('/api/oneid/activate', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ workspaceId: workspaceId ?? readWorkspaceId() }),
    });
  } catch (error) {
    console.warn('[onewiki] activation failed', error);
  }
}

/** Persist a session returned by SSO redeem when setSession needs a fallback. */
export function persistSupabaseSession(
  accessToken: string,
  refreshToken: string | null,
  user: User,
): void {
  if (typeof window === 'undefined') return;

  const payload = {
    access_token: accessToken,
    refresh_token: refreshToken ?? '',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user,
  };

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
}

export async function applySsoSession(input: {
  accessToken: string;
  refreshToken?: string | null;
  orgId?: string | null;
  user?: Pick<User, 'id' | 'email' | 'user_metadata' | 'app_metadata' | 'aud' | 'created_at'> | null;
}): Promise<Session> {
  const supabase = getSupabaseClientOrNull();
  if (!supabase) {
    throw new Error('supabase_not_configured');
  }

  if (input.orgId) writeWorkspaceId(input.orgId);

  const refreshToken = input.refreshToken ?? '';
  const { data, error } = await supabase.auth.setSession({
    access_token: input.accessToken,
    refresh_token: refreshToken,
  });

  if (error || !data.session) {
    if (input.user) {
      persistSupabaseSession(
        input.accessToken,
        input.refreshToken ?? null,
        input.user as User,
      );
      const { data: retry } = await supabase.auth.getSession();
      if (retry.session) {
        await activateOneWikiSession(retry.session, input.orgId);
        return retry.session;
      }
    }
    throw error ?? new Error('invalid_session');
  }

  await activateOneWikiSession(data.session, input.orgId);
  return data.session;
}

export async function signOutOneWiki(): Promise<void> {
  writeWorkspaceId(null);
  const supabase = getSupabaseClientOrNull();
  if (supabase) {
    await supabase.auth.signOut();
  }
}
