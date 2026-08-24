'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { applySsoSession } from '@/lib/onewiki/auth-client';

const ERROR_MESSAGES: Record<string, string> = {
  missing_launch_token: 'Missing launch token. Open One Wiki from the OWeb App Store.',
  invalid_launch_token: 'This sign-in link is invalid or expired.',
  launch_token_consumed: 'This sign-in link was already used.',
  launch_token_expired: 'This sign-in link has expired.',
  launch_token_wrong_app: 'This sign-in link is for a different app.',
  supabase_not_configured: 'One Wiki sign-in is not configured on this deployment.',
  invalid_session: 'Could not establish a session from OWeb.',
  sso_redeem_failed: 'Could not complete sign-in from OWeb.',
  sso_failed: 'Could not complete sign-in from OWeb.',
};

function storeSsoError(code: string) {
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem('onewiki-sso-error', code);
  }
}

export default function SsoPage() {
  const searchParams = useSearchParams();
  const launchToken = useMemo(
    () =>
      searchParams.get('launch_token') ||
      searchParams.get('launchToken') ||
      searchParams.get('token') ||
      '',
    [searchParams],
  );
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
          user?: {
            id: string;
            email?: string | null;
            user_metadata?: Record<string, unknown>;
          };
        };

        if (!response.ok) {
          throw new Error(payload.error || 'sso_failed');
        }

        if (cancelled) return;

        await applySsoSession({
          accessToken: payload.accessToken!,
          refreshToken: payload.refreshToken,
          orgId: payload.orgId,
          user: payload.user
            ? {
                id: payload.user.id,
                email: payload.user.email ?? undefined,
                user_metadata: payload.user.user_metadata ?? {},
                app_metadata: {},
                aud: 'authenticated',
                created_at: new Date().toISOString(),
              }
            : null,
        });

        window.location.assign('/');
      } catch (err) {
        if (cancelled) return;
        const code = err instanceof Error ? err.message : 'sso_failed';
        storeSsoError(code);
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
