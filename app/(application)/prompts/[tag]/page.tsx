"use client";

import { useContext, useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { UserContext } from "@/app/(application)/authenticated";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, ChevronLeft, ArrowLeft } from "lucide-react";
import { usePrompts } from "@/hooks/use-prompts";
import { PromptCard } from "../components/prompt-card";
import { PromptEditorModal } from "../components/prompt-editor-modal";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function FolderPage() {
  const { user } = useContext(UserContext);
  const router = useRouter();
  const params = useParams();
  const tag = decodeURIComponent(params.tag as string);

  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(12);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  // Build filters for this specific folder
  const filters: any[] = [];

  // Handle untagged folder
  if (tag === "untagged") {
    // For untagged, we need prompts with empty or null tags
    // This is a bit tricky - we'll fetch all and filter client-side
  } else {
    // Filter by the specific tag (folder)
    filters.push({ tags: { contains: tag } });
  }

  // Add search filter
  if (searchQuery) {
    filters.push({ name: { contains: searchQuery } });
  }

  // Fetch prompts
  const { data, loading, error, refetch } = usePrompts({
    page,
    limit,
    filters,
    sort: { field: "updatedAt", direction: "DESC" },
  });

  let prompts = data?.prompt_libraryPagination?.items || [];

  // Client-side filter for untagged
  if (tag === "untagged") {
    prompts = prompts.filter(p => !p.tags || p.tags.length === 0);
  }

  const pageInfo = data?.prompt_libraryPagination?.pageInfo;

  const folderDisplayName = tag === "untagged" ? "Untagged" : tag;

  return (
    <div className="h-full flex-1 flex-col space-y-8 p-8">
      {/* Header */}
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/prompts")}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight">
                {folderDisplayName}
              </h2>
              <span className="text-sm text-muted-foreground">
                ({prompts.length} {prompts.length === 1 ? "prompt" : "prompts"})
              </span>
            </div>
            <p className="text-muted-foreground">
              Prompts in the "{folderDisplayName}" folder
            </p>
          </div>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Prompt
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search prompts in this folder..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Prompts Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading prompts...</div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-destructive">Error loading prompts</div>
        </div>
      ) : prompts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-medium">No prompts found</h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery
                ? "Try adjusting your search"
                : `No prompts in the "${folderDisplayName}" folder yet`}
            </p>
            {!searchQuery && (
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                variant="outline"
                className="mt-4"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Prompt
              </Button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {prompts.map((prompt) => (
              <PromptCard
                key={prompt.id}
                prompt={prompt}
                user={user}
                onUpdate={refetch}
                currentFolder={tag}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          {pageInfo && pageInfo.pageCount > 1 && (
            <div className="flex items-center justify-between border-t pt-4">
              <div className="text-sm text-muted-foreground">
                Page {pageInfo.currentPage} of {pageInfo.pageCount} ({pageInfo.itemCount} total items)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={!pageInfo.hasPreviousPage}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={!pageInfo.hasNextPage}
                >
                  Next
                  <ChevronLeft className="h-4 w-4 ml-1 rotate-180" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Modal */}
      <PromptEditorModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={refetch}
        user={user}
      />
    </div>
  );
}
