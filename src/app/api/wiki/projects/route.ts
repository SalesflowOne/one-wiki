import { NextResponse } from 'next/server';
import { listProcessedProjects } from '@/lib/lore/wiki-cache';
import { deleteWikiCache } from '@/lib/lore/wiki-cache';

export async function GET() {
  try {
    const projects = await listProcessedProjects();
    return NextResponse.json(projects);
  } catch (error) {
    console.error('GET /api/wiki/projects', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list projects' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { owner, repo, repo_type, language } = body;
    if (!owner || !repo || !repo_type || !language) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    await deleteWikiCache(owner, repo, repo_type, language);
    return NextResponse.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('DELETE /api/wiki/projects', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
