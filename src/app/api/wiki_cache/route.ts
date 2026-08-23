import { NextRequest, NextResponse } from 'next/server';
import { getWikiCache, saveWikiCache, deleteWikiCache } from '@/lib/lore/wiki-cache';
import { normalizeLanguage } from '@/lib/lore/config';

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const owner = sp.get('owner');
    const repo = sp.get('repo');
    const repo_type = sp.get('repo_type');
    const language = normalizeLanguage(sp.get('language') || undefined);

    if (!owner || !repo || !repo_type) {
      return NextResponse.json({ error: 'Missing required query params' }, { status: 400 });
    }

    const cache = await getWikiCache(owner, repo, repo_type, language);
    return NextResponse.json(cache);
  } catch (error) {
    console.error('GET /api/wiki_cache', error);
    return NextResponse.json(null);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const repo = body.repo;
    if (!repo?.owner || !repo?.repo || !repo?.type) {
      return NextResponse.json({ error: 'Invalid cache payload' }, { status: 400 });
    }
    await saveWikiCache(repo.owner, repo.repo, repo.type, body.language || 'en', {
      wiki_structure: body.wiki_structure,
      generated_pages: body.generated_pages,
      repo_url: repo.repoUrl,
      repo,
      provider: body.provider,
      model: body.model,
    });
    return NextResponse.json({ message: 'saved' });
  } catch (error) {
    console.error('POST /api/wiki_cache', error);
    return NextResponse.json({ error: 'Failed to save cache' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const owner = sp.get('owner');
    const repo = sp.get('repo');
    const repo_type = sp.get('repo_type');
    const language = normalizeLanguage(sp.get('language') || undefined);

    if (!owner || !repo || !repo_type) {
      return NextResponse.json({ error: 'Missing required query params' }, { status: 400 });
    }

    const deleted = await deleteWikiCache(owner, repo, repo_type, language);
    if (!deleted) {
      return NextResponse.json({ detail: 'Wiki cache not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'deleted' });
  } catch (error) {
    console.error('DELETE /api/wiki_cache', error);
    return NextResponse.json({ error: 'Failed to delete cache' }, { status: 500 });
  }
}
