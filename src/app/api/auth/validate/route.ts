import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const flag =
    process.env.NEXT_PUBLIC_ONEWIKI_REQUIRE_AUTH ||
    process.env.ONEWIKI_REQUIRE_AUTH ||
    process.env.LORE_AUTH_MODE;
  const enabled = flag === 'true' || flag === '1';
  if (!enabled) {
    return NextResponse.json({ valid: true, success: true });
  }
  const body = await req.json().catch(() => ({}));
  const code = body.authorization_code || body.code;
  const expected = process.env.ONEWIKI_AUTH_CODE || process.env.LORE_AUTH_CODE || '';
  if (!code || code !== expected) {
    return NextResponse.json({ valid: false, success: false }, { status: 401 });
  }
  return NextResponse.json({ valid: true, success: true });
}
