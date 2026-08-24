'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ContinueWithOWeb } from '@/components/ContinueWithOWeb';
import { useOneWikiAuth } from '@/hooks/useOneWikiAuth';
import { getOneWikiPublicUrl } from '@/lib/onewiki/constants';

const SSO_ERROR_MESSAGES: Record<string, string> = {
  missing_launch_token: 'Missing launch token. Open One Wiki from the OWeb App Store or try again from login.',
  invalid_launch_token: 'This sign-in link is invalid or expired.',
  launch_token_consumed: 'This sign-in link was already used.',
  launch_token_expired: 'This sign-in link has expired.',
  launch_token_wrong_app: 'This sign-in link is for a different app.',
  supabase_not_configured: 'One Wiki sign-in is not configured on this deployment.',
  invalid_session: 'Could not establish a session from OWeb.',
  sso_failed: 'Could not complete sign-in from OWeb.',
};

export default function LoginClient() {
  const router = useRouter();
  const { configured, loading, user } = useOneWikiAuth();
  const [ssoError, setSsoError] = useState<string | null>(null);
  const [authConfig, setAuthConfig] = useState<{
    supabase_browser_configured?: boolean;
    public_url?: string | null;
  } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.sessionStorage.getItem('onewiki-sso-error');
    if (stored) {
      setSsoError(SSO_ERROR_MESSAGES[stored] || stored);
      window.sessionStorage.removeItem('onewiki-sso-error');
    }
  }, []);

  useEffect(() => {
    void fetch('/api/auth/config')
      .then((res) => res.json())
      .then(setAuthConfig)
      .catch(() => setAuthConfig(null));
  }, []);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/');
    }
  }, [loading, user, router]);

  if (!loading && user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-sm text-gray-500">Redirecting…</p>
      </div>
    );
  }

  const publicUrl = authConfig?.public_url || getOneWikiPublicUrl();

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-2xl font-semibold">One Wiki</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Sign in with your OWeb OneID to generate and manage repository wikis.
        </p>

        {!loading && configured === false && (
          <div className="mt-4 rounded-lg border border-amber-300/40 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700/40 dark:bg-amber-950/40 dark:text-amber-100">
            Sign-in is not configured here. Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> on this deployment.
          </div>
        )}

        {ssoError && (
          <div className="mt-4 rounded-lg border border-red-300/40 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-700/40 dark:bg-red-950/40 dark:text-red-100">
            {ssoError}
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3">
          <ContinueWithOWeb className="w-full" />
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Continue without signing in
          </Link>
        </div>

        <p className="mt-6 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
          After OWeb authenticates you, you should return to{' '}
          <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">{publicUrl}/sso?launch_token=…</code>.
          If you stay on OWeb, the satellite launch handoff did not complete.
        </p>
      </div>
    </div>
  );
}
