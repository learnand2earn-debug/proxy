import { NextResponse } from 'next/server';
import { processAIChat } from '@/lib/ai/assistant';
import { DEFAULT_OWNER_ID } from '@/lib/db/repository';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query string is required' }, { status: 400 });
    }

    const result = await processAIChat(query, DEFAULT_OWNER_ID);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
