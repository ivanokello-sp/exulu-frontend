"use client"

import { useMutation, useQuery } from "@apollo/client";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { MessageSquarePlus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useContext, useEffect, useState } from "react";
import { UserContext } from "@/app/(application)/authenticated";
import { Agent } from "@EXULU_SHARED/models/agent";
import { AgentSession } from "@EXULU_SHARED/models/agent-session";
import {
  CREATE_AGENT_SESSION,
  GET_AGENT_SESSIONS,
  REMOVE_AGENT_SESSION_BY_ID,
  UPDATE_AGENT_SESSION_TITLE,
} from "@/queries/queries";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import Link from "next/link";
import { checkChatSessionWriteAccess } from "@/lib/check-chat-session-write-access";
import { Skeleton } from "@/components/ui/skeleton";

export function ChatSessionsComponent({ agent, type }: { agent: string, type: string }) {

  const pathname = usePathname();
  const { toast } = useToast();
  const { user } = useContext(UserContext);
  const isMobile = useIsMobile();
  const router = useRouter();
  let [search, setSearch]: any = useState({ searchString: null });
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [sessionDialogMode, setSessionDialogMode] = useState<"create" | "rename">("create");
  const [renameSessionId, setRenameSessionId] = useState<string | null>(null);
  const [sessionDialogName, setSessionDialogName] = useState("");

  const sessionsQuery = useQuery(GET_AGENT_SESSIONS, {
    returnPartialData: true,
    fetchPolicy: "network-only",
    nextFetchPolicy: "network-only",
    variables: {
      page: 1,
      limit: 40,
      filters: {
        agent: {
          eq: agent
        }
      }
    },
  });

  const [removeSession, removeSessionResult] = useMutation(
    REMOVE_AGENT_SESSION_BY_ID,
    {
      refetchQueries: [
        GET_AGENT_SESSIONS,
        "GetAgentSessions",
      ],
    },
  );

  const [createAgentSession, createAgentSessionResult] = useMutation(
    CREATE_AGENT_SESSION,
  );

  const [updateSessionTitle, updateSessionTitleResult] = useMutation(
    UPDATE_AGENT_SESSION_TITLE,
    {
      refetchQueries: [
        GET_AGENT_SESSIONS,
        "GetAgentSessions",
      ],
    },
  );

  useEffect(() => {
    let variables: any = {
      page: 1,
      limit: 40,
    };
    if (search && search?.length > 2) {
      variables.filters = { agent: { eq: agent }, title: { contains: search } };
    } else {
      variables.filters = { agent: { eq: agent } };
    }
    sessionsQuery.refetch(variables);
  }, [search]);

  const handleCreateSession = async () => {
    if (!sessionDialogName.trim()) return;

    const newSession = await createAgentSession({
      variables: {
        user: user.id,
        agent: agent,
        type: "FLOW",
        title: sessionDialogName.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
    if (newSession.errors) {
      console.error("error", newSession.errors);
      toast({
        title: "Error",
        description: "Failed to create session.",
        variant: "destructive",
      });
      return;
    }
    if (
      !newSession.data?.agent_sessionsCreateOne?.item?.id
    ) {
      console.error("error", "failed to create session");
      toast({
        title: "Error",
        description: "Failed to create session.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Session created",
      description: "The session has been created successfully.",
    });

    setSessionDialogOpen(false);
    setSessionDialogName("");
    sessionsQuery.refetch();
    router.push(
      `/chat/${agent}/${newSession.data?.agent_sessionsCreateOne?.item?.id}`,
    );
  }

  const handleRenameSession = async () => {
    if (!renameSessionId || !sessionDialogName.trim()) return;

    const result = await updateSessionTitle({
      variables: {
        id: renameSessionId,
        title: sessionDialogName.trim(),
      },
    });

    if (result.errors) {
      console.error("error", result.errors);
      toast({
        title: "Error",
        description: "Failed to rename session.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Session renamed",
      description: "The session has been renamed successfully.",
    });

    setSessionDialogOpen(false);
    setRenameSessionId(null);
    setSessionDialogName("");
  }

  const handleSessionDialogSubmit = async () => {
    if (sessionDialogMode === "create") {
      await handleCreateSession();
    } else {
      await handleRenameSession();
    }
  }

  return (
    <div
      key={agent + type}
      className="relative hidden flex-col items-start md:flex border-r"
      x-chunk="dashboard-03-chunk-0">
      <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">Sessions</h2>

      <div className={`w-full px-2 flex flex-col items-start gap-0 rounded-none border-none text-left text-sm mb-2`}>
        <div
          key="new-session"
          onClick={() => {
            setSessionDialogMode("create");
            setSessionDialogName("");
            setSessionDialogOpen(true);
          }}
          className={cn(
            `bg-muted cursor-pointer group p-2 w-full flex flex-col items-start gap-2 rounded-md py-2 pl-0 pr-2 text-left text-sm transition-all hover:bg-accent`
          )}
        >
          <div className="flex w-full flex-col px-2">
            <div className="flex items-center justify-between w-full gap-2">
              <div className="flex flex-col min-w-0 flex-1">
                <div className="text-md font-medium truncate flex items-center gap-2">
                  <MessageSquarePlus className="size-4" />
                  <p className="text-sm font-medium">New session</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


      <div className="bg-background/95 w-full px-2 backdrop-blur supports-[backdrop-filter]:bg-background/60 mb-2">
        <form>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
            <Input
              onKeyUp={(e) => {
                const searchString = e.currentTarget.value;
                setSearch(searchString);
              }}
              placeholder="Search sessions"
              className="pl-8 border-0"
            />
          </div>
        </form>
      </div>

      {sessionsQuery.loading && (
        <div className="w-full flex flex-col p-2 pt-0 pb-2">
          <Skeleton className="w-full rounded h-[30px] rounded-md" />
          <Skeleton className="w-full rounded h-[30px] rounded-md mt-3" />
          <Skeleton className="w-full rounded h-[30px] rounded-md mt-3" />
          <Skeleton className="w-full rounded h-[30px] rounded-md mt-3" />
          <Skeleton className="w-full rounded h-[30px] rounded-md mt-3" />
          <Skeleton className="w-full rounded h-[30px] rounded-md mt-3" />
          <Skeleton className="w-full rounded h-[30px] rounded-md mt-3" />
          <Skeleton className="w-full rounded h-[30px] rounded-md mt-3" />
          <Skeleton className="w-full rounded h-[30px] rounded-md mt-3" />
          <Skeleton className="w-full rounded h-[30px] rounded-md mt-3" />
          <Skeleton className="w-full rounded h-[30px] rounded-md mt-3" />
          <Skeleton className="w-full rounded h-[30px] rounded-md mt-3" />
        </div>
      )}

      {!sessionsQuery.loading && !sessionsQuery?.data?.agent_sessionsPagination?.items?.length && (
        <div className="w-full flex">
          <p className="mx-auto mt-5">No sessions found.</p>
        </div>
      )}

      {!sessionsQuery.loading
        ? sessionsQuery?.data?.agent_sessionsPagination?.items?.map(
          (
            item: Omit<AgentSession, "agent"> & {
              agent: Agent;
            },
          ) => {

            const writeAccess = checkChatSessionWriteAccess({
              ...item,
              agent: item.agent.id
            }, user);

            return (
              <div key={item.id} className={`w-full px-2 flex flex-col items-start gap-0 rounded-none border-none text-left text-sm mb-2`}>
                <Link
                  key={item.id}
                  href={`/chat/${agent}/${item.id}`}
                  className={cn(
                    `group p-2 w-full flex flex-col items-start gap-2 rounded-md py-2 pl-0 pr-2 text-left text-sm transition-all hover:bg-accent`,
                    pathname.includes(item.id) && "bg-muted",
                  )}
                >
                  <div className="flex w-full flex-col px-2">
                    <div className="flex items-center justify-between w-full gap-2">
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="text-md font-medium truncate">
                          {item.title
                            ? item.title?.substring(0, 40)
                            : "No title"}
                        </div>

                        <div
                          className={cn(
                            "ml-0 text-xs capitalize max-h-0 opacity-0 overflow-hidden group-hover:max-h-10 group-hover:opacity-100 transition-all duration-200",
                            pathname.includes(item.id)
                              ? "text-foreground"
                              : "text-muted-foreground",
                          )}
                        >
                          {item.updatedAt
                            ? formatDistanceToNow(
                              new Date(item.updatedAt),
                              {
                                addSuffix: true,
                              },
                            )
                            : null}.
                        </div>
                      </div>

                      {writeAccess && (
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="flex size-8 p-0 data-[state=open]:bg-muted flex-shrink-0 max-h-0 max-w-0 opacity-0 group-hover:max-h-10 group-hover:max-w-10 group-hover:opacity-100 transition-all duration-200"
                            >
                              <DotsHorizontalIcon className="size-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-[160px]">
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSessionDialogMode("rename");
                                setRenameSessionId(item.id);
                                setSessionDialogName(item.title || "");
                                setSessionDialogOpen(true);
                              }}>
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => {
                                removeSession({
                                  variables: {
                                    id: item.id,
                                  },
                                });
                                toast({
                                  title: "Deleting session",
                                  description: "We deleted the session.",
                                });
                              }}>
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            )
          },
        )
        : null}

      <Dialog open={sessionDialogOpen} onOpenChange={setSessionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {sessionDialogMode === "create" ? "Create New Session" : "Rename Session"}
            </DialogTitle>
            <DialogDescription>
              {sessionDialogMode === "create"
                ? "Enter a name for your new session."
                : "Enter a new name for this session."}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={sessionDialogName}
            onChange={(e) => setSessionDialogName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSessionDialogSubmit();
              }
            }}
            placeholder="Session name"
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSessionDialogOpen(false);
                setRenameSessionId(null);
                setSessionDialogName("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSessionDialogSubmit}
              disabled={
                (sessionDialogMode === "rename" ? updateSessionTitleResult.loading : createAgentSessionResult.loading)
                || !sessionDialogName.trim()
              }
            >
              {sessionDialogMode === "create" ? "Create" : "Rename"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
