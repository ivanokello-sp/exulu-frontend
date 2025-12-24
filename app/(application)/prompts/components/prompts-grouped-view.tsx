"use client";

import { useRouter } from "next/navigation";
import { PromptLibrary } from "@/types/models/prompt-library";
import { Folder, Inbox, Plus, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface PromptsGroupedViewProps {
  prompts: PromptLibrary[];
  onCreateClick: () => void;
}

export function PromptsGroupedView({
  prompts,
  onCreateClick,
}: PromptsGroupedViewProps) {
  const router = useRouter();

  // Count prompts by folder (tag)
  const folderCounts: Record<string, number> = {};
  let untaggedCount = 0;

  prompts.forEach((prompt) => {
    if (!prompt.tags || prompt.tags.length === 0) {
      untaggedCount++;
    } else {
      prompt.tags.forEach((tag) => {
        folderCounts[tag] = (folderCounts[tag] || 0) + 1;
      });
    }
  });

  // Sort folder names alphabetically
  const sortedFolders = Object.keys(folderCounts).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );

  const handleFolderClick = (folder: string) => {
    router.push(`/prompts/${encodeURIComponent(folder)}`);
  };

  const handleUntaggedClick = () => {
    router.push(`/prompts/untagged`);
  };

  if (sortedFolders.length === 0 && untaggedCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
        <div className="text-center space-y-4 max-w-md">
          <div className="flex justify-center">
            <div className="rounded-full bg-muted p-4">
              <FolderPlus className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium">No folders yet</h3>
            <p className="text-sm text-muted-foreground">
              Get started by creating your first prompt and organizing it into a folder.
              Folders help you categorize prompts by team, use case, or project.
            </p>
          </div>
          <Button onClick={onCreateClick} size="lg">
            <Plus className="mr-2 h-4 w-4" />
            Create Your First Prompt
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {sortedFolders.length} {sortedFolders.length === 1 ? "folder" : "folders"}
        {untaggedCount > 0 && ` + ${untaggedCount} untagged`}
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* Folder Cards */}
        {sortedFolders.map((folder) => (
          <Card
            key={folder}
            className="cursor-pointer hover:border-primary hover:shadow-md transition-all"
            onClick={() => handleFolderClick(folder)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Folder className="h-8 w-8 text-blue-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium truncate">{folder}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {folderCounts[folder]} {folderCounts[folder] === 1 ? "prompt" : "prompts"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Untagged Card */}
        {untaggedCount > 0 && (
          <Card
            className="cursor-pointer hover:border-primary hover:shadow-md transition-all"
            onClick={handleUntaggedClick}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Inbox className="h-8 w-8 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-muted-foreground truncate">
                      All
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {untaggedCount} {untaggedCount === 1 ? "prompt" : "prompts"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
