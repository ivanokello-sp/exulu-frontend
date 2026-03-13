"use client";

import { useState } from "react";
import { PromptLibrary, PromptVersion } from "@/types/models/prompt-library";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ReactDiffViewer, { DiffMethod } from "react-diff-viewer-continued";
import { useTheme } from "next-themes";
import { formatDistanceToNow } from "date-fns";
import { GitCompare, ArrowRight } from "lucide-react";

interface VersionDiffModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prompt: PromptLibrary;
  version: PromptVersion;
  compareVersion?: PromptVersion | null;
}

export function VersionDiffModal({
  open,
  onOpenChange,
  prompt,
  version,
  compareVersion: initialCompareVersion,
}: VersionDiffModalProps) {
  const { theme } = useTheme();
  const [leftVersion, setLeftVersion] = useState<PromptVersion | null>(initialCompareVersion || null);
  const [rightVersion, setRightVersion] = useState<PromptVersion>(version);

  const history = prompt.history || [];

  // Create version options (including current)
  const currentVersionNum = history.length > 0 ? Math.max(...history.map(v => v.version)) + 1 : 1;
  const currentVersion: PromptVersion = {
    version: currentVersionNum,
    content: prompt.content,
    name: prompt.name,
    description: prompt.description,
    tags: prompt.tags,
    timestamp: prompt.updatedAt,
    changed_by: prompt.created_by,
    change_message: undefined,
  };

  const allVersions = [currentVersion, ...history].sort((a, b) => b.version - a.version);

  // Determine what to compare
  const leftContent = leftVersion?.content || prompt.content;
  const rightContent = rightVersion.content;

  // Check for metadata changes
  const nameChanged = leftVersion && leftVersion.name !== rightVersion.name;
  const descriptionChanged = leftVersion && leftVersion.description !== rightVersion.description;
  const tagsChanged = leftVersion && JSON.stringify(leftVersion.tags) !== JSON.stringify(rightVersion.tags);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-primary" />
            Compare Versions
          </DialogTitle>
          <DialogDescription>
            View the differences between prompt versions
          </DialogDescription>
        </DialogHeader>

        {/* Version Selectors */}
        <div className="flex items-center gap-3 pb-4 border-b">
          <div className="flex-1">
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
              Compare from
            </label>
            <Select
              value={leftVersion?.version.toString() || "current"}
              onValueChange={(value) => {
                if (value === "current") {
                  setLeftVersion(null);
                } else {
                  const selected = allVersions.find(v => v.version.toString() === value);
                  if (selected) setLeftVersion(selected);
                }
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allVersions.map((v) => (
                  <SelectItem key={v.version} value={v.version.toString()}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">v{v.version}</span>
                      {v.version === currentVersionNum && (
                        <Badge variant="secondary" className="text-xs">Current</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        ({formatDistanceToNow(new Date(v.timestamp), { addSuffix: true })})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ArrowRight className="h-4 w-4 text-muted-foreground mt-5" />

          <div className="flex-1">
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
              Compare to
            </label>
            <Select
              value={rightVersion.version.toString()}
              onValueChange={(value) => {
                const selected = allVersions.find(v => v.version.toString() === value);
                if (selected) setRightVersion(selected);
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allVersions.map((v) => (
                  <SelectItem key={v.version} value={v.version.toString()}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">v{v.version}</span>
                      {v.version === currentVersionNum && (
                        <Badge variant="secondary" className="text-xs">Current</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        ({formatDistanceToNow(new Date(v.timestamp), { addSuffix: true })})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Metadata Changes */}
        {(nameChanged || descriptionChanged || tagsChanged) && (
          <div className="space-y-2 py-3 border-b">
            <p className="text-xs font-semibold text-muted-foreground">Metadata Changes</p>
            {nameChanged && (
              <div className="text-sm space-y-1">
                <span className="font-semibold">Name:</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs line-through text-muted-foreground">
                    {leftVersion?.name}
                  </Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <Badge variant="outline" className="font-mono text-xs">
                    {rightVersion.name}
                  </Badge>
                </div>
              </div>
            )}
            {descriptionChanged && (
              <div className="text-sm space-y-1">
                <span className="font-semibold">Description:</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground line-through">
                    {leftVersion?.description || "(none)"}
                  </span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs">
                    {rightVersion.description || "(none)"}
                  </span>
                </div>
              </div>
            )}
            {tagsChanged && (
              <div className="text-sm space-y-1">
                <span className="font-semibold">Tags:</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {leftVersion?.tags?.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs line-through">
                      {tag}
                    </Badge>
                  ))}
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  {rightVersion.tags?.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Content Diff */}
        <div className="flex-1 overflow-auto rounded-lg border">
          <ReactDiffViewer
            oldValue={leftContent}
            newValue={rightContent}
            splitView={true}
            useDarkTheme={theme === "dark"}
            compareMethod={DiffMethod.WORDS}
            leftTitle={`v${leftVersion?.version || currentVersionNum} (${leftVersion ? formatDistanceToNow(new Date(leftVersion.timestamp), { addSuffix: true }) : "current"})`}
            rightTitle={`v${rightVersion.version} (${formatDistanceToNow(new Date(rightVersion.timestamp), { addSuffix: true })})`}
            styles={{
              variables: {
                light: {
                  diffViewerBackground: "hsl(var(--background))",
                  addedBackground: "hsl(142, 76%, 90%)",
                  addedColor: "hsl(142, 76%, 20%)",
                  removedBackground: "hsl(0, 84%, 90%)",
                  removedColor: "hsl(0, 84%, 30%)",
                  wordAddedBackground: "hsl(142, 76%, 75%)",
                  wordRemovedBackground: "hsl(0, 84%, 75%)",
                  addedGutterBackground: "hsl(142, 76%, 85%)",
                  removedGutterBackground: "hsl(0, 84%, 85%)",
                  gutterBackground: "hsl(var(--muted))",
                  gutterBackgroundDark: "hsl(var(--muted))",
                  highlightBackground: "hsl(var(--accent))",
                  highlightGutterBackground: "hsl(var(--accent))",
                },
                dark: {
                  diffViewerBackground: "hsl(var(--background))",
                  addedBackground: "hsl(142, 76%, 15%)",
                  addedColor: "hsl(142, 76%, 80%)",
                  removedBackground: "hsl(0, 84%, 15%)",
                  removedColor: "hsl(0, 84%, 80%)",
                  wordAddedBackground: "hsl(142, 76%, 25%)",
                  wordRemovedBackground: "hsl(0, 84%, 25%)",
                  addedGutterBackground: "hsl(142, 76%, 20%)",
                  removedGutterBackground: "hsl(0, 84%, 20%)",
                  gutterBackground: "hsl(var(--muted))",
                  gutterBackgroundDark: "hsl(var(--muted))",
                  highlightBackground: "hsl(var(--accent))",
                  highlightGutterBackground: "hsl(var(--accent))",
                },
              },
            }}
          />
        </div>

        {/* No changes message */}
        {leftContent === rightContent && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No content changes between these versions</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
