import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Filter } from "lucide-react";
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
import { useUniquePromptTags } from "@/hooks/use-prompts";

interface PromptFiltersProps {
  sortBy: string;
  onSortChange: (sort: string) => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

export function PromptFilters({
  sortBy,
  onSortChange,
  selectedTags,
  onTagsChange,
}: PromptFiltersProps) {

  const { data: tagsData, loading: tagsLoading } = useUniquePromptTags();
  const availableTags = tagsData?.getUniquePromptTags || [];

  const sortOptions = [
    { value: "updatedAt", label: "Recently Updated" },
    { value: "createdAt", label: "Recently Created" },
    { value: "favorite_count", label: "Most Favorited" },
    { value: "usage_count", label: "Most Used" },
    { value: "name", label: "Alphabetical" },
  ];

  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter(t => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(selectedTags.filter(t => t !== tagToRemove));
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

      {/* Folder Filter Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Folders
            {selectedTags.length > 0 && (
              <Badge variant="secondary" className="ml-2 px-1.5">
                {selectedTags.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Filter by Folders</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {tagsLoading ? (
            <div className="px-2 py-4 text-sm text-muted-foreground text-center">
              Loading folders...
            </div>
          ) : availableTags.length === 0 ? (
            <div className="px-2 py-4 text-sm text-muted-foreground text-center">
              No folders available
            </div>
          ) : (
            availableTags.map((tag) => (
              <DropdownMenuCheckboxItem
                key={tag}
                checked={selectedTags.includes(tag)}
                onCheckedChange={() => handleToggleTag(tag)}
              >
                {tag}
              </DropdownMenuCheckboxItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Selected Tags Display */}
      {selectedTags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {selectedTags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-sm">
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="ml-1.5 hover:text-destructive focus:outline-none"
                aria-label={`Remove ${tag} filter`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
