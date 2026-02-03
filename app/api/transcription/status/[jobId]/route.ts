import { NextRequest, NextResponse } from 'next/server';

const TRANSCRIPTION_API_BASE = "https://transcribo.gpt.liip.ch/api";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    console.log('[Transcription Proxy] Checking status for job:', jobId);

    // Forward the request to the transcription API
    const response = await fetch(`${TRANSCRIPTION_API_BASE}/status/${jobId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Transcription Proxy] Status check failed:', errorText);
      return NextResponse.json(
        { error: `Status check failed: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[Transcription Proxy] Status:', data.status, 'Progress:', data.progress);

    return NextResponse.json({
      ...data,
      url: TRANSCRIPTION_API_BASE
    });
  } catch (error) {
    console.error('[Transcription Proxy] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
