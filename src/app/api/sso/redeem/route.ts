import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { redeemEcosystemLaunchToken } from '@/lib/onewiki/sso-redeem';
import { ensureOneWikiProfile } from '@/lib/onewiki/ensure-profile';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { launchToken?: string };
    const launchToken = body.launchToken?.trim();
    if (!launchToken) {
      return NextResponse.json({ error: 'missing_launch_token' }, { status: 400 });
    }

    const result = await redeemEcosystemLaunchToken(launchToken);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      return NextResponse.json({ error: 'supabase_not_configured' }, { status: 500 });
    }

    const userClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser(result.accessToken);
    if (userError || !userData.user) {
      return NextResponse.json({ error: 'invalid_session' }, { status: 401 });
    }

    await ensureOneWikiProfile(userData.user, result.orgId);

    return NextResponse.json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      orgId: result.orgId,
      userId: result.userId,
      user: {
        id: userData.user.id,
        email: userData.user.email,
        user_metadata: userData.user.user_metadata,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'sso_redeem_failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
