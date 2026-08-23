'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getBrowserSupabase } from '@/lib/onewiki/supabase-browser';
import { WORKSPACE_STORAGE_KEY } from '@/lib/onewiki/constants';

const ERROR_MESSAGES: Record<string, string> = {
  missing_launch_token: 'Missing launch token. Open One Wiki from the OWeb App Store.',
  invalid_launch_token: 'This sign-in link is invalid or expired.',
  launch_token_consumed: 'This sign-in link was already used.',
  launch_token_expired: 'This sign-in link has expired.',
  launch_token_wrong_app: 'This sign-in link is for a different app.',
};

export default function SsoPage() {
  const searchParams = useSearchParams();
  const launchToken = searchParams.get('launch_token') || '';
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!launchToken) {
      setError(ERROR_MESSAGES.missing_launch_token);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch('/api/sso/redeem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ launchToken }),
        });

        const payload = (await response.json()) as {
          error?: string;
          accessToken?: string;
          refreshToken?: string | null;
          orgId?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error || 'sso_failed');
        }

        if (cancelled) return;

        const supabase = getBrowserSupabase();
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: payload.accessToken!,
          refresh_token: payload.refreshToken ?? '',
        });

        if (sessionError) throw sessionError;

        if (payload.orgId && typeof window !== 'undefined') {
          window.localStorage.setItem(WORKSPACE_STORAGE_KEY, payload.orgId);
        }

        window.location.assign('/');
      } catch (err) {
        if (cancelled) return;
        const code = err instanceof Error ? err.message : 'sso_failed';
        setError(ERROR_MESSAGES[code] || 'Could not complete sign-in from OWeb.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [launchToken]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        {error ? (
          <>
            <h1 className="text-2xl font-semibold">Could not sign you in</h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{error}</p>
            <Link href="/login" className="mt-4 inline-block text-sm text-purple-600 hover:underline">
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold">Signing you in…</h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Completing secure handoff from OWeb.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
