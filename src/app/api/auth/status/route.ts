import { NextResponse } from 'next/server';

export async function GET() {
  const flag =
    process.env.NEXT_PUBLIC_ONEWIKI_REQUIRE_AUTH ||
    process.env.ONEWIKI_REQUIRE_AUTH ||
    process.env.LORE_AUTH_MODE;
  const enabled = flag === 'true' || flag === '1';
  return NextResponse.json({ auth_required: enabled, auth_mode: enabled });
}
