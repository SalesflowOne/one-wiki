import { NextResponse } from 'next/server';
import { buildModelConfigResponse } from '@/lib/lore/model-config';

export async function GET() {
  return NextResponse.json(buildModelConfigResponse());
}
