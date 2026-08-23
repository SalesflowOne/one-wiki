const DEFAULT_EXCLUDED = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '__pycache__',
  '.venv',
  'venv',
  'vendor',
  'target',
  'coverage',
  '.cache',
]);

function shouldInclude(path: string, excludedDirs?: string, excludedFiles?: string): boolean {
  const parts = path.split('/');
  for (const part of parts) {
    if (part.startsWith('.') && part !== '.') return false;
    if (DEFAULT_EXCLUDED.has(part)) return false;
  }
  if (excludedDirs) {
    const dirs = excludedDirs.split(',').map((d) => d.trim()).filter(Boolean);
    if (dirs.some((d) => parts.includes(d))) return false;
  }
  if (excludedFiles) {
    const files = excludedFiles.split(',').map((f) => f.trim()).filter(Boolean);
    if (files.some((f) => path.endsWith(f) || path.includes(f))) return false;
  }
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const textExts = new Set([
    'ts', 'tsx', 'js', 'jsx', 'py', 'go', 'rs', 'java', 'kt', 'rb', 'php',
    'cs', 'cpp', 'c', 'h', 'hpp', 'swift', 'md', 'json', 'yml', 'yaml',
    'toml', 'xml', 'html', 'css', 'scss', 'sql', 'sh', 'bash', 'dockerfile',
  ]);
  return textExts.has(ext) || path.toLowerCase().includes('readme');
}

export interface RepoRef {
  owner: string;
  repo: string;
  type: string;
  token?: string;
}

export function parseRepoUrl(repoUrl: string, type: string): RepoRef | null {
  try {
    const url = new URL(repoUrl);
    const parts = url.pathname.replace(/^\/+/, '').split('/').filter(Boolean);
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1].replace(/\.git$/, ''), type };
  } catch {
    return null;
  }
}

async function githubFetch(path: string, token?: string): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'OneWiki-OWeb',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`https://api.github.com${path}`, { headers, next: { revalidate: 0 } });
}

export async function fetchDefaultBranch(ref: RepoRef): Promise<string> {
  const res = await githubFetch(`/repos/${ref.owner}/${ref.repo}`, ref.token);
  if (!res.ok) return 'main';
  const data = await res.json();
  return data.default_branch || 'main';
}

export async function fetchRepoTree(
  ref: RepoRef,
  excludedDirs?: string,
  excludedFiles?: string,
): Promise<{ files: string[]; readme: string; defaultBranch: string }> {
  const defaultBranch = await fetchDefaultBranch(ref);
  const res = await githubFetch(
    `/repos/${ref.owner}/${ref.repo}/git/trees/${defaultBranch}?recursive=1`,
    ref.token,
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch repository tree (${res.status})`);
  }
  const data = await res.json();
  const files: string[] = (data.tree || [])
    .filter((item: { type: string; path: string }) => item.type === 'blob')
    .map((item: { path: string }) => item.path)
    .filter((path: string) => shouldInclude(path, excludedDirs, excludedFiles));

  let readme = '';
  for (const candidate of ['README.md', 'readme.md', 'Readme.md', 'README.MD']) {
    if (!files.includes(candidate)) continue;
    try {
      readme = await fetchFileContent(ref, candidate, defaultBranch);
      break;
    } catch {
      /* try next */
    }
  }

  return { files, readme, defaultBranch };
}

export async function fetchFileContent(
  ref: RepoRef,
  path: string,
  branch?: string,
): Promise<string> {
  const refName = branch || (await fetchDefaultBranch(ref));
  const res = await githubFetch(
    `/repos/${ref.owner}/${ref.repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(refName)}`,
    ref.token,
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch ${path} (${res.status})`);
  }
  const data = await res.json();
  if (data.content && data.encoding === 'base64') {
    return Buffer.from(data.content, 'base64').toString('utf-8');
  }
  if (typeof data === 'string') return data;
  throw new Error(`Unexpected content format for ${path}`);
}

export async function fetchMultipleFiles(
  ref: RepoRef,
  paths: string[],
  branch?: string,
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const limited = paths.slice(0, 12);
  await Promise.all(
    limited.map(async (path) => {
      try {
        out[path] = await fetchFileContent(ref, path, branch);
      } catch {
        /* skip missing files */
      }
    }),
  );
  return out;
}

export function fileTreeString(files: string[]): string {
  return files.slice(0, 800).join('\n');
}
