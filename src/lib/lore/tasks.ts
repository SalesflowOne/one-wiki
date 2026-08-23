import { getSupabase } from './supabase';
import type { WikiTaskRequest, WikiTaskStatus, WikiTaskSubmitResult, WikiPage } from './types';
import { repoKey } from './types';
import { normalizeLanguage } from './config';
import { parseRepoUrl, fetchRepoTree, fetchMultipleFiles, fileTreeString } from './github';
import { completeText } from './llm';
import {
  buildStructurePrompt,
  buildPagePrompt,
  buildFileLinks,
  parseWikiStructure,
} from './wiki-structure';
import { saveWikiCache, wikiCacheExists } from './wiki-cache';

export async function getTask(id: string): Promise<WikiTaskStatus | null> {
  const sb = getSupabase();
  const { data } = await sb.from('lore_wiki_tasks').select('*').eq('id', id).maybeSingle();
  if (!data) return null;
  return rowToStatus(data);
}

export async function listTasks(status?: 'active' | 'completed'): Promise<WikiTaskStatus[]> {
  const sb = getSupabase();
  if (status === 'active') {
    const { data } = await sb
      .from('lore_wiki_tasks')
      .select('*')
      .not('status', 'in', '(completed,failed)')
      .order('submitted_at', { ascending: true });
    return (data || []).map(rowToStatus);
  }
  if (status === 'completed') {
    const { listWikiCaches } = await import('./wiki-cache');
    return (await listWikiCaches()) as WikiTaskStatus[];
  }
  const completed = (await import('./wiki-cache').then((m) => m.listWikiCaches())) as WikiTaskStatus[];
  const { data: active } = await sb
    .from('lore_wiki_tasks')
    .select('*')
    .not('status', 'in', '(completed,failed)')
    .order('submitted_at', { ascending: true });
  return [...completed, ...(active || []).map(rowToStatus)];
}

export async function submitTask(request: WikiTaskRequest): Promise<WikiTaskSubmitResult> {
  const language = normalizeLanguage(request.language);
  const id = repoKey(request.owner, request.repo, request.type, language);
  const sb = getSupabase();

  const { data: existing } = await sb.from('lore_wiki_tasks').select('*').eq('id', id).maybeSingle();
  if (existing && !['completed', 'failed'].includes(existing.status)) {
    return { task_id: id, status: existing.status, joined: true };
  }

  if (await wikiCacheExists(request.owner, request.repo, request.type, language)) {
    return { task_id: id, status: 'completed', from_cache: true };
  }

  const submittedAt = Date.now();
  await sb.from('lore_wiki_tasks').upsert({
    id,
    owner: request.owner,
    repo: request.repo,
    repo_type: request.type,
    language,
    status: 'pending',
    pages_done: 0,
    pages_total: 0,
    current_page_ids: [],
    request,
    submitted_at: submittedAt,
    updated_at: new Date().toISOString(),
  });

  return { task_id: id, status: 'pending', created: true };
}

export async function updateTask(id: string, patch: Partial<WikiTaskStatus>): Promise<void> {
  const sb = getSupabase();
  await sb
    .from('lore_wiki_tasks')
    .update({
      status: patch.status,
      pages_done: patch.pages_done,
      pages_total: patch.pages_total,
      current_page_ids: patch.current_page_ids,
      wiki_structure: patch.wiki_structure,
      error: patch.error,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
}

export async function runWikiGeneration(taskId: string): Promise<void> {
  const task = await getTask(taskId);
  if (!task) return;
  const request = (await getSupabase().from('lore_wiki_tasks').select('request').eq('id', taskId).single()).data
    ?.request as WikiTaskRequest;
  if (!request) return;

  try {
    const ref = parseRepoUrl(request.repo_url, request.type);
    if (!ref) throw new Error('Invalid repository URL');

    await updateTask(taskId, { status: 'indexing', pages_done: 0, pages_total: 0, current_page_ids: [] });

    const { files, readme, defaultBranch } = await fetchRepoTree(
      { ...ref, token: request.token },
      request.excluded_dirs,
      request.excluded_files,
    );

    await updateTask(taskId, { status: 'determining_structure' });

    const structureXml = await completeText(
      buildStructurePrompt(
        request.owner,
        request.repo,
        fileTreeString(files),
        readme,
        !!request.comprehensive,
        task.language,
      ),
      { provider: request.provider, model: request.model },
    );

    const structure = parseWikiStructure(structureXml, request.owner, request.repo);
    await updateTask(taskId, {
      status: 'generating',
      wiki_structure: structure,
      pages_total: structure.pages.length,
      pages_done: 0,
      current_page_ids: structure.pages[0] ? [structure.pages[0].id] : [],
    });

    const generated: Record<string, WikiPage> = {};
    for (let i = 0; i < structure.pages.length; i++) {
      const page = structure.pages[i];
      await updateTask(taskId, {
        pages_done: i,
        current_page_ids: [page.id],
      });

      const paths = page.filePaths.length ? page.filePaths : files.slice(0, 8);
      const contents = await fetchMultipleFiles({ ...ref, token: request.token }, paths, defaultBranch);
      const fileLinks = buildFileLinks(Object.keys(contents), request.repo_url, defaultBranch);
      const body = Object.entries(contents)
        .map(([path, content]) => `### ${path}\n\`\`\`\n${content.slice(0, 8000)}\n\`\`\``)
        .join('\n\n');

      const markdown = await completeText(
        buildPagePrompt(page.title, fileLinks, task.language, body),
        { provider: request.provider, model: request.model },
      );

      generated[page.id] = { ...page, content: markdown };
      await updateTask(taskId, { pages_done: i + 1 });
    }

    await saveWikiCache(request.owner, request.repo, request.type, task.language, {
      wiki_structure: structure,
      generated_pages: generated,
      repo_url: request.repo_url,
      repo: {
        owner: request.owner,
        repo: request.repo,
        type: request.type,
        repoUrl: request.repo_url,
      },
      provider: request.provider,
      model: request.model,
    });

    await updateTask(taskId, {
      status: 'completed',
      pages_done: structure.pages.length,
      pages_total: structure.pages.length,
      current_page_ids: [],
      wiki_structure: structure,
    });
  } catch (err) {
    await updateTask(taskId, {
      status: 'failed',
      error: err instanceof Error ? err.message : 'Wiki generation failed',
    });
  }
}

function rowToStatus(row: Record<string, unknown>): WikiTaskStatus {
  return {
    id: row.id as string,
    owner: row.owner as string,
    repo: row.repo as string,
    repo_type: row.repo_type as string,
    language: row.language as string,
    status: row.status as WikiTaskStatus['status'],
    pages_done: (row.pages_done as number) || 0,
    pages_total: (row.pages_total as number) || 0,
    current_page_ids: (row.current_page_ids as string[]) || [],
    wiki_structure: (row.wiki_structure as WikiTaskStatus['wiki_structure']) || null,
    error: (row.error as string) || null,
    submitted_at: row.submitted_at as number,
    name: `${row.owner}/${row.repo}`,
  };
}
