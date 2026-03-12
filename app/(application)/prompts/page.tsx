"use client";

import { useContext, useState, useEffect } from "react";
import { UserContext } from "@/app/(application)/authenticated";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, ChevronLeft, ChevronRight, Grid3x3, FolderTree, FileText, MessageSquare } from "lucide-react";
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
  const [isViewTransitioning, setIsViewTransitioning] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<string>("updatedAt");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(12); // Fixed limit per page
  const [showOnboarding, setShowOnboarding] = useState(() => {
    // Check if user has seen onboarding
    if (typeof window !== 'undefined') {
      return !localStorage.getItem('prompts-onboarding-seen');
    }
    return false;
  });

  // Keyboard shortcuts for power users
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K: Quick create
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCreateModalOpen(true);
      }
      // Cmd/Ctrl + /: Focus search (only in grid view)
      if ((e.metaKey || e.ctrlKey) && e.key === '/' && viewMode === 'grid') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder="Search prompts..."]') as HTMLInputElement;
        searchInput?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode]);

  // Developer easter egg in console
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.log(
        '%c👋 Hey Developer!',
        'font-size: 16px; font-weight: bold; color: hsl(257.9, 100%, 60%);'
      );
      console.log(
        '%cKeyboard shortcuts:\n• Cmd/Ctrl + K → Quick create prompt\n• Cmd/Ctrl + / → Focus search',
        'font-size: 12px; color: #888;'
      );
    }
  }, []);

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
    <div className="h-full flex-1 flex-col p-8">
      {/* Hero Header - Editorial Style */}
      <div className="flex items-end justify-between border-b border-border/50 pb-8 mb-8">
        <div className="space-y-4 max-w-3xl animate-in fade-in slide-in-from-left-8 duration-700">
          <h1 className="text-6xl font-black tracking-tighter leading-none">
            Prompt
            <br />
            <span className="text-primary">Library</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-xl">
            Craft, organize, and deploy production-grade prompts across your AI infrastructure.
          </p>
        </div>
        <div className="animate-in fade-in slide-in-from-right-8 duration-700">
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            size="lg"
            className="h-14 px-8 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md transition-all duration-150 bg-primary hover:bg-primary/90"
          >
            <Plus className="mr-2 h-5 w-5" />
            New Prompt
          </Button>
        </div>
      </div>

      {/* Controls - Conditional Layout */}
      {viewMode === "grid" && (
        <div className="flex items-center gap-6 flex-wrap mb-8">
          <div className="relative flex-1 min-w-[320px] max-w-lg">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 text-base border-2 focus-visible:ring-offset-4 focus-visible:border-primary/50 focus-visible:shadow-lg focus-visible:shadow-primary/10 transition-all duration-200"
            />
          </div>

          <PromptFilters
            sortBy={sortBy}
            onSortChange={setSortBy}
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
          />

          {/* View Toggle */}
          <Tabs
            value={viewMode}
            onValueChange={(v) => {
              setIsViewTransitioning(true);
              setViewMode(v as ViewMode);
              setTimeout(() => setIsViewTransitioning(false), 300);
            }}
            className="ml-auto"
          >
            <TabsList className="h-12 p-1">
              <TabsTrigger value="grid" className="gap-2 px-4 data-[state=active]:shadow-md transition-all duration-200">
                <Grid3x3 className="h-4 w-4 transition-transform duration-200 data-[state=active]:scale-110" />
                <span className="font-medium">Grid</span>
              </TabsTrigger>
              <TabsTrigger value="grouped" className="gap-2 px-4 data-[state=active]:shadow-md transition-all duration-200">
                <FolderTree className="h-4 w-4 transition-transform duration-200 data-[state=active]:scale-110" />
                <span className="font-medium">Folders</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* View Toggle - Folders View Only */}
      {viewMode === "grouped" && (
        <div className="flex items-center justify-end mb-8">
          <Tabs
            value={viewMode}
            onValueChange={(v) => {
              setIsViewTransitioning(true);
              setViewMode(v as ViewMode);
              setTimeout(() => setIsViewTransitioning(false), 300);
            }}
          >
            <TabsList className="h-12 p-1">
              <TabsTrigger value="grid" className="gap-2 px-4 data-[state=active]:shadow-md transition-all duration-200">
                <Grid3x3 className="h-4 w-4 transition-transform duration-200 data-[state=active]:scale-110" />
                <span className="font-medium">Grid</span>
              </TabsTrigger>
              <TabsTrigger value="grouped" className="gap-2 px-4 data-[state=active]:shadow-md transition-all duration-200">
                <FolderTree className="h-4 w-4 transition-transform duration-200 data-[state=active]:scale-110" />
                <span className="font-medium">Folders</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* Prompts Display */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
            <span className="text-base font-medium text-muted-foreground">Loading prompts...</span>
          </div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 px-8 max-w-md mx-auto">
          <div className="p-3 rounded-full bg-destructive/10 mb-4">
            <FileText className="h-8 w-8 text-destructive" />
          </div>
          <p className="text-base font-semibold text-destructive mb-2">Failed to load prompts</p>
          <p className="text-sm text-muted-foreground text-center mb-4">There was an error loading your prompt library. Please try refreshing the page.</p>
          <Button onClick={() => refetch()} variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10">
            Try Again
          </Button>
        </div>
      ) : (
        <>
          {/* Grid View */}
          {viewMode === "grid" && (
            <div
              className={`transition-opacity duration-300 ${isViewTransitioning ? 'opacity-0' : 'opacity-100'}`}
            >
            {prompts.length === 0 ? <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-primary/20 rounded-2xl bg-gradient-to-br from-primary/[0.02] via-background to-emerald-500/[0.02]">
              <div className="text-center space-y-8 max-w-2xl px-8">
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-3xl"></div>
                    <FileText className="relative h-24 w-24 text-primary drop-shadow-lg" strokeWidth={1.5} />
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-3xl font-bold">
                    {searchQuery ? "No matches found" : "Build Your Prompt Library"}
                  </h3>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    {searchQuery
                      ? "Try a different search term or adjust your filters to discover prompts."
                      : "Create reusable prompt templates that your team can use across agents. Add variables for flexibility, organize by use case, and track usage over time."}
                  </p>
                </div>
                {!searchQuery && showOnboarding && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                    {/* Quick Start Options - Colorful */}
                    <div className="grid md:grid-cols-2 gap-4 text-left">
                      <div className="group p-6 rounded-lg border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 space-y-3 hover:border-primary hover:shadow-lg transition-all cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/20 group-hover:bg-primary/30 transition-colors">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <h4 className="font-bold text-base group-hover:text-primary transition-colors">Start from scratch</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Write a custom prompt with variables like <code className="px-1.5 py-0.5 rounded bg-primary/10 font-mono text-xs text-primary">{"{topic}"}</code> for flexible reuse
                        </p>
                      </div>
                      <div className="group p-6 rounded-lg border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 space-y-3 hover:border-emerald-500 hover:shadow-lg transition-all cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-emerald-500/20 group-hover:bg-emerald-500/30 transition-colors">
                            <MessageSquare className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />
                          </div>
                          <h4 className="font-bold text-base group-hover:text-emerald-600 dark:group-hover:text-emerald-500 transition-colors">Use from chat</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Import successful prompts directly from your agent conversations
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 justify-center">
                      <Button
                        onClick={() => {
                          setIsCreateModalOpen(true);
                          if (typeof window !== 'undefined') {
                            localStorage.setItem('prompts-onboarding-seen', 'true');
                          }
                          setShowOnboarding(false);
                        }}
                        size="lg"
                        className="h-14 px-8 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md transition-all duration-150 bg-primary hover:bg-primary/90"
                      >
                        <Plus className="mr-2 h-5 w-5" />
                        Create Your First Prompt
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          if (typeof window !== 'undefined') {
                            localStorage.setItem('prompts-onboarding-seen', 'true');
                          }
                          setShowOnboarding(false);
                        }}
                        className="text-muted-foreground hover:text-foreground transition-colors duration-200"
                      >
                        I'll explore on my own
                      </Button>
                    </div>
                  </div>
                )}
                {!searchQuery && !showOnboarding && (
                  <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    size="lg"
                    className="h-14 px-8 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md transition-all duration-150 bg-primary hover:bg-primary/90"
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    Create Prompt
                  </Button>
                )}
              </div>
            </div> : <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {prompts.map((prompt, index) => (
                  <div
                    key={prompt.id}
                    className="animate-in fade-in slide-in-from-bottom-4"
                    style={{
                      animationDuration: '400ms',
                      animationDelay: `${index * 50}ms`,
                      animationFillMode: 'backwards'
                    }}
                  >
                    <PromptCard
                      prompt={prompt}
                      user={user}
                      onUpdate={refetch}
                    />
                  </div>
                ))}
              </div>

              {/* Pagination Controls - More Prominent */}
              {pageInfo && pageInfo.pageCount > 1 && (
                <div className="flex items-center justify-between border-t-2 pt-8 mt-8">
                  <div className="text-sm font-medium text-muted-foreground">
                    <span className="text-foreground font-semibold">{pageInfo.itemCount}</span> prompts
                    <span className="mx-2">·</span>
                    Page <span className="text-foreground font-semibold">{pageInfo.currentPage}</span> of {pageInfo.pageCount}
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={!pageInfo.hasPreviousPage}
                      className="font-medium border-2 hover:border-primary hover:text-primary hover:bg-primary/5 disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setPage(p => p + 1)}
                      disabled={!pageInfo.hasNextPage}
                      className="font-medium border-2 hover:border-primary hover:text-primary hover:bg-primary/5 disabled:opacity-40"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}
            </>
            }
            </div>
          )}

          {/* Grouped View */}
          {viewMode === "grouped" && (
            <div
              className={`transition-opacity duration-300 ${isViewTransitioning ? 'opacity-0' : 'opacity-100'}`}
            >
              <PromptsGroupedView
                prompts={prompts}
                onCreateClick={() => setIsCreateModalOpen(true)}
              />
            </div>
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
