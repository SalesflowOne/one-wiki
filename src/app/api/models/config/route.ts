import { NextResponse } from 'next/server';
import { generatorConfig } from '@/lib/lore/config';

export async function GET() {
  return NextResponse.json(generatorConfig);
}
