import { getSupabase } from './supabase';
import type { ProcessedProjectEntry, WikiCacheData, WikiTaskSummary } from './types';
import { repoKey } from './types';

export async function getWikiCache(
  owner: string,
  repo: string,
  repoType: string,
  language: string,
): Promise<WikiCacheData | null> {
  const sb = getSupabase();
  const id = repoKey(owner, repo, repoType, language);
  const { data, error } = await sb
    .from('lore_wiki_caches')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  return {
    wiki_structure: data.wiki_structure,
    generated_pages: data.generated_pages,
    repo_url: data.repo_url,
    repo: {
      owner: data.owner,
      repo: data.repo,
      type: data.repo_type,
      repoUrl: data.repo_url,
    },
    provider: data.provider,
    model: data.model,
  };
}

export async function saveWikiCache(
  owner: string,
  repo: string,
  repoType: string,
  language: string,
  cache: WikiCacheData,
): Promise<void> {
  const sb = getSupabase();
  const id = repoKey(owner, repo, repoType, language);
  const now = Date.now();
  await sb.from('lore_wiki_caches').upsert({
    id,
    owner,
    repo,
    repo_type: repoType,
    language,
    repo_url: cache.repo_url,
    provider: cache.provider,
    model: cache.model,
    wiki_structure: cache.wiki_structure,
    generated_pages: cache.generated_pages,
    submitted_at: now,
    updated_at: new Date().toISOString(),
  });
}

export async function deleteWikiCache(
  owner: string,
  repo: string,
  repoType: string,
  language: string,
): Promise<boolean> {
  const sb = getSupabase();
  const id = repoKey(owner, repo, repoType, language);
  const { error } = await sb.from('lore_wiki_caches').delete().eq('id', id);
  return !error;
}

export async function listWikiCaches(): Promise<WikiTaskSummary[]> {
  const sb = getSupabase();
  const { data } = await sb
    .from('lore_wiki_caches')
    .select('*')
    .order('submitted_at', { ascending: false });
  return (data || []).map((row) => ({
    id: row.id,
    owner: row.owner,
    repo: row.repo,
    repo_type: row.repo_type,
    language: row.language,
    status: 'completed',
    pages_done: Object.keys(row.generated_pages || {}).length,
    pages_total: (row.wiki_structure?.pages || []).length,
    current_page_ids: [],
    submitted_at: row.submitted_at,
    name: `${row.owner}/${row.repo}`,
  }));
}

export async function listProcessedProjects(): Promise<ProcessedProjectEntry[]> {
  const sb = getSupabase();
  const { data } = await sb
    .from('lore_wiki_caches')
    .select('*')
    .order('submitted_at', { ascending: false });
  return (data || []).map((row) => ({
    id: row.id,
    owner: row.owner,
    repo: row.repo,
    name: `${row.owner}/${row.repo}`,
    repo_type: row.repo_type,
    submittedAt: row.submitted_at,
    language: row.language,
  }));
}

export function wikiCacheExists(
  owner: string,
  repo: string,
  repoType: string,
  language: string,
): Promise<boolean> {
  return getWikiCache(owner, repo, repoType, language).then((c) => c !== null);
}
