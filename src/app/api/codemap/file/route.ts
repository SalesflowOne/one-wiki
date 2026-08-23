import { NextRequest, NextResponse } from 'next/server';
import { fetchFileContent, parseRepoUrl } from '@/lib/lore/github';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const repoUrl = sp.get('repo_url') || '';
  const path = sp.get('path') || '';
  const type = sp.get('type') || 'github';
  const token = sp.get('token') || undefined;

  if (!repoUrl || !path) {
    return NextResponse.json({ error: 'repo_url and path are required' }, { status: 400 });
  }

  const ref = parseRepoUrl(repoUrl, type);
  if (!ref) {
    return NextResponse.json({ error: 'Invalid repository URL' }, { status: 400 });
  }

  try {
    const content = await fetchFileContent({ ...ref, token }, path);
    return NextResponse.json({ path, content });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch file' },
      { status: 404 },
    );
  }
}
