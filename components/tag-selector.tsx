"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUniquePromptTags } from "@/hooks/use-prompts";

interface TagSelectorProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function TagSelector({
  value = [],
  onChange,
  placeholder = "Select or create folders...",
  className,
}: TagSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const { data, loading } = useUniquePromptTags();

  const existingTags = data?.getUniquePromptTags || [];

  // Normalize tags to lowercase for comparison
  const normalizeTag = (tag: string) => tag.trim().toLowerCase();

  // Check if search value would create a new folder
  const isNewTag = searchValue.trim() &&
    !existingTags.some(tag => normalizeTag(tag) === normalizeTag(searchValue)) &&
    !value.some(tag => normalizeTag(tag) === normalizeTag(searchValue));

  const handleToggleTag = (tag: string) => {
    const normalizedTag = normalizeTag(tag);
    const isSelected = value.some(t => normalizeTag(t) === normalizedTag);

    if (isSelected) {
      // Remove tag
      onChange(value.filter(t => normalizeTag(t) !== normalizedTag));
    } else {
      // Add tag (preserve original casing)
      onChange([...value, tag]);
    }
  };

  const handleCreateTag = () => {
    if (isNewTag) {
      onChange([...value, searchValue.trim()]);
      setSearchValue("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const normalizedTag = normalizeTag(tagToRemove);
    onChange(value.filter(t => normalizeTag(t) !== normalizedTag));
  };

  // Filter existing tags based on search and exclude already selected
  const filteredTags = existingTags.filter(tag => {
    const matchesSearch = tag.toLowerCase().includes(searchValue.toLowerCase());
    const notSelected = !value.some(t => normalizeTag(t) === normalizeTag(tag));
    return matchesSearch && notSelected;
  });

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <span className="truncate">
              {value.length === 0
                ? placeholder
                : `${value.length} folder${value.length !== 1 ? "s" : ""} selected`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search or create folders..."
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              {loading ? (
                <CommandEmpty>Loading folders...</CommandEmpty>
              ) : (
                <>
                  {/* Show create new folder option */}
                  {isNewTag && (
                    <CommandGroup heading="Create New">
                      <CommandItem
                        onSelect={handleCreateTag}
                        className="cursor-pointer"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        <span>
                          Create "{searchValue.trim()}"
                        </span>
                      </CommandItem>
                    </CommandGroup>
                  )}

                  {/* Show existing folders */}
                  {filteredTags.length > 0 && (
                    <CommandGroup heading="Existing Folders">
                      {filteredTags.map((tag) => (
                        <CommandItem
                          key={tag}
                          value={tag}
                          onSelect={() => handleToggleTag(tag)}
                          className="cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              value.some(t => normalizeTag(t) === normalizeTag(tag))
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {tag}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  {/* Show empty state */}
                  {!isNewTag && filteredTags.length === 0 && (
                    <CommandEmpty>
                      {searchValue ? "No folders found. Type to create a new folder." : "No folders available."}
                    </CommandEmpty>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected tags display */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-sm">
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="ml-1.5 hover:text-destructive focus:outline-none"
                aria-label={`Remove ${tag}`}
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
