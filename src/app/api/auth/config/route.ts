import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceUrl = process.env.SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  return NextResponse.json({
    supabase_browser_configured: Boolean(url && anonKey),
    supabase_server_configured: Boolean(serviceUrl && serviceKey),
    public_url: process.env.NEXT_PUBLIC_ONEWIKI_PUBLIC_URL || null,
    oweb_app_url: process.env.NEXT_PUBLIC_OWEB_APP_URL || 'https://oweb.one',
  });
}
