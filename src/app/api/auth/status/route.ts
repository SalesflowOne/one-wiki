import { NextResponse } from 'next/server';

export async function GET() {
  const enabled = process.env.LORE_AUTH_MODE === 'true' || process.env.LORE_AUTH_MODE === '1';
  return NextResponse.json({ auth_mode: enabled });
}
