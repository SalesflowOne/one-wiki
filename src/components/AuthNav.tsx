'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getBrowserSupabase } from '@/lib/onewiki/supabase-browser';

export default function AuthNav() {
  const { messages } = useLanguage();
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    try {
      const supabase = getBrowserSupabase();

      void supabase.auth.getSession().then(({ data }) => {
        setEmail(data.session?.user?.email ?? null);
        setReady(true);
      });

      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        setEmail(session?.user?.email ?? null);
      });
      unsubscribe = () => data.subscription.unsubscribe();
    } catch {
      setReady(true);
    }

    return () => unsubscribe?.();
  }, []);

  if (!ready) return null;

  const signInLabel = messages.nav?.signIn || 'Sign in';

  if (email) {
    return (
      <span
        className="max-w-[160px] truncate text-xs text-[var(--muted)]"
        title={email}
      >
        {email}
      </span>
    );
  }

  return (
    <Link
      href="/login"
      className="whitespace-nowrap text-xs font-medium text-[var(--accent-primary)] hover:text-[var(--highlight)] hover:underline"
    >
      {signInLabel}
    </Link>
  );
}
