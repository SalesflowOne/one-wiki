import { NextRequest } from 'next/server';
import { completeText } from '@/lib/lore/llm';
import { fetchRepoTree, fetchMultipleFiles, parseRepoUrl } from '@/lib/lore/github';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`));
      };

      try {
        send({ type: 'phase', phase: 'analyzing', status: 'start' });
        const ref = parseRepoUrl(body.repo_url, body.type || 'github');
        if (!ref) throw new Error('Invalid repository URL');
        ref.token = body.token;
        const { files } = await fetchRepoTree(ref, body.excluded_dirs, body.excluded_files);
        const relevant = files.filter((f) =>
          body.question.toLowerCase().split(/\W+/).some((t: string) => t.length > 3 && f.toLowerCase().includes(t)),
        ).slice(0, 6);
        const picked = relevant.length ? relevant : files.slice(0, 6);
        const contents = await fetchMultipleFiles(ref, picked);
        send({ type: 'phase', phase: 'analyzing', status: 'done' });

        send({ type: 'phase', phase: 'initial_codemap', status: 'start' });
        const prompt = `Create a JSON codemap for question: ${body.question}

Repository files:
${Object.entries(contents).map(([p, c]) => `--- ${p} ---\n${c.slice(0, 4000)}`).join('\n\n')}

Return ONLY JSON with shape:
{"title":"...","summary":"...","sections":[{"id":"s1","title":"...","guide":"...","diagram":"graph TD\\nA-->B","steps":[{"id":"st1","label":"...","code":"...","citation":{"file_path":"...","start_line":1,"end_line":10,"snippet":"..."}}]}]}`;

        const raw = await completeText(prompt, { provider: body.provider, model: body.model });
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        const data = jsonMatch ? JSON.parse(jsonMatch[0]) : {
          title: 'Code map',
          summary: raw.slice(0, 500),
          sections: [],
        };
        send({ type: 'phase', phase: 'initial_codemap', status: 'done' });
        send({ type: 'phase', phase: 'diagrams', status: 'start' });
        send({ type: 'codemap', data });
        send({ type: 'phase', phase: 'diagrams', status: 'done' });
        send({ type: 'done' });
      } catch (error) {
        send({
          type: 'error',
          message: error instanceof Error ? error.message : 'Codemap generation failed',
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
    },
  });
}
