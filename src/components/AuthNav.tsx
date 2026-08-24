'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { owebLoginUrl } from '@/lib/onewiki/constants';
import { useOneWikiAuth } from '@/hooks/useOneWikiAuth';

export default function AuthNav() {
  const { messages } = useLanguage();
  const { configured, loading, displayLabel, workspaceLabel, user, signOut } = useOneWikiAuth();

  const signInLabel = messages.nav?.signIn || 'Sign in';
  const signOutLabel = messages.nav?.signOut || 'Sign out';
  const workspacePrefix = messages.nav?.workspace || 'Workspace';

  if (loading) {
    return <span className="text-xs text-[var(--muted)]">{messages.common?.loading || 'Loading...'}</span>;
  }

  if (!configured) {
    return (
      <Link
        href="/login"
        className="whitespace-nowrap text-xs font-medium text-[var(--accent-primary)] hover:text-[var(--highlight)] hover:underline"
        title="Sign-in is not configured on this deployment"
      >
        {signInLabel}
      </Link>
    );
  }

  if (user && displayLabel) {
    return (
      <div className="flex items-center gap-2 max-w-[240px]">
        <div className="min-w-0 text-right">
          <div className="truncate text-xs font-medium text-[var(--foreground)]" title={displayLabel}>
            {displayLabel}
          </div>
          {workspaceLabel && (
            <div className="truncate text-[10px] text-[var(--muted)]" title={workspaceLabel}>
              {workspacePrefix}: {workspaceLabel}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="shrink-0 text-[10px] font-medium text-[var(--muted)] hover:text-[var(--foreground)] underline-offset-2 hover:underline"
        >
          {signOutLabel}
        </button>
      </div>
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
