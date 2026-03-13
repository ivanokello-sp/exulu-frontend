import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Bot } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@apollo/client";
import { GET_AGENTS } from "@/queries/queries";

interface PromptFiltersProps {
  sortBy: string;
  onSortChange: (sort: string) => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  selectedAgents: string[];
  onAgentsChange: (agents: string[]) => void;
}

export function PromptFilters({
  sortBy,
  onSortChange,
  selectedTags,
  onTagsChange,
  selectedAgents,
  onAgentsChange,
}: PromptFiltersProps) {

  // Fetch agents for filter
  const { data: agentsData, loading: agentsLoading } = useQuery(GET_AGENTS, {
    variables: { page: 1, limit: 100, filters: [] },
  });
  const availableAgents = agentsData?.agentsPagination?.items || [];

  const sortOptions = [
    { value: "updatedAt", label: "Recently Updated" },
    { value: "createdAt", label: "Recently Created" },
    { value: "favorite_count", label: "Most Favorited" },
    { value: "usage_count", label: "Most Used" },
    { value: "name", label: "Alphabetical" },
  ];

  const handleToggleAgent = (agentId: string) => {
    if (selectedAgents.includes(agentId)) {
      onAgentsChange(selectedAgents.filter(a => a !== agentId));
    } else {
      onAgentsChange([...selectedAgents, agentId]);
    }
  };

  const handleRemoveAgent = (agentToRemove: string) => {
    onAgentsChange(selectedAgents.filter(a => a !== agentToRemove));
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Sort Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary">
            Sort:{" "}
            {sortOptions.find((opt) => opt.value === sortBy)?.label ||
              "Recently Updated"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Sort By</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup value={sortBy} onValueChange={onSortChange}>
            {sortOptions.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Agent Filter Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <Bot className="h-4 w-4 mr-2" />
            Agents
            {selectedAgents.length > 0 && (
              <Badge variant="secondary" className="ml-2 px-1.5">
                {selectedAgents.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 max-h-[300px] overflow-y-auto">
          <DropdownMenuLabel>Filter by Agents</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {agentsLoading ? (
            <div className="px-2 py-4 text-sm text-muted-foreground text-center">
              Loading agents...
            </div>
          ) : availableAgents.length === 0 ? (
            <div className="px-2 py-4 text-sm text-muted-foreground text-center">
              No agents available
            </div>
          ) : (
            availableAgents.map((agent: any) => (
              <DropdownMenuCheckboxItem
                key={agent.id}
                checked={selectedAgents.includes(agent.id)}
                onCheckedChange={() => handleToggleAgent(agent.id)}
              >
                {agent.name}
              </DropdownMenuCheckboxItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Selected Agents Display */}
      {selectedAgents.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {selectedAgents.map((agentId) => {
            const agent = availableAgents.find((a: any) => a.id === agentId);
            return (
              <Badge key={agentId} variant="default" className="text-sm bg-primary/15 text-primary hover:bg-primary/25 border-primary/20">
                <Bot className="h-3 w-3 mr-1" />
                {agent?.name || agentId}
                <button
                  type="button"
                  onClick={() => handleRemoveAgent(agentId)}
                  className="ml-1.5 hover:text-destructive focus:outline-none"
                  aria-label={`Remove ${agent?.name || agentId} filter`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
