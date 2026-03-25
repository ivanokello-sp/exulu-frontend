"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@apollo/client";
import { GET_AGENT_BY_ID } from "@/queries/queries";
import { ExuluTool } from "@EXULU_SHARED/models/tool";
import { AgentToolCard } from "./agent-tool-card";
import { Badge } from "@/components/ui/badge";
import { Network, Layers } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AgentHierarchyViewProps {
  tools: ExuluTool[];
  enabledTools: any[];
  onToggle: (tool: ExuluTool, enabled: boolean) => void;
  onConfigUpdate: (toolId: string, value: any, name: string) => void;
  sheetOpen: boolean | string;
  setSheetOpen: (open: boolean | string) => void;
  variables: any[];
  renderConfigElement: (tool: ExuluTool, config: any[], update: (value: any, name: string) => void) => React.ReactNode;
}

/**
 * Component to display tools with special handling for agents,
 * showing their hierarchical capabilities
 */
export function AgentHierarchyView({
  tools,
  enabledTools,
  onToggle,
  onConfigUpdate,
  sheetOpen,
  setSheetOpen,
  variables,
  renderConfigElement,
}: AgentHierarchyViewProps) {
  // Separate agents from regular tools
  const { agentTools, regularTools } = useMemo(() => {
    const agents: ExuluTool[] = [];
    const regular: ExuluTool[] = [];

    tools.forEach(tool => {
      if (tool.category === "agents") {
        agents.push(tool);
      } else {
        regular.push(tool);
      }
    });

    return {
      agentTools: agents,
      regularTools: regular,
    };
  }, [tools]);

  return (
    <div className="space-y-6">
      {/* Agent Tools Section */}
      {agentTools.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Network className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-medium">Sub-Agents</h3>
              <p className="text-xs text-muted-foreground">
                These agents can be called as tools, each with their own capabilities and sub-tools
              </p>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="secondary" className="ml-auto">
                    {agentTools.filter(t => enabledTools.some(et => et.id === t.id)).length}/{agentTools.length} enabled
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Agent tools can delegate tasks to specialized sub-agents</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="space-y-2">
            {agentTools.map((tool) => {
              const isEnabled = enabledTools.some(et => et.id === tool.id);
              const config = enabledTools.find(et => et.id === tool.id)?.config || [];

              return (
                <AgentToolWithDetails
                  key={tool.id}
                  tool={tool}
                  isEnabled={isEnabled}
                  config={config}
                  onToggle={(enabled) => onToggle(tool, enabled)}
                  onConfigUpdate={(value, name) => onConfigUpdate(tool.id, value, name)}
                  sheetOpen={sheetOpen}
                  setSheetOpen={setSheetOpen}
                  variables={variables}
                  renderConfigElement={renderConfigElement}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Regular Tools Section */}
      {regularTools.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b">
            <div className="p-1.5 rounded-md bg-muted">
              <Layers className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-medium">Tools</h3>
              <p className="text-xs text-muted-foreground">
                Standard tools with specific functionalities
              </p>
            </div>
            <Badge variant="outline" className="ml-auto">
              {regularTools.filter(t => enabledTools.some(et => et.id === t.id)).length}/{regularTools.length} enabled
            </Badge>
          </div>

          <div className="space-y-2">
            {regularTools.map((tool) => {
              const isEnabled = enabledTools.some(et => et.id === tool.id);
              const config = enabledTools.find(et => et.id === tool.id)?.config || [];

              return (
                <AgentToolCard
                  key={tool.id}
                  tool={tool}
                  isEnabled={isEnabled}
                  config={config}
                  onToggle={(enabled) => onToggle(tool, enabled)}
                  onConfigUpdate={(value, name) => onConfigUpdate(tool.id, value, name)}
                  sheetOpen={sheetOpen}
                  setSheetOpen={setSheetOpen}
                  variables={variables}
                  renderConfigElement={renderConfigElement}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Wrapper component that fetches agent details and passes them to AgentToolCard
 */
function AgentToolWithDetails({
  tool,
  isEnabled,
  config,
  onToggle,
  onConfigUpdate,
  sheetOpen,
  setSheetOpen,
  variables,
  renderConfigElement,
}: {
  tool: ExuluTool;
  isEnabled: boolean;
  config: any[];
  onToggle: (enabled: boolean) => void;
  onConfigUpdate: (value: any, name: string) => void;
  sheetOpen: boolean | string;
  setSheetOpen: (open: boolean | string) => void;
  variables: any[];
  renderConfigElement: (tool: ExuluTool, config: any[], update: (value: any, name: string) => void) => React.ReactNode;
}) {
  // Fetch agent details only if this is an enabled agent
  const { data, loading } = useQuery(GET_AGENT_BY_ID, {
    variables: { id: tool.id },
    skip: !isEnabled || tool.category !== "agents",
  });

  // Parse agent details to extract tool/sub-agent counts
  const agentDetails = useMemo(() => {
    if (!data?.agentById) return undefined;

    const agentData = data.agentById;
    let toolsArray: any[] = [];

    try {
      // Handle both string and object formats for tools
      toolsArray = typeof agentData.tools === "string"
        ? JSON.parse(agentData.tools)
        : agentData.tools || [];
    } catch (e) {
      console.error("Failed to parse agent tools:", e);
    }

    // Count sub-agents (tools with category "agents")
    const subAgentCount = toolsArray.filter(t => {
      // Handle different possible formats
      if (typeof t === "string") return false;
      return t.category === "agents" || t.type === "agent";
    }).length;

    const toolCount = toolsArray.length - subAgentCount;

    return {
      toolCount,
      subAgentCount,
      capabilities: agentData.capabilities || [],
    };
  }, [data]);

  return (
    <AgentToolCard
      tool={tool}
      isEnabled={isEnabled}
      config={config}
      onToggle={onToggle}
      onConfigUpdate={onConfigUpdate}
      sheetOpen={sheetOpen}
      setSheetOpen={setSheetOpen}
      variables={variables}
      renderConfigElement={renderConfigElement}
      agentDetails={agentDetails}
    />
  );
}
