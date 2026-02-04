"use client";

import { useQuery, useMutation } from "@apollo/client";
import { useState, useEffect } from "react";
import { GET_CONTEXT_BY_ID, GET_ITEMS, UPDATE_ITEM, DELETE_ITEM } from "@/queries/queries";
import { Context } from "@/types/models/context";
import { Item } from "@/types/models/item";
import { NewItemDialog } from "@/components/items-selection-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Download, FileAudio, Loader2, AlertCircle, CheckCircle2, Trash2 } from "lucide-react";
import { getPresignedUrl } from "@/components/uppy-dashboard";
import { uploadAudioFile, getJobStatus, downloadFile } from "@/util/transcription-api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const CONTEXT_ID = "transcriptions_context";
const POLL_INTERVAL = 5000; // 5 seconds

export default function TranscriptionsPage() {
  const [context, setContext] = useState<Context | null>(null);
  const [uploadingItems, setUploadingItems] = useState<Set<string>>(new Set());

  // Fetch context
  const { data: contextData, loading: contextLoading } = useQuery(GET_CONTEXT_BY_ID, {
    variables: { id: CONTEXT_ID },
    onCompleted: (data) => {
      setContext(data.contextById);
    },
  });

  // Fetch items
  const { data: itemsData, loading: itemsLoading, refetch } = useQuery<{
    transcriptions_context_itemsPagination: {
      pageInfo: {
        pageCount: number;
        itemCount: number;
        currentPage: number;
        hasPreviousPage: boolean;
        hasNextPage: boolean;
      };
      items: Item[];
    }
  }>(GET_ITEMS(CONTEXT_ID, ["status", "audio_s3key", "job_id"]), {
    fetchPolicy: "no-cache",
    nextFetchPolicy: "network-only",
    skip: !context,
    variables: {
      context: CONTEXT_ID,
      page: 1,
      limit: 50,
      sort: {
        field: "updatedAt",
        direction: "DESC",
      },
      filters: {
        archived: {
          ne: true
        },
      },
    },
  });

  const [updateItemMutation] = useMutation(UPDATE_ITEM(CONTEXT_ID), {
    onCompleted: () => {
      refetch();
    },
  });

  const [deleteItemMutation] = useMutation(DELETE_ITEM(CONTEXT_ID, []), {
    onCompleted: () => {
      toast.success("Transcription deleted");
      refetch();
    },
    onError: (error) => {
      toast.error("Failed to delete transcription", {
        description: error.message,
      });
    },
  });

  const handleItemCreated = async (item: Item) => {
    if (!item.id) {
      toast.error("Item created but ID is missing");
      return;
    }

    // Add to uploading items set
    setUploadingItems(prev => new Set(prev).add(item.id!));

    toast.success("Transcription item created", {
      description: "Starting upload process...",
    });

    // Start upload process
    try {
      const audioS3Key = item.audio_s3key;
      console.log("item", item)
      if (!audioS3Key) {
        toast.error("No audio file attached to item");
        setUploadingItems(prev => {
          const next = new Set(prev);
          next.delete(item.id!);
          return next;
        });
        return;
      }

      toast.info("Downloading audio file from storage...");

      // Download audio file from S3
      const presignedUrl = await getPresignedUrl(audioS3Key);
      console.log("Presigned url", presignedUrl)
      const audioResponse = await fetch(presignedUrl);

      console.log("Audio response", audioResponse)

      const audioBlob = await audioResponse.blob();

      console.log("Audio blob", audioBlob)

      toast.info("Uploading to transcription service...", {
        description: `File size: ${(audioBlob.size / 1024 / 1024).toFixed(2)} MB`,
      });

      // Upload to transcription API
      const jobId = await uploadAudioFile(audioBlob);

      toast.success("Upload successful! Transcription started.", {
        description: `Job ID: ${jobId.substring(0, 8)}...`,
      });

      // Update item with job_id
      await updateItemMutation({
        variables: {
          id: item.id,
          input: {
            job_id: jobId,
            status: "pending",
          },
        },
      });

      // Remove from uploading items and refetch
      setUploadingItems(prev => {
        const next = new Set(prev);
        next.delete(item.id!);
        return next;
      });

      // Refetch to show updated item
      await refetch();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload audio file", {
        description: error instanceof Error ? error.message : "Unknown error",
      });

      // Update item with error status
      await updateItemMutation({
        variables: {
          id: item.id,
          input: {
            status: "error",
            error_message: error instanceof Error ? error.message : "Unknown error",
          },
        },
      });

      // Remove from uploading items and refetch
      setUploadingItems(prev => {
        const next = new Set(prev);
        next.delete(item.id!);
        return next;
      });

      await refetch();
    }
  };

  const handleDownload = async (item: Item, format: 'html' | 'srt' | 'json' | 'txt') => {
    try {
      if (!item.job_id) {
        toast.error("No job ID found for this transcription");
        return;
      }

      toast.info(`Downloading ${format.toUpperCase()} file...`);

      const blob = await downloadFile(item.job_id, item.name || 'transcription', format);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${item.name || 'transcription'}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`${format.toUpperCase()} file downloaded`);
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download file", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleDelete = async (itemId?: string) => {
    if (!itemId) return;

    await deleteItemMutation({
      variables: {
        id: itemId,
      },
    });
  };

  if (contextLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!context) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Context Not Found</CardTitle>
            <CardDescription>
              The transcriptions context could not be loaded. Please ensure it exists in the system.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const items = itemsData?.transcriptions_context_itemsPagination?.items || [];

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Transcriptions</h1>
        <p className="text-muted-foreground">
          Upload audio files and manage your transcriptions
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Area */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileAudio className="h-5 w-5" />
              New Transcription
            </CardTitle>
            <CardDescription>
              Create a new transcription item and upload an audio file
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NewItemDialog context={context} onItemCreated={handleItemCreated} fieldsToReturn={["audio_s3key"]} />
          </CardContent>
        </Card>

        {/* Transcriptions List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Your Transcriptions</CardTitle>
            <CardDescription>
              {items.length} transcription{items.length !== 1 ? 's' : ''} in total
            </CardDescription>
          </CardHeader>
          <CardContent>
            {itemsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No transcriptions yet. Create your first one to get started!
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <TranscriptionItem
                    key={item.id}
                    item={item}
                    onDownload={handleDownload}
                    onDelete={handleDelete}
                    refetch={refetch}
                    updateItemMutation={updateItemMutation}
                    isUploading={uploadingItems.has(item.id || '')}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TranscriptionItem({
  item,
  onDownload,
  onDelete,
  refetch,
  updateItemMutation,
  isUploading,
}: {
  item: Item;
  onDownload: (item: Item, format: 'html' | 'srt' | 'json' | 'txt') => void;
  onDelete: (itemId?: string) => void;
  refetch: () => void;
  updateItemMutation: any;
  isUploading: boolean;
}) {
  const [progress, setProgress] = useState(0);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Poll for status if job is pending or processing
  useEffect(() => {
    if (!item.job_id) return;
    if (item.status === 'completed' || item.status === 'error') return;

    const pollStatus = async () => {
      try {
        const statusResponse = await getJobStatus(item.job_id!);

        console.log("Status response", statusResponse)
        console.log("Item status", item.status)

        setProgress(statusResponse.progress ?? 0);

        // Update item if status changed
        if (statusResponse.status !== item.status) {
          await updateItemMutation({
            variables: {
              id: item.id,
              input: {
                status: statusResponse.status,
                ...(statusResponse.status === 'error' && {
                  error_message: statusResponse.error_message,
                }),
              },
            },
          });
          refetch();
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    };

    // Initial poll
    pollStatus();

    // Set up interval
    const interval = setInterval(pollStatus, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [item.id, item.job_id, item.status, updateItemMutation, refetch]);

  const getStatusIcon = () => {
    if (isUploading) {
      return <Loader2 className="h-5 w-5 animate-spin text-orange-500" />;
    }

    switch (item.status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'processing':
      case 'pending':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      default:
        return <FileAudio className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    if (isUploading) {
      return 'Uploading...';
    }

    switch (item.status) {
      case 'completed':
        return 'Completed';
      case 'error':
        return 'Error';
      case 'processing':
        return 'Processing';
      case 'pending':
        return 'Pending';
      case 'queued':
        return 'Queued';
      default:
        return 'Unknown';
    }
  };

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              {getStatusIcon()}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{item.name}</h3>
                {item.description && (
                  <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-muted-foreground">{getStatusText()}</span>
                  {item.job_id && (
                    <span className="text-xs text-muted-foreground">• Job: {item.job_id.substring(0, 8)}...</span>
                  )}
                </div>

                {/* Uploading indicator */}
                {isUploading && (
                  <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-950 rounded text-xs text-orange-600 dark:text-orange-400">
                    Uploading audio file to transcription service...
                  </div>
                )}

                {item.status === 'queued' && (
                  <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-950 rounded text-xs text-yellow-600 dark:text-yellow-400">
                    Queued
                  </div>
                )}

                {/* Progress bar for pending/processing */}
                {!isUploading && (item.status === 'pending' || item.status === 'processing') && (
                  <div className="mt-3">
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">{Math.round(progress)}%</p>
                  </div>
                )}

                {/* Error message */}
                {item.status === 'error' && item.error_message && (
                  <div className="mt-2 p-2 bg-red-50 dark:bg-red-950 rounded text-xs text-red-600 dark:text-red-400">
                    {item.error_message}
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {/* Download button for completed transcriptions */}
              {item.status === 'completed' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onDownload(item, 'html')}>
                      Download HTML
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDownload(item, 'srt')}>
                      Download SRT
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDownload(item, 'json')}>
                      Download JSON
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDownload(item, 'txt')}>
                      Download TXT
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Delete button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isUploading}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transcription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{item.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(item.id);
                setShowDeleteDialog(false);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
