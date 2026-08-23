import { NextRequest } from 'next/server';
import { getTask } from '@/lib/lore/tasks';

export const maxDuration = 300;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ task_id: string }> },
) {
  const { task_id } = await params;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        while (true) {
          const task = await getTask(task_id);
          if (!task) {
            send('error', { error: 'task no longer available' });
            break;
          }

          if (task.status === 'completed') {
            send('done', task);
            break;
          }
          if (task.status === 'failed') {
            send('error', task);
            break;
          }

          send('progress', task);
          await new Promise((r) => setTimeout(r, 1500));
        }
      } catch (err) {
        send('error', { error: err instanceof Error ? err.message : 'stream error' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
