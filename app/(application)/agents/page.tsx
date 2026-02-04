"use client";

import { useMutation, useQuery } from "@apollo/client";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useContext, useState, useMemo } from "react";
import { UserContext } from "@/app/(application)/authenticated";
import { AgentCard } from "@/app/(application)/agents/components/agent-card";
import { CreateNewAgentCard } from "@/app/(application)/agents/components/create-new-agent-card";
import { CREATE_AGENT, GET_AGENTS } from "@/queries/queries";
import { Agent } from "@EXULU_SHARED//models/agent";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { AgentDetailsSheet } from "./components/agent-details-sheet";
import { useTranslations } from "next-intl";

export const dynamic = "force-dynamic";

export default function AgentsPage() {
  const t = useTranslations();
  const router = useRouter();
  const { user } = useContext(UserContext);
  const company = user.company;
  const [searchQuery, setSearchQuery] = useState("");
  const [showDetails, setShowDetails] = useState<Agent | null>(null);

  const { data, loading: isLoading, error } = useQuery<{
    agentsPagination: {
      items: Agent[]
    }
  }>(GET_AGENTS, {
    variables: {
      page: 1,
      limit: 100,
      filters: [],
      sort: { field: "updatedAt", direction: "DESC" },
    },
  });

  // Filter agents based on search query
  const filteredAgents = useMemo(() => {
    if (!data?.agentsPagination?.items) return [];
    if (!searchQuery.trim()) return data.agentsPagination.items;

    return data.agentsPagination.items.filter(agent =>
      agent.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [data, searchQuery]);

  const [createAgent, createAgentResult] = useMutation(
    CREATE_AGENT,
    {
      onCompleted: (data: {
        agentsCreateOne: { item: { id: string, type: "chat" } };
      }) => {
        console.log(data);
        router.push(`/agents/edit/${data?.agentsCreateOne?.item?.id}`, {
          scroll: false,
        });
      },
    },
  );

  const handleAgentSelect = (agent: Agent) => {
    router.push(`/agents/edit/${agent.id}`, { scroll: false });
  };


  if (error) {
    return (
      <div className="container mx-auto py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">{t('agents.errorLoading')}</h1>
        <p className="text-muted-foreground">
          {t('agents.errorLoadingDescription')}
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('agents.title')}</h1>
        <p className="text-muted-foreground mb-6">
          {t('agents.subtitle')}
        </p>
        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t('agents.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Loading skeleton cards */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-80 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Create new agent card */}
          <CreateNewAgentCard
            createAgent={createAgent}
            createAgentResult={createAgentResult}
            company={company}
          />

          {/* Agent cards */}
          {filteredAgents.map((agent: Agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onSelect={handleAgentSelect}
              showDetails={setShowDetails}
            />
          ))}
        </div>
      )}


      {showDetails && (
        <AgentDetailsSheet
          agentId={showDetails.id}
          open={!!showDetails}
          onOpenChange={() => setShowDetails(null)}
        />
      )}
    </div>
  );
}
