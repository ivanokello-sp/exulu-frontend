import { AgentSelectionModalContentWrapper } from "@/components/agent-selection-dialog";
import { GET_AGENTS } from "@/queries/queries";
import { fetchGraphQLServerSide } from "@/util/fetch-graphql-server-side";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { Bot, ShieldAlert, AlertCircle } from "lucide-react";
import Link from "next/link";

export default async function ChatEmptyPage() {

    try {
        const agents = await fetchGraphQLServerSide(
            GET_AGENTS.loc?.source.body || "",
            {
                page: 1,
                limit: 200,
                filters: [{
                    active: {
                        eq: true
                    }
                }]
            }
        );

        if (!agents?.agentsPagination?.items?.length) {
            return (
                <div className="flex h-full items-center justify-center">
                    <div className="flex flex-col items-center gap-4 text-center max-w-sm px-6">
                        <div className="p-4 rounded-full bg-muted">
                            <ShieldAlert className="size-8 text-muted-foreground" strokeWidth={1} />
                        </div>
                        <div className="space-y-1.5">
                            <h2 className="text-base font-semibold">No agents available</h2>
                            <p className="text-sm text-muted-foreground">
                                You don't have access to any active agents. Contact your administrator to get access.
                            </p>
                        </div>
                        <Link
                            href="/agents"
                            className="text-xs text-primary hover:underline"
                        >
                            Go to agent management →
                        </Link>
                    </div>
                </div>
            );
        }

        // If only one agent available redirect to chat with that agent
        if (agents?.agentsPagination?.items?.length === 1) {
            redirect(`/chat/${agents?.agentsPagination?.items?.[0]?.id}`);
        }

        return (
            <div className="h-full flex flex-col p-6">
                <div className="mb-5">
                    <h1 className="text-lg font-semibold">Select an agent</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Choose an agent to start a conversation.</p>
                </div>
                <AgentSelectionModalContentWrapper />
            </div>
        );
    } catch (error: any) {
        if (isRedirectError(error)) {
            throw error;
        }
        return (
            <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-center max-w-sm px-6">
                    <div className="p-4 rounded-full bg-destructive/10">
                        <AlertCircle className="size-8 text-destructive" strokeWidth={1} />
                    </div>
                    <div className="space-y-1.5">
                        <h2 className="text-base font-semibold">Something went wrong</h2>
                        <p className="text-sm text-muted-foreground">
                            {error instanceof Error ? error.message : "An unexpected error occurred. Please try refreshing the page."}
                        </p>
                    </div>
                </div>
            </div>
        );
    }
}