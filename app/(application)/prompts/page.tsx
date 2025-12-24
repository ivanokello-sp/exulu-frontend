"use client";

import { useContext, useState, useEffect } from "react";
import { UserContext } from "@/app/(application)/authenticated";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, ChevronLeft, ChevronRight, Grid3x3, FolderTree, FileText } from "lucide-react";
import { usePrompts } from "@/hooks/use-prompts";
import { PromptCard } from "./components/prompt-card";
import { PromptEditorModal } from "./components/prompt-editor-modal";
import { PromptFilters } from "./components/prompt-filters";
import { PromptsGroupedView } from "./components/prompts-grouped-view";

export const dynamic = "force-dynamic";

type ViewMode = "grid" | "grouped";

export default function PromptsPage() {
  const { user } = useContext(UserContext);
  const [viewMode, setViewMode] = useState<ViewMode>("grouped");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<string>("updatedAt");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(12); // Fixed limit per page

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, sortBy, selectedTags]);

  // Build filters based on search and tags (server-side)
  const filters: any[] = [];
  if (searchQuery) {
    filters.push({ name: { contains: searchQuery } });
  }
  // Add tag filters - prompts must contain all selected tags
  if (selectedTags.length > 0) {
    selectedTags.forEach(tag => {
      filters.push({ tags: { contains: tag } });
    });
  }

  // Fetch prompts with server-side filtering and sorting
  const { data, loading, error, refetch } = usePrompts({
    page,
    limit,
    filters,
    sort: { field: sortBy, direction: "DESC" },
  });

  const prompts = data?.prompt_libraryPagination?.items || [];
  const pageInfo = data?.prompt_libraryPagination?.pageInfo;

  return (
    <div className="h-full flex-1 flex-col space-y-8 p-8">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Prompt Library</h2>
          <p className="text-muted-foreground">
            Create, organize, and share AI prompts with your team.
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Prompt
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          {viewMode === "grid" && (
            <>
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search prompts by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <PromptFilters
                sortBy={sortBy}
                onSortChange={setSortBy}
                selectedTags={selectedTags}
                onTagsChange={setSelectedTags}
              />
            </>
          )}
          {/* View Toggle */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="grid" className="gap-2">
                <Grid3x3 className="h-4 w-4" />
                Grid
              </TabsTrigger>
              <TabsTrigger value="grouped" className="gap-2">
                <FolderTree className="h-4 w-4" />
                Grouped
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Prompts Display */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading prompts...</div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-destructive">Error loading prompts</div>
        </div>
      ) : (
        <>
          {/* Grid View */}
          {viewMode === "grid" && (

            prompts.length === 0 ? <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
              <div className="text-center space-y-4 max-w-md">
                <div className="flex justify-center">
                  <div className="rounded-full bg-muted p-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">No prompts found</h3>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery
                      ? "Try adjusting your search or filters to find what you're looking for."
                      : "Get started by creating your first prompt template."}
                  </p>
                </div>
                {!searchQuery && (
                  <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    size="lg"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Prompt
                  </Button>
                )}
              </div>
            </div> : <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {prompts.map((prompt) => (
                  <PromptCard
                    key={prompt.id}
                    prompt={prompt}
                    user={user}
                    onUpdate={refetch}
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
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>


          )}

          {/* Grouped View */}
          {viewMode === "grouped" && (
            <PromptsGroupedView
              prompts={prompts}
              onCreateClick={() => setIsCreateModalOpen(true)}
            />
          )}
        </>
      )
      }

      {/* Create Modal */}
      <PromptEditorModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={refetch}
        user={user}
      />
    </div >
  );
}
