/**
 * TranscriboZH API Client
 *
 * TypeScript implementation for uploading audio files to TranscriboZH,
 * polling job status, and downloading transcription results.
 *
 * Note: Uses Next.js API routes as a proxy to avoid CORS issues.
 */

const API_BASE_URL = "/api/transcription";

export interface UploadResponse {
  job_id: string;
  [key: string]: any;
}

export interface StatusResponse {
  status: 'pending' | 'processing' | 'completed' | 'error' | 'queued';
  progress?: number;
  error_message?: string;
  [key: string]: any;
}

export interface TranscriptionResult {
  html: Blob;
  srt: Blob;
  json: Blob;
}

export interface ProgressCallback {
  (progress: number, status: string): void;
}

/**
 * Upload an audio file to TranscriboZH for transcription
 *
 * @param file - The audio file to upload
 * @returns Promise with the job ID
 * @throws Error if upload fails
 */
export async function uploadAudioFile(file: File | Blob): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  console.log('Uploading to:', `${API_BASE_URL}/transcribe`);
  console.log('File size:', file.size, 'bytes');

  try {
    const response = await fetch(`${API_BASE_URL}/transcribe`, {
      method: 'POST',
      body: formData,
    });

    console.log('Upload response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed (HTTP ${response.status}): ${errorText}`);
    }

    const data = await response.json() as UploadResponse;

    if (!data.job_id) {
      throw new Error('Invalid response: missing job_id');
    }

    console.log("Upload audio file response", data)

    return data.job_id;
  } catch (error) {
    console.error('Upload error details:', error);
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('Network error: Unable to connect to transcription service. The service may be unavailable.');
    }
    throw error;
  }
}

/**
 * Get the current status of a transcription job
 *
 * @param jobId - The job ID returned from uploadAudioFile
 * @returns Promise with the status response
 * @throws Error if status check fails
 */
export async function getJobStatus(jobId: string): Promise<StatusResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/status/${jobId}`);

    if (!response.ok) {
      throw new Error(`Status query failed (HTTP ${response.status})`);
    }

    const data = await response.json() as StatusResponse;
    return data;
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('Network error: Unable to connect to transcription service.');
    }
    throw error;
  }
}

/**
 * Poll job status until completion or error
 *
 * @param jobId - The job ID to poll
 * @param onProgress - Optional callback for progress updates
 * @param pollInterval - Polling interval in milliseconds (default: 5000)
 * @returns Promise that resolves when job completes
 * @throws Error if job fails or polling encounters an error
 */
export async function pollJobStatus(
  jobId: string,
  onProgress?: ProgressCallback,
  pollInterval: number = 5000
): Promise<void> {
  while (true) {
    const status = await getJobStatus(jobId);

    const progress = status.progress ?? 0;

    if (onProgress) {
      onProgress(progress, status.status);
    }

    switch (status.status) {
      case 'error':
        throw new Error(`Transcription failed: ${status.error_message ?? 'Unknown error'}`);

      case 'completed':
        return;

      default:
        // Continue polling
        await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }
}

/**
 * Download a specific file format from a completed job
 *
 * @param jobId - The job ID
 * @param filename - The base filename
 * @param format - The file format extension (html, srt, json, txt)
 * @returns Promise with the file as a Blob
 * @throws Error if download fails
 */
export async function downloadFile(
  jobId: string,
  filename: string,
  format: 'html' | 'srt' | 'json' | 'txt'
): Promise<Blob> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/download/${jobId}/${filename}.${format}`
    );

    if (!response.ok) {
      throw new Error(`Failed to download ${format.toUpperCase()} (HTTP ${response.status})`);
    }

    return await response.blob();
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('Network error: Unable to connect to transcription service.');
    }
    throw error;
  }
}

/**
 * Download all transcription results (HTML, SRT, JSON)
 *
 * @param jobId - The job ID
 * @param baseFilename - The base filename (without extension)
 * @returns Promise with all results
 * @throws Error if any download fails
 */
export async function downloadAllResults(
  jobId: string,
  baseFilename: string
): Promise<TranscriptionResult> {
  const [html, srt, json] = await Promise.all([
    downloadFile(jobId, baseFilename, 'html'),
    downloadFile(jobId, baseFilename, 'srt'),
    downloadFile(jobId, baseFilename, 'json'),
  ]);

  return { html, srt, json };
}

/**
 * Complete transcription workflow: upload, poll, and download
 *
 * @param file - The audio file to transcribe
 * @param onProgress - Optional callback for progress updates
 * @returns Promise with all transcription results
 * @throws Error if any step fails
 */
export async function transcribeAudioFile(
  file: File,
  onProgress?: ProgressCallback
): Promise<TranscriptionResult> {
  // Upload file
  const jobId = await uploadAudioFile(file);
  console.log(`Job ID: ${jobId}`);

  // Poll until completion
  await pollJobStatus(jobId, onProgress);
  console.log('Transcription completed');

  // Download all results
  const results = await downloadAllResults(jobId, file.name);
  console.log('All results downloaded');

  return results;
}
