export const ONEWIKI_APP_ID = 'onewiki' as const;

export const ONEWIKI_ACTIVATION_KIND = 'session' as const;

export const AUTH_STORAGE_KEY = 'ao-supabase-auth';

export const WORKSPACE_STORAGE_KEY = 'onewiki-workspace-id';

export const ONEWIKI_DEFAULT_PUBLIC_URL = 'https://deepwiki-open-oweb.vercel.app';

export function getOwebAppUrl(): string {
  return (process.env.NEXT_PUBLIC_OWEB_APP_URL || 'https://oweb.one').replace(/\/$/, '');
}

export function getOneWikiPublicUrl(): string {
  return (process.env.NEXT_PUBLIC_ONEWIKI_PUBLIC_URL || ONEWIKI_DEFAULT_PUBLIC_URL).replace(/\/$/, '');
}

export function owebLoginUrl(options?: { launch?: boolean }): string {
  const url = new URL('/login', getOwebAppUrl());
  if (options?.launch) url.searchParams.set('launch', ONEWIKI_APP_ID);
  return url.toString();
}

export function owebOnboardingUrl(): string {
  const url = new URL('/onboarding', getOwebAppUrl());
  url.searchParams.set('launch', ONEWIKI_APP_ID);
  return url.toString();
}

export function isAuthRequired(): boolean {
  const flag =
    process.env.NEXT_PUBLIC_ONEWIKI_REQUIRE_AUTH ||
    process.env.ONEWIKI_REQUIRE_AUTH ||
    process.env.LORE_AUTH_MODE;
  return flag === 'true' || flag === '1';
}
