"use client";

import { useContext, useState } from "react";
import { PromptLibrary } from "@/types/models/prompt-library";
import { UserWithRole } from "@/types/models/user";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ThumbsUp,
  Activity,
  Edit,
  Trash2,
  Copy,
  Bot,
  User,
  Clock,
  MoreVertical,
  Share2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { extractVariables } from "@/lib/prompts/extract-variables";
import { fillPromptVariables } from "@/lib/prompts/fill-prompt-variables";
import { checkPromptWriteAccess } from "@/lib/prompts/check-prompt-access";
import { useDeletePrompt, useTogglePromptFavorite } from "@/hooks/use-prompts";
import { toast } from "sonner";
import { useQuery } from "@apollo/client";
import { GET_AGENTS_BY_IDS, GET_USER_BY_ID } from "@/queries/queries";
import { formatDistanceToNow } from "date-fns";
import { PromptVariableForm } from "@/app/(application)/chat/[agent]/[session]/components/prompt-variable-form";
import { VersionHistoryPanel } from "./version-history-panel";
import { UserContext } from "../../authenticated";

interface PromptPreviewProps {
  prompt: PromptLibrary;
  onUpdate?: () => void;
  onEdit?: () => void;
}

export function PromptPreview({ prompt, onUpdate, onEdit }: PromptPreviewProps) {
  const { user } = useContext(UserContext);
  const [isFavoriting, setIsFavoriting] = useState(false);
  const [promptVariableFormOpen, setPromptVariableFormOpen] = useState(false);
  const [deletePrompt] = useDeletePrompt();
  const { toggleFavorite } = useTogglePromptFavorite();

  const hasWriteAccess = checkPromptWriteAccess(prompt, user);
  const variables = extractVariables(prompt.content);
  const isFavorited = prompt.is_favorited || false;

  // Fetch assigned agents
  const { data: agentsData } = useQuery(GET_AGENTS_BY_IDS, {
    variables: { ids: prompt.assigned_agents || [] },
    skip: !prompt.assigned_agents || prompt.assigned_agents.length === 0,
  });

  const assignedAgentNames =
    agentsData?.agentByIds?.map((agent: any) => agent.name) || [];

  // Fetch creator
  const { data: creatorData } = useQuery(GET_USER_BY_ID, {
    variables: { id: prompt.created_by },
    skip: !prompt.created_by,
  });

  const creatorName = creatorData?.userById?.name || "Unknown";

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this prompt?")) {
      try {
        await deletePrompt({ variables: { id: prompt.id } });
        toast.success("Prompt deleted successfully", {
          description: "Prompt deleted successfully.",
        });
        if (onUpdate) {
          onUpdate();
        }
      } catch (error) {
        toast.error("Failed to delete prompt", {
          description: "Failed to delete prompt. Please try again.",
        });
        console.error(error);
      }
    }
  };

  const handleToggleFavorite = async () => {
    if (isFavoriting) return;

    setIsFavoriting(true);
    try {
      await toggleFavorite(
        prompt.id,
        user.id,
        isFavorited,
        prompt.favorite_count,
        undefined
      );
      toast.success(
        isFavorited ? "Removed from favorites" : "Added to favorites",
        {
          icon: isFavorited ? "👎" : "👍",
          duration: 2000,
        }
      );
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      toast.error("Failed to update favorite");
      console.error(error);
    } finally {
      await new Promise(resolve => setTimeout(resolve, 200));
      setIsFavoriting(false);
    }
  };

  const handleCopyContent = () => {
    navigator.clipboard.writeText(prompt.content);
    toast.success("Prompt copied to clipboard", {
      icon: "📋",
      duration: 2000,
    });
  };

  const handleUsePrompt = () => {
    if (variables.length > 0) {
      // Prompt has variables, show form
      setPromptVariableFormOpen(true);
    } else {
      // No variables, copy directly
      navigator.clipboard.writeText(prompt.content);
      toast.success("Prompt copied to clipboard", {
        icon: "📋",
        duration: 2000,
      });
    }
  };

  const handleSubmitVariables = (values: Record<string, string>) => {
    const filledPrompt = fillPromptVariables(prompt.content, values);
    navigator.clipboard.writeText(filledPrompt);
    toast.success("Filled prompt copied to clipboard", {
      icon: "📋",
      duration: 2000,
    });
    setPromptVariableFormOpen(false);
  };

  const handleShareLink = () => {
    const url = `${window.location.origin}/prompts/${prompt.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard", {
      icon: "🔗",
      description: "Share this link to give others access to this prompt",
      duration: 2000,
    });
  };

  // Highlight variables in content
  const renderContentWithVariables = () => {
    if (variables.length === 0) return prompt.content;

    let highlightedContent = prompt.content;
    variables.forEach((variable) => {
      const regex = new RegExp(`\\{${variable}\\}`, 'g');
      highlightedContent = highlightedContent.replace(
        regex,
        `<span class="inline-flex items-center px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-700 dark:text-violet-400 font-mono text-sm border border-violet-500/20">{${variable}}</span>`
      );
    });
    return highlightedContent;
  };

  return (
    <div className="h-full flex flex-col bg-background border rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/20">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-sm font-semibold truncate">{prompt.name}</h2>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleShareLink}
            title="Share link"
          >
            <Share2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7", isFavorited ? "text-amber-500" : "")}
            onClick={handleToggleFavorite}
            disabled={isFavoriting}
          >
            <ThumbsUp className={cn("h-3.5 w-3.5", isFavorited ? "fill-amber-400" : "")} />
          </Button>
          {hasWriteAccess && (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit?.()}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyContent}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Content
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Description */}
        {prompt.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {prompt.description}
          </p>
        )}

        {/* Metadata row */}
        <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            <span>{creatorName}</span>
          </div>
          <span className="text-muted-foreground/40">·</span>
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatDistanceToNow(new Date(prompt.updatedAt), { addSuffix: true })}</span>
          </div>
          <span className="text-muted-foreground/40">·</span>
          <div className="flex items-center gap-1">
            <ThumbsUp className={cn("h-3.5 w-3.5", isFavorited ? "fill-amber-400 text-amber-400" : "")} />
            <span>{prompt.favorite_count || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <Activity className="h-3.5 w-3.5" />
            <span>{prompt.usage_count || 0}</span>
          </div>
        </div>

        {/* Tags & badges */}
        {(variables.length > 0 || (prompt.tags && prompt.tags.length > 0) || assignedAgentNames.length > 0) && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {variables.length > 0 && (
              <Badge variant="outline" className="text-xs border-violet-500/30 bg-violet-500/5 text-violet-400 px-2 py-0.5">
                {variables.length} var{variables.length !== 1 ? "s" : ""}
              </Badge>
            )}
            {prompt.tags?.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs px-2 py-0.5">
                {tag}
              </Badge>
            ))}
            {assignedAgentNames.map((name, i) => (
              <Badge key={i} variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20 px-2 py-0.5">
                <Bot className="h-3 w-3 mr-1" />
                {name}
              </Badge>
            ))}
          </div>
        )}

        {/* Prompt Content */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Content</p>
          <div
            onClick={handleCopyContent}
            className="p-3 rounded-md border bg-muted/20 font-mono text-xs leading-relaxed whitespace-pre-wrap cursor-copy hover:border-primary/40 transition-colors"
            dangerouslySetInnerHTML={{ __html: renderContentWithVariables() }}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleUsePrompt}>
            Use Prompt
          </Button>
          {hasWriteAccess && (
            <Button variant="outline" size="sm" onClick={() => onEdit?.()}>
              <Edit className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Button>
          )}
        </div>

        {/* Version History Panel */}
        <VersionHistoryPanel
          prompt={prompt}
          user={user}
          hasWriteAccess={hasWriteAccess}
          onRestore={() => {
            if (onUpdate) {
              onUpdate();
            }
          }}
        />
      </div>

      {/* Variable Form Modal */}
      {variables.length > 0 && (
        <PromptVariableForm
          open={promptVariableFormOpen}
          onOpenChange={setPromptVariableFormOpen}
          variables={variables}
          promptName={prompt.name}
          onSubmit={handleSubmitVariables}
          submitButtonText="Copy to Clipboard"
        />
      )}
    </div>
  );
}

// Helper function - moved outside component
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
