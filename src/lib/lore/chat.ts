import type { RepoRef } from './github';
import { fetchRepoTree, fetchMultipleFiles, fetchFileContent } from './github';
import { streamText, type LlmMessage } from './llm';
import { getWikiCache } from './wiki-cache';

export interface ChatRequest {
  repo_url: string;
  type: string;
  owner?: string;
  repo?: string;
  messages: { role: string; content: string; mode?: string }[];
  token?: string;
  provider?: string;
  model?: string;
  language?: string;
  research_iteration?: number;
  excluded_dirs?: string;
  excluded_files?: string;
}

function pickRelevantFiles(files: string[], question: string, limit = 8): string[] {
  const terms = question.toLowerCase().split(/\W+/).filter((t) => t.length > 3);
  const scored = files.map((path) => {
    const lower = path.toLowerCase();
    const score = terms.reduce((acc, term) => acc + (lower.includes(term) ? 1 : 0), 0);
    return { path, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const hits = scored.filter((s) => s.score > 0).slice(0, limit).map((s) => s.path);
  if (hits.length >= 3) return hits;
  return files.slice(0, limit);
}

export async function* researchChatStream(request: ChatRequest): AsyncGenerator<string> {
  const last = request.messages[request.messages.length - 1];
  if (!last || last.role !== 'user') {
    yield 'Error: Last message must be from the user';
    return;
  }

  const owner = request.owner || '';
  const repo = request.repo || '';
  const ref: RepoRef = {
    owner,
    repo,
    type: request.type || 'github',
    token: request.token,
  };

  let context = '';
  const cached = owner && repo ? await getWikiCache(owner, repo, ref.type, request.language || 'en') : null;
  if (cached) {
    const pageSummaries = cached.wiki_structure.pages
      .map((p) => `## ${p.title}\n${(cached.generated_pages[p.id]?.content || '').slice(0, 1500)}`)
      .join('\n\n');
    context += `Wiki context:\n${pageSummaries.slice(0, 12000)}\n\n`;
  }

  try {
    const { files } = await fetchRepoTree(ref, request.excluded_dirs, request.excluded_files);
    const relevant = pickRelevantFiles(files, last.content);
    const contents = await fetchMultipleFiles(ref, relevant);
    context += Object.entries(contents)
      .map(([path, content]) => `File: ${path}\n${content.slice(0, 6000)}`)
      .join('\n\n');
  } catch {
    context += 'Repository files could not be loaded. Answer from wiki context only.\n';
  }

  const system: LlmMessage = {
    role: 'system',
    content:
      'You are Lore, a codebase expert for OWeb. Answer using the provided repository context. Be concise and technical.',
  };

  const user: LlmMessage = {
    role: 'user',
    content: `${context}\n\nUser question: ${last.content}`,
  };

  for await (const chunk of streamText([system, user], {
    provider: request.provider,
    model: request.model,
  })) {
    yield chunk;
  }
}

export async function prepareRepoIndex(request: ChatRequest): Promise<void> {
  const ref: RepoRef = {
    owner: request.owner || '',
    repo: request.repo || '',
    type: request.type || 'github',
    token: request.token,
  };
  const { files } = await fetchRepoTree(ref, request.excluded_dirs, request.excluded_files);
  const sb = (await import('./supabase')).getSupabase();
  const key = `${ref.type}_${ref.owner}_${ref.repo}`;
  const sample = files.slice(0, 40);
  for (const path of sample) {
    try {
      const content = await fetchFileContent(ref, path);
      await sb.from('lore_repo_files').upsert({
        repo_key: key,
        path,
        content: content.slice(0, 50000),
        updated_at: new Date().toISOString(),
      });
    } catch {
      /* skip */
    }
  }
}
