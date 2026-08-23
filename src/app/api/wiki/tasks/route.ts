import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { submitTask, listTasks, runWikiGeneration } from '@/lib/lore/tasks';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await submitTask(body);

    if (result.created) {
      after(async () => {
        await runWikiGeneration(result.task_id);
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/wiki/tasks', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit task' },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get('status') as 'active' | 'completed' | null;
    const tasks = await listTasks(status || undefined);
    return NextResponse.json(tasks);
  } catch (error) {
    console.error('GET /api/wiki/tasks', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list tasks' },
      { status: 500 },
    );
  }
}
