'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ContinueWithOWeb } from '@/components/ContinueWithOWeb';
import { useOneWikiAuth } from '@/hooks/useOneWikiAuth';
import {
  activateOneWikiSession,
  getSupabaseClientOrNull,
} from '@/lib/onewiki/auth-client';
import { getOneWikiPublicUrl, owebOnboardingUrl } from '@/lib/onewiki/constants';

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

async function userHasWorkspace(userId: string): Promise<boolean> {
  const supabase = getSupabaseClientOrNull();
  if (!supabase) return false;
  const { count, error } = await supabase
    .from('ao_org_members')
    .select('org_id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('left_at', null);
  if (error) {
    console.warn('[onewiki] workspace check failed', error.message);
    return false;
  }
  return (count ?? 0) > 0;
}

export default function LoginClient() {
  const router = useRouter();
  const { configured, loading, user } = useOneWikiAuth();
  const [ssoError, setSsoError] = useState<string | null>(null);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formInfo, setFormInfo] = useState<string | null>(null);
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

  async function handlePasswordSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;

    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setFormError('Enter a valid email address');
      return;
    }
    if (password.length < 8) {
      setFormError('Password must be at least 8 characters');
      return;
    }

    const supabase = getSupabaseClientOrNull();
    if (!supabase) {
      setFormError('Sign-in is not configured on this deployment.');
      return;
    }

    setBusy(true);
    setFormError(null);
    setFormInfo(null);

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: trimmed,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.session?.user) {
          await activateOneWikiSession(data.session);
          const hasWorkspace = await userHasWorkspace(data.session.user.id);
          if (!hasWorkspace) {
            window.location.assign(owebOnboardingUrl());
            return;
          }
          window.location.assign('/');
          return;
        }
        setFormInfo('Check your email to confirm your account, then sign in with the same password.');
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmed,
          password,
        });
        if (error) throw error;
        if (data.session?.user) {
          await activateOneWikiSession(data.session);
          const hasWorkspace = await userHasWorkspace(data.session.user.id);
          if (!hasWorkspace) {
            window.location.assign(owebOnboardingUrl());
            return;
          }
          window.location.assign('/');
        }
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setBusy(false);
    }
  }

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
          Sign in with your OWeb OneID — same email and password as oweb.one.
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
        </div>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          <span className="text-xs text-gray-500">or</span>
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
        </div>

        <form onSubmit={(event) => void handlePasswordSubmit(event)} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
              autoComplete="email"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
          </div>

          {formError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
          ) : null}
          {formInfo ? (
            <p className="text-sm text-purple-700 dark:text-purple-300">{formInfo}</p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
          >
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in with email' : 'Create account'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          {mode === 'signin' ? (
            <>
              New here?{' '}
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="font-medium text-purple-600 hover:underline dark:text-purple-400"
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="font-medium text-purple-600 hover:underline dark:text-purple-400"
              >
                Sign in
              </button>
            </>
          )}
        </p>

        <Link
          href="/"
          className="mt-6 block text-center text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          Continue without signing in
        </Link>

        <p className="mt-6 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
          After OWeb authenticates you, you should return to{' '}
          <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">{publicUrl}/sso?launch_token=…</code>.
          First-time users complete OWeb onboarding before entering One Wiki.
        </p>
      </div>
    </div>
  );
}
