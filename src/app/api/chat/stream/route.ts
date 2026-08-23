import { NextRequest, NextResponse } from 'next/server';
import { researchChatStream } from '@/lib/lore/chat';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of researchChatStream(body)) {
            controller.enqueue(encoder.encode(chunk));
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Chat failed';
          controller.enqueue(encoder.encode(`Error: ${message}`));
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
      },
    });
  } catch (error) {
    console.error('POST /api/chat/stream', error);
    return NextResponse.json({ error: 'Chat stream failed' }, { status: 500 });
  }
}
