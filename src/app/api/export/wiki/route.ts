import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { repo_url, pages, format } = body;
  const repoName = (repo_url || 'wiki').split('/').filter(Boolean).pop() || 'wiki';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  if (format === 'json') {
    const content = JSON.stringify(
      {
        metadata: { repository: repo_url, generated_at: new Date().toISOString(), page_count: pages?.length || 0 },
        pages,
      },
      null,
      2,
    );
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${repoName}_wiki_${timestamp}.json"`,
      },
    });
  }

  let md = `# Wiki Documentation for ${repo_url}\n\n`;
  md += `Generated on: ${new Date().toLocaleString()}\n\n`;
  for (const page of pages || []) {
    md += `## ${page.title}\n\n${page.content}\n\n---\n\n`;
  }

  return new NextResponse(md, {
    headers: {
      'Content-Type': 'text/markdown',
      'Content-Disposition': `attachment; filename="${repoName}_wiki_${timestamp}.md"`,
    },
  });
}
