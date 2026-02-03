import { NextRequest, NextResponse } from 'next/server';

const TRANSCRIPTION_API_BASE = "https://transcribo.gpt.liip.ch/api";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string; filename: string }> }
) {
  try {
    const { jobId, filename } = await params;

    console.log('[Transcription Proxy] Downloading file:', filename, 'for job:', jobId);

    // Forward the request to the transcription API
    const response = await fetch(
      `${TRANSCRIPTION_API_BASE}/download/${jobId}/${filename}`,
      {
        method: 'GET',
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Transcription Proxy] Download failed:', errorText);
      return NextResponse.json(
        { error: `Download failed: ${errorText}` },
        { status: response.status }
      );
    }

    // Get the blob from the response
    const blob = await response.blob();

    // Forward the blob to the client with appropriate headers
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
        'Content-Disposition': response.headers.get('Content-Disposition') || `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[Transcription Proxy] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
