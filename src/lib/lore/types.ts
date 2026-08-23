export type TaskStatus =
  | 'pending'
  | 'indexing'
  | 'determining_structure'
  | 'generating'
  | 'completed'
  | 'failed';

export interface WikiPage {
  id: string;
  title: string;
  content: string;
  filePaths: string[];
  importance: string;
  relatedPages: string[];
}

export interface WikiSection {
  id: string;
  title: string;
  pages: string[];
  subsections?: string[] | null;
}

export interface WikiStructure {
  id: string;
  title: string;
  description: string;
  pages: WikiPage[];
  sections?: WikiSection[] | null;
  rootSections?: string[] | null;
}

export interface WikiCacheData {
  wiki_structure: WikiStructure;
  generated_pages: Record<string, WikiPage>;
  repo_url?: string | null;
  repo?: {
    owner: string;
    repo: string;
    type: string;
    repoUrl?: string;
    token?: string | null;
  } | null;
  provider?: string | null;
  model?: string | null;
}

export interface WikiTaskRequest {
  repo_url: string;
  type: string;
  owner: string;
  repo: string;
  comprehensive?: boolean;
  token?: string;
  provider?: string;
  model?: string;
  language?: string;
  excluded_dirs?: string;
  excluded_files?: string;
  included_dirs?: string;
  included_files?: string;
}

export interface WikiTaskSummary {
  id: string;
  owner: string;
  repo: string;
  repo_type: string;
  language: string;
  status: TaskStatus | string;
  pages_done: number;
  pages_total: number;
  current_page_ids: string[];
  error?: string | null;
  submitted_at: number;
  name: string;
}

export interface WikiTaskStatus extends WikiTaskSummary {
  wiki_structure?: WikiStructure | null;
}

export interface WikiTaskSubmitResult {
  task_id: string;
  status: TaskStatus | string;
  created?: boolean;
  joined?: boolean;
  from_cache?: boolean;
}

export interface ProcessedProjectEntry {
  id: string;
  owner: string;
  repo: string;
  name: string;
  repo_type: string;
  submittedAt: number;
  language: string;
}

export function repoKey(owner: string, repo: string, repoType: string, language: string): string {
  return `${repoType}_${owner}_${repo}_${language}`;
}
