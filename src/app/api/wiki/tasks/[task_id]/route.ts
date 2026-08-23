import { NextRequest, NextResponse } from 'next/server';
import { getTask } from '@/lib/lore/tasks';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ task_id: string }> },
) {
  try {
    const { task_id } = await params;
    const task = await getTask(task_id);
    if (!task) {
      return NextResponse.json({ detail: 'Task not found' }, { status: 404 });
    }
    return NextResponse.json(task);
  } catch (error) {
    console.error('GET /api/wiki/tasks/[task_id]', error);
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 });
  }
}
