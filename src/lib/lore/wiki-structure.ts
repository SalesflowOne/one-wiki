import type { WikiPage, WikiSection, WikiStructure } from './types';
import { languageName } from './config';

function normalizeImportance(value?: string | null): string {
  const v = (value || '').trim().toLowerCase();
  return v === 'high' || v === 'low' ? v : 'medium';
}

function extractTag(block: string, tag: string): string {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i');
  const m = block.match(re);
  return m ? m[1].trim() : '';
}

function extractAll(block: string, tag: string): string[] {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'gi');
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    const val = m[1].trim();
    if (val) out.push(val);
  }
  return out;
}

function pageFromBlock(block: string, index: number): WikiPage {
  const idMatch = block.match(/<page\s+id="([^"]+)"/i);
  return {
    id: idMatch?.[1] || `page-${index + 1}`,
    title: extractTag(block, 'title'),
    content: '',
    filePaths: extractAll(block, 'file_path'),
    importance: normalizeImportance(extractTag(block, 'importance')),
    relatedPages: extractAll(block, 'related'),
  };
}

function pagesViaRegex(xml: string): WikiPage[] {
  const blocks = xml.match(/<page\b[\s\S]*?<\/page>/gi) || [];
  return blocks.map((block, i) => pageFromBlock(block, i));
}

export function parseWikiStructure(xml: string, owner: string, repo: string): WikiStructure {
  const cleaned = xml.replace(/```xml/gi, '').replace(/```/g, '').trim();
  const title = extractTag(cleaned, 'title') || `${owner}/${repo} Wiki`;
  const description = extractTag(cleaned, 'description') || '';
  const pages = pagesViaRegex(cleaned);

  const sections: WikiSection[] = [];
  const sectionBlocks = cleaned.match(/<section\b[\s\S]*?<\/section>/gi) || [];
  for (const [i, block] of sectionBlocks.entries()) {
    const idMatch = block.match(/<section\s+id="([^"]+)"/i);
    sections.push({
      id: idMatch?.[1] || `section-${i + 1}`,
      title: extractTag(block, 'title'),
      pages: extractAll(block, 'page_ref'),
      subsections: extractAll(block, 'section_ref'),
    });
  }

  return {
    id: `${owner}-${repo}-wiki`,
    title,
    description,
    pages,
    sections: sections.length ? sections : null,
    rootSections: sections.length ? sections.map((s) => s.id) : null,
  };
}

const COMPREHENSIVE_STRUCTURE = `
Create a structured wiki with sections such as Overview, Architecture, Core Features, Data Flow, and Deployment.
Return 8-12 pages.
`;

const CONCISE_STRUCTURE = `
Return 4-6 focused pages covering the most important aspects of the repository.
`;

export function buildStructurePrompt(
  owner: string,
  repo: string,
  fileTree: string,
  readme: string,
  comprehensive: boolean,
  language: string,
): string {
  const structureFormat = comprehensive ? COMPREHENSIVE_STRUCTURE : CONCISE_STRUCTURE;
  return `Analyze this GitHub repository ${owner}/${repo} and create a wiki structure.

<file_tree>
${fileTree}
</file_tree>

<readme>
${readme.slice(0, 12000)}
</readme>

Generate wiki content in ${languageName(language)}.

${structureFormat}

Return ONLY valid XML using this shape:
<wiki_structure>
  <title>...</title>
  <description>...</description>
  <pages>
    <page id="page-1">
      <title>...</title>
      <description>...</description>
      <importance>high|medium|low</importance>
      <relevant_files>
        <file_path>path/to/file</file_path>
      </relevant_files>
      <related_pages>
        <related>page-2</related>
      </related_pages>
    </page>
  </pages>
</wiki_structure>

No markdown fences. Start with <wiki_structure> and end with </wiki_structure>.`;
}

export function buildPagePrompt(
  title: string,
  fileLinks: string,
  language: string,
  fileContents: string,
): string {
  return `You are One Wiki, an expert technical writer. Generate a comprehensive wiki page in Markdown.

Topic: ${title}
Language: ${languageName(language)}

Relevant source files:
${fileLinks}

Source file contents:
${fileContents.slice(0, 48000)}

Requirements:
- Start with a <details> block listing all relevant source files (at least 3)
- Then use # ${title} as the H1
- Use Mermaid diagrams where helpful (graph TD, sequenceDiagram)
- Cite sources as Sources: [path/to/file:line]() at paragraph ends
- Ground every claim in the provided files only

Return Markdown only.`;
}

export function buildFileLinks(paths: string[], repoUrl: string, branch: string): string {
  return paths
    .map((p) => `- [${p}](${repoUrl}/blob/${branch}/${p})`)
    .join('\n');
}
