import { NextRequest } from 'next/server';
import { prepareRepoIndex } from '@/lib/lore/chat';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const body = await req.json();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        send('progress', { elapsed_sec: 0 });
        await prepareRepoIndex(body);
        send('done', { ready: true });
      } catch (error) {
        send('error', { error: error instanceof Error ? error.message : 'Indexing failed' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
}
