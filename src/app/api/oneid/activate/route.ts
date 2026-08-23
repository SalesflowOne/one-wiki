import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { activateOneWikiApp } from '@/lib/onewiki/activation';
import { ensureOneWikiProfile } from '@/lib/onewiki/ensure-profile';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ error: 'supabase_not_configured' }, { status: 500 });
  }

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let workspaceId: string | null = null;
  try {
    const body = (await request.json()) as { workspaceId?: string };
    workspaceId = body.workspaceId ?? null;
  } catch {
    // optional body
  }

  await ensureOneWikiProfile(data.user, workspaceId);
  await activateOneWikiApp(data.user.id);

  return NextResponse.json({ ok: true, app_id: 'onewiki' });
}
