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

Merged via PR on `SalesflowOne/OWeb` branch `cursor/onewiki-ecosystem-0ad3`:
- `src/lib/ecosystem-apps.ts` — `onewiki` app catalog entry
- `src/lib/ecosystem.functions.ts` — `onewiki` in `mintEcosystemLaunch` enum

## Database

Migration applied on One OS (`ebjzdcnphkfpxfldnatm`): `onewiki_profiles` table with RLS.

## Env on Vercel

Copy from oweb project: Supabase keys, `OPENAI_API_KEY`. Set `NEXT_PUBLIC_SUPABASE_URL` to `https://auth.oweb.one` for shared cookie/session when on `*.oweb.one`.
