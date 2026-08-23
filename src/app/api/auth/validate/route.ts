import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const enabled = process.env.LORE_AUTH_MODE === 'true' || process.env.LORE_AUTH_MODE === '1';
  if (!enabled) {
    return NextResponse.json({ valid: true });
  }
  const body = await req.json().catch(() => ({}));
  const code = body.authorization_code || body.code;
  const expected = process.env.LORE_AUTH_CODE || '';
  if (!code || code !== expected) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }
  return NextResponse.json({ valid: true });
}
