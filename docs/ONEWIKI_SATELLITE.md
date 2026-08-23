# One Wiki — OWeb Satellite Integration

> Follows `SalesflowOne/OWeb` docs: `SATELLITE_ONBOARDING_KIT.md`, `ONEID_ECOSYSTEM_MASTER_PLAN.md`

## App identity

| Field | Value |
|---|---|
| `app_id` | `onewiki` |
| Public URL | `NEXT_PUBLIC_ONEWIKI_PUBLIC_URL` |
| Table prefix (domain) | `lore_*` (wiki engine), `onewiki_profiles` (identity projection) |
| Auth storage key | `ao-supabase-auth` |

## Flows

### A) Product login (`/login`)
Primary CTA: **Continue with OWeb** → `oweb.one/login?launch=onewiki`

### B) App Store SSO (`/sso?launch_token=...`)
1. OWeb mints token in `ao_ecosystem_launch_tokens`
2. `POST /api/sso/redeem` validates + consumes token
3. Browser sets Supabase session (`ao-supabase-auth`)
4. `onewiki_profiles` upsert + `ao_upsert_app_activation`

## OWeb registration

PR: https://github.com/SalesflowOne/OWeb/pull/858 — registers `onewiki` in `ecosystem-apps.ts` and `mintEcosystemLaunch`.

## Recommended Vercel env vars (`deepwiki-open` project)

| Variable | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://auth.oweb.one` | Shared OneID session (browser) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from One OS project | Same as oweb |
| `SUPABASE_URL` | `https://ebjzdcnphkfpxfldnatm.supabase.co` | Server-side direct URL |
| `SUPABASE_SERVICE_ROLE_KEY` | from One OS project | SSO redeem + profile upsert |
| `SUPABASE_PUBLISHABLE_KEY` | from One OS project | Optional alias |
| `NEXT_PUBLIC_OWEB_APP_URL` | `https://oweb.one` | Continue with OWeb CTA |
| `NEXT_PUBLIC_ONEWIKI_PUBLIC_URL` | `https://deepwiki-open-oweb.vercel.app` | App Store launch URL |
| `OPENAI_API_KEY` | from oweb project | Default LLM provider |
| `NEXT_PUBLIC_ONEWIKI_REQUIRE_AUTH` | `false` | Set `true` to gate wiki generation |
| `GITHUB_TOKEN` | optional | Private repos / rate limits |

## Database

Migration applied on One OS (`ebjzdcnphkfpxfldnatm`): `onewiki_profiles` table with RLS.
