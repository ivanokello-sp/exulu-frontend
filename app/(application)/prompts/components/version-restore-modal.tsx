"use client";

import { useState } from "react";
import { PromptLibrary, PromptVersion } from "@/types/models/prompt-library";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RotateCcw, AlertTriangle, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useMutation } from "@apollo/client";
import { UPDATE_PROMPT } from "@/queries/queries";
import { toast } from "sonner";

interface VersionRestoreModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prompt: PromptLibrary;
  version: PromptVersion;
  onRestore: () => void;
}

export function VersionRestoreModal({
  open,
  onOpenChange,
  prompt,
  version,
  onRestore,
}: VersionRestoreModalProps) {
  const [restoreMessage, setRestoreMessage] = useState(
    `Restored from v${version.version}`
  );
  const [isRestoring, setIsRestoring] = useState(false);

  const [updatePrompt] = useMutation(UPDATE_PROMPT);

  // Determine what will change
  const contentWillChange = version.content !== prompt.content;
  const nameWillChange = version.name && version.name !== prompt.name;
  const descriptionWillChange = version.description !== prompt.description;
  const tagsWillChange = version.tags && JSON.stringify(version.tags) !== JSON.stringify(prompt.tags);

  const hasChanges = contentWillChange || nameWillChange || descriptionWillChange || tagsWillChange;

  const handleRestore = async () => {
    if (!hasChanges) {
      toast.info("No changes to restore", {
        description: "This version is identical to the current version.",
      });
      return;
    }

    setIsRestoring(true);
    try {
      // Create version history entry for current state before restoring
      const existingHistory = prompt.history || [];
      const currentVersion = existingHistory.length > 0
        ? Math.max(...existingHistory.map(v => v.version)) + 1
        : 1;

      const newVersionEntry = {
        version: currentVersion,
        content: prompt.content,
        name: prompt.name,
        description: prompt.description,
        tags: prompt.tags,
        timestamp: new Date().toISOString(),
        changed_by: prompt.created_by, // Use current user if available
        change_message: restoreMessage,
      };

      const updatedHistory = [...existingHistory, newVersionEntry];

      // Keep only last 50 versions
      const finalHistory = updatedHistory.length > 50
        ? updatedHistory.slice(-50)
        : updatedHistory;

      await updatePrompt({
        variables: {
          id: prompt.id,
          content: version.content,
          name: version.name || prompt.name,
          description: version.description || prompt.description,
          tags: version.tags || prompt.tags,
          history: finalHistory,
        },
      });

      toast.success("Version restored successfully", {
        description: `Restored to v${version.version}. A new version has been created.`,
        icon: "✅",
      });

      onRestore();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to restore version:", error);
      toast.error("Failed to restore version", {
        description: "An error occurred while restoring. Please try again.",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-primary" />
            Restore Version {version.version}
          </DialogTitle>
          <DialogDescription>
            This will restore the prompt to its state from{" "}
            {formatDistanceToNow(new Date(version.timestamp), { addSuffix: true })}.
            A new version will be created with your current state.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                Current version will be preserved
              </p>
              <p className="text-xs text-amber-800 dark:text-amber-200">
                Your current prompt will be saved in version history before restoring.
                This operation creates a new version and does not delete any history.
              </p>
            </div>
          </div>

          {/* Changes Preview */}
          {hasChanges && (
            <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
              <p className="text-sm font-semibold">The following will be restored:</p>

              {contentWillChange && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Content</Label>
                  <div className="p-2 rounded bg-background border">
                    <p className="text-xs font-mono text-muted-foreground line-clamp-3">
                      {version.content}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {version.content.length} characters
                  </Badge>
                </div>
              )}

              {nameWillChange && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm line-through text-muted-foreground">
                      {prompt.name}
                    </span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm font-medium">{version.name}</span>
                  </div>
                </div>
              )}

              {descriptionWillChange && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs line-through text-muted-foreground">
                      {prompt.description || "(none)"}
                    </span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs">{version.description || "(none)"}</span>
                  </div>
                </div>
              )}

              {tagsWillChange && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Tags</Label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {prompt.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs line-through">
                        {tag}
                      </Badge>
                    ))}
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    {version.tags?.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Restore Message */}
          <div className="space-y-2">
            <Label htmlFor="restore-message" className="text-sm font-semibold">
              Restoration Note (Optional)
            </Label>
            <Textarea
              id="restore-message"
              value={restoreMessage}
              onChange={(e) => setRestoreMessage(e.target.value)}
              placeholder="Describe why you're restoring this version..."
              className="min-h-[80px] text-sm"
            />
            <p className="text-xs text-muted-foreground">
              This message will appear in the version history to help track changes.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRestoring}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRestore}
            disabled={isRestoring || !hasChanges}
            className="bg-primary hover:bg-primary/90"
          >
            {isRestoring ? (
              <>
                <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2" />
                Restoring...
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4 mr-2" />
                Restore Version
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
