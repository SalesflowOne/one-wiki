import { NextResponse } from 'next/server';
import { langConfig } from '@/lib/lore/config';

export async function GET() {
  return NextResponse.json(langConfig);
}
