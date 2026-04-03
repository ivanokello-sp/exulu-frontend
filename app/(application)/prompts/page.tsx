"use client";

import { useContext, useState, useEffect } from "react";
import { UserContext } from "@/app/(application)/authenticated";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, ChevronLeft, ChevronRight, FileText, MessageSquare, Tag } from "lucide-react";
import { usePrompts } from "@/hooks/use-prompts";
import { PromptCard } from "./components/prompt-card";
import { PromptEditorModal } from "./components/prompt-editor-modal";
import { PromptFilters } from "./components/prompt-filters";
import { PromptListItem } from "./components/prompt-list-item";
import { PromptPreview } from "./components/prompt-preview";
import { PromptLibrary } from "@/types/models/prompt-library";
import { Badge } from "@/components/ui/badge";
import { useUniquePromptTags } from "@/hooks/use-prompts";

export const dynamic = "force-dynamic";

export default function PromptsPage() {
  const { user } = useContext(UserContext);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<string>("updatedAt");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(50); // Increased for list view
  const [selectedPrompt, setSelectedPrompt] = useState<PromptLibrary | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
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
      // Cmd/Ctrl + /: Focus search
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder="Search prompts..."]') as HTMLInputElement;
        searchInput?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
  }, [searchQuery, sortBy, selectedTags, selectedAgents]);

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
  // Add agent filters - prompts must be assigned to selected agents
  if (selectedAgents.length > 0) {
    selectedAgents.forEach(agentId => {
      filters.push({ assigned_agents: { contains: agentId } });
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

  // Fetch all available tags
  const { data: tagsData } = useUniquePromptTags();
  const availableTags = tagsData?.getUniquePromptTags || [];

  // Auto-select first prompt in list view
  useEffect(() => {
    if (prompts.length > 0 && !selectedPrompt) {
      setSelectedPrompt(prompts[0]);
    }
  }, [prompts, selectedPrompt]);

  // Update selected prompt when prompts data changes (after edit/refetch)
  useEffect(() => {
    if (selectedPrompt && prompts.length > 0) {
      const updatedPrompt = prompts.find(p => p.id === selectedPrompt.id);
      if (updatedPrompt) {
        setSelectedPrompt(updatedPrompt);
      }
    }
  }, [prompts]);

  return (
    <div className="h-full flex-1 flex-col p-4 sm:p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4 border-b border-border/50 pb-4 mb-4">
        <div>
          <h1 className="text-xl font-semibold">Prompt Library</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Craft, organize, and deploy prompts across your AI agents.
          </p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          size="sm"
          className="shrink-0"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          New Prompt
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-0 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search prompts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        <PromptFilters
          sortBy={sortBy}
          onSortChange={setSortBy}
          selectedTags={selectedTags}
          onTagsChange={setSelectedTags}
          selectedAgents={selectedAgents}
          onAgentsChange={setSelectedAgents}
        />
      </div>

      {/* Selectable Tag Chips */}
      {availableTags.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Tag className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground">Folders</p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {availableTags.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <Badge
                  key={tag}
                  variant={isSelected ? "default" : "outline"}
                  className={`capitalize cursor-pointer transition-colors text-xs px-2 py-0.5 ${
                    isSelected
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "hover:bg-accent hover:text-accent-foreground"
                  }`}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedTags(selectedTags.filter((t) => t !== tag));
                    } else {
                      setSelectedTags([...selectedTags, tag]);
                    }
                  }}
                >
                  {tag}
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {/* Prompts Display */}
      {error ? (
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
          {/* List View - Side by Side on Desktop, Stacked on Mobile */}
          <div className="flex flex-col lg:flex-row gap-3 h-auto lg:h-[calc(100vh-220px)]">
              {/* Left Panel - Prompt List */}
              <div className="w-full lg:w-80 xl:w-96 flex flex-col border rounded-lg shadow-sm bg-card overflow-hidden max-h-[50vh] lg:max-h-none">
                <div className="p-3 sm:p-4 border-b bg-muted/30">
                  <p className="text-xs sm:text-sm font-semibold text-muted-foreground">
                    {prompts.length} {prompts.length === 1 ? "prompt" : "prompts"}
                  </p>
                </div>
                <div className="flex-1 overflow-auto">
                  {loading ? (
                    <div className="flex items-center justify-center h-full p-8">
                      <div className="flex items-center gap-3">
                        <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                        <span className="text-sm font-medium text-muted-foreground">Loading...</span>
                      </div>
                    </div>
                  ) : prompts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                      <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        {searchQuery ? "No matches found" : "No prompts yet"}
                      </p>
                      <p className="text-xs text-muted-foreground mb-4">
                        {searchQuery
                          ? "Try a different search term"
                          : "Create your first prompt to get started"}
                      </p>
                      {!searchQuery && (
                        <Button
                          onClick={() => setIsCreateModalOpen(true)}
                          size="sm"
                          className="shadow-md"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          New Prompt
                        </Button>
                      )}
                    </div>
                  ) : (
                    prompts.map((prompt) => (
                      <PromptListItem
                        key={prompt.id}
                        prompt={prompt}
                        isSelected={selectedPrompt?.id === prompt.id}
                        onClick={() => setSelectedPrompt(prompt)}
                        user={user}
                        onDelete={() => {
                          // If deleted prompt was selected, clear selection
                          if (selectedPrompt?.id === prompt.id) {
                            setSelectedPrompt(null);
                          }
                          refetch();
                        }}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Right Panel - Preview */}
              <div className="flex-1 min-w-0 min-h-[400px] lg:min-h-0">
                {selectedPrompt ? (
                  <PromptPreview
                    key={selectedPrompt.id}
                    prompt={selectedPrompt}
                    onUpdate={refetch}
                    onEdit={() => setIsEditModalOpen(true)}
                  />
                ) : (
                  <div className="h-full min-h-[300px] flex items-center justify-center border rounded-lg bg-muted/20">
                    <div className="text-center space-y-3 sm:space-y-4 px-6 sm:px-8">
                      <FileText className="h-12 sm:h-16 w-12 sm:w-16 text-muted-foreground mx-auto" strokeWidth={1.5} />
                      <div className="space-y-1 sm:space-y-2">
                        <p className="text-base sm:text-lg font-semibold text-muted-foreground">
                          Select a prompt to preview
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Choose a prompt from the list to view its details
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
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

      {/* Edit Modal */}
      {selectedPrompt && (
        <PromptEditorModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          prompt={selectedPrompt}
          onSuccess={() => {
            refetch();
            setIsEditModalOpen(false);
          }}
          user={user}
        />
      )}
    </div >
  );
}
