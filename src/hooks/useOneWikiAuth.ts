'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import {
  activateOneWikiSession,
  formatAuthLabel,
  formatWorkspaceLabel,
  getSupabaseClientOrNull,
  readWorkspaceId,
  signOutOneWiki,
  type OneWikiAuthState,
} from '@/lib/onewiki/auth-client';

const initialState: OneWikiAuthState = {
  configured: false,
  loading: true,
  session: null,
  user: null,
  workspaceId: null,
  displayLabel: null,
};

export function useOneWikiAuth() {
  const [state, setState] = useState<OneWikiAuthState>(initialState);

  const applySession = useCallback((session: Session | null) => {
    const workspaceId = readWorkspaceId();
    const user = session?.user ?? null;
    setState({
      configured: true,
      loading: false,
      session,
      user,
      workspaceId,
      displayLabel: formatAuthLabel(user, workspaceId),
    });
  }, []);

  useEffect(() => {
    const supabase = getSupabaseClientOrNull();
    if (!supabase) {
      setState({
        configured: false,
        loading: false,
        session: null,
        user: null,
        workspaceId: readWorkspaceId(),
        displayLabel: null,
      });
      return;
    }

    let cancelled = false;

    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      applySession(data.session);
      if (data.session) {
        void activateOneWikiSession(data.session, readWorkspaceId());
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      applySession(session);
      if (session) {
        void activateOneWikiSession(session, readWorkspaceId());
      }
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [applySession]);

  const signOut = useCallback(async () => {
    await signOutOneWiki();
    setState({
      configured: getSupabaseClientOrNull() !== null,
      loading: false,
      session: null,
      user: null,
      workspaceId: null,
      displayLabel: null,
    });
  }, []);

  return {
    ...state,
    workspaceLabel: formatWorkspaceLabel(state.workspaceId),
    signOut,
  };
}
