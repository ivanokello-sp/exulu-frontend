import { NextRequest, NextResponse } from 'next/server';

const TRANSCRIPTION_API_BASE = "https://transcribo.gpt.liip.ch/api";

export async function POST(request: NextRequest) {
  try {
    // Get the form data from the request
    const formData = await request.formData();

    console.log('[Transcription Proxy] Uploading file to transcription service...');

    // Forward the request to the transcription API
    const response = await fetch(`${TRANSCRIPTION_API_BASE}/transcribe`, {
      method: 'POST',
      body: formData,
    });

    console.log('[Transcription Proxy] Upload response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Transcription Proxy] Upload failed:', errorText);
      return NextResponse.json(
        { error: `Upload failed: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[Transcription Proxy] Upload successful, job_id:', data.job_id);

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Transcription Proxy] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
