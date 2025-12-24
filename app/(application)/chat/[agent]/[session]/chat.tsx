"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useMutation, useQuery } from "@apollo/client";
import { ChatRequestOptions, DefaultChatTransport, DynamicToolUIPart, FileUIPart, lastAssistantMessageIsCompleteWithToolCalls, UIMessage } from "ai";
import { useChat } from '@ai-sdk/react';
import * as React from "react";
import { useContext, useEffect, useState, useMemo } from "react";
import { UserContext } from "@/app/(application)/authenticated";
import { StopIcon } from "@radix-ui/react-icons";
import { AgentSession } from "@EXULU_SHARED/models/agent-session";
import { Loader } from '@/components/ai-elements/loader';
import TextareaAutosize from "react-textarea-autosize";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  GET_USER_BY_ID,
  UPDATE_AGENT_SESSION_RBAC,
  GET_PROMPT_BY_ID,
  GET_PROJECT_BY_ID,
  CREATE_AGENT_SESSION,
  GET_AGENT_SESSIONS,
} from "@/queries/queries";
import { getToken } from "@/util/api"
import { Agent } from "@EXULU_SHARED/models/agent";
import { ConfigContext } from "@/components/config-context";
import { ArrowUp, ChevronsUpDown, FileText } from "lucide-react";
import { SaveWorkflowModal } from "@/components/save-workflow-modal";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CardContent, CardHeader } from "@/components/ui/card";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { RBACControl } from "@/components/rbac";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Loading } from "@/components/ui/loading";
import { Badge } from "@/components/ui/badge";
import { checkChatSessionWriteAccess } from "@/lib/check-chat-session-write-access";
import UppyDashboard, { FileItem, getPresignedUrl } from "@/components/uppy-dashboard";
import { Item } from "@/types/models/item";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import {
  Context,
  ContextTrigger,
  ContextContent,
  ContextContentHeader,
  ContextContentBody,
  ContextInputUsage,
  ContextOutputUsage,
  ContextReasoningUsage,
  ContextCacheUsage,
} from '@/components/ai-elements/context';
import { Progress } from "@/components/ui/progress";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolOutput,
  ToolInput,
} from '@/components/ai-elements/tool';
import { Skeleton } from "@/components/ui/skeleton";
import { MessageRenderer } from "@/components/message-renderer";
import { Response } from '@/components/ai-elements/response';
import AgentVisual from "@/components/lottie";
import Logo from "@/components/logo";
import { PromptSelectorModal } from "./components/prompt-selector-modal";
import { PromptVariableForm } from "./components/prompt-variable-form";
import { PromptLibrary } from "@/types/models/prompt-library";
import { extractVariables, fillPromptVariables } from "@/lib/prompts";
import { useIncrementPromptUsage } from "@/hooks/use-prompts";
import { Project } from "@/types/models/project";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function ChatLayout({
  session,
  agent,
  initialMessages,
}: {
  session: AgentSession | null;
  agent: Agent;
  initialMessages: UIMessage[];
}) {

  const [error, setError] = useState<string | null>(null);
  const configContext = React.useContext(ConfigContext);
  const [files, setFiles] = useState<FileUIPart[] | null>(null);
  const [fileItems, setFileItems] = useState<string[] | null>(null);
  const { user } = useContext(UserContext);
  const [showSaveWorkflowModal, setShowSaveWorkflowModal] = useState(false);
  const [input, setInput] = useState('');
  const [disabledTools, setDisabledTools] = useState<string[]>([]);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [currentSession, setCurrentSession] = useState<AgentSession | null>(session);
  const [createAgentSession] = useMutation(CREATE_AGENT_SESSION, {
    refetchQueries: [
      GET_AGENT_SESSIONS,
      "GetAgentSessions",
      GET_USER_BY_ID,
      "GetUserById"
    ],
  });
  const currentSessionRef = React.useRef<AgentSession | null>(session);

  // Keep ref in sync with state
  React.useEffect(() => {
    currentSessionRef.current = currentSession;
  }, [currentSession]);

  const searchParams = useSearchParams();
  const initialPromptId = searchParams.get("promptId");

  // Prompt selector state
  const [promptSelectorOpen, setPromptSelectorOpen] = useState(false);
  const [promptVariableFormOpen, setPromptVariableFormOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<PromptLibrary | null>(null);
  const [incrementPromptUsage] = useIncrementPromptUsage();

  const [writeAccess, setWriteAccess] = useState<boolean>(currentSession ? checkChatSessionWriteAccess(currentSession, user) : true);

  const [rbac, setRbac] = useState({
    rights_mode: currentSession?.rights_mode || 'private',
    users: currentSession?.RBAC?.users || [],
    roles: currentSession?.RBAC?.roles || [],
    // projects: currentSession?.RBAC?.projects || []
  })

  const creatorQuery = useQuery(GET_USER_BY_ID, {
    variables: { id: currentSession?.created_by },
    skip: !currentSession?.created_by
  })

  const projectQuery = useQuery<{
    projectById: Project;
  }>(GET_PROJECT_BY_ID, {
    variables: { id: currentSession?.project },
    skip: !currentSession?.project
  })

  // Fetch initial prompt if provided
  const { data: initialPromptData } = useQuery<{
    prompt_library_itemById: PromptLibrary;
  }>(GET_PROMPT_BY_ID, {
    variables: { id: initialPromptId },
    skip: !initialPromptId,
  });

  // Track if we've already processed the initial prompt
  const [initialPromptProcessed, setInitialPromptProcessed] = useState(false);

  const [updateAgentSessionRbac, updateAgentSessionRbacResult] = useMutation(UPDATE_AGENT_SESSION_RBAC);
  const [tokenCounts, setTokenCounts] = useState<MessageMetadata>({
    totalTokens: 0,
    reasoningTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    cachedInputTokens: 0
  });

  const {
    messages,
    sendMessage,
    status,
    stop,
    regenerate,
    setMessages,
    addToolResult
  } = useChat({
    messages: initialMessages,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    // Throttle the messages and data updates to 50ms:
    experimental_throttle: 50,
    async onToolCall({ toolCall }) {
      // Check if it's a dynamic tool first for proper type narrowing
      if (toolCall.dynamic) {
        return;
      }

      if (toolCall.toolName === 'getLocation') {
        const cities = ['New York', 'Los Angeles', 'Chicago', 'San Francisco'];

        // No await - avoids potential deadlocks
        addToolResult({
          tool: 'confirm-tool-call',
          toolCallId: toolCall.toolCallId,
          output: cities[Math.floor(Math.random() * cities.length)],
        });
      }
    },
    onError: (error) => {
      console.log("error!!", error?.message)
      try {
        const { message } = JSON.parse(error?.message)
        setError(message)
      } catch (x) {
        setError(error.message)
      }
    },
    transport: new DefaultChatTransport({
      api: `${configContext?.backend}${agent.slug}/${agent.id}`,
      // only send the last message to the server: we load
      // the history from the database.
      prepareSendMessagesRequest: async ({ messages, id: chatId, body }) => {
        const token = await getToken()
        if (!token) {
          throw new Error("No valid session token available.")
        }
        const session = currentSessionRef.current;
        if (!session) {
          throw new Error("No session available.")
        }
        return {
          body: {
            ...body,
            message: messages[messages.length - 1],
            id: chatId,
            session: session.id,
          }, headers: {
            User: user.id,
            Session: session.id,
            Authorization: `Bearer ${token}`,
            Stream: "true"
          }
        };
      },
    })
  });

  type MessageMetadata = {
    totalTokens: number;
    reasoningTokens: number;
    inputTokens: number;
    outputTokens: number;
    cachedInputTokens: number;
  }

  useEffect(() => {
    const totalCount = messages?.reduce((acc, message) => {
      const messageMetadata: MessageMetadata = message.metadata as any;
      return acc + (messageMetadata?.totalTokens || 0);
    }, 0);
    const reasoningCount = messages?.reduce((acc, message) => {
      const messageMetadata: MessageMetadata = message.metadata as any;
      return acc + (messageMetadata?.reasoningTokens || 0);
    }, 0);
    const inputCount = messages?.reduce((acc, message) => {
      const messageMetadata: MessageMetadata = message.metadata as any;
      return acc + (messageMetadata?.inputTokens || 0);
    }, 0);
    const outputCount = messages?.reduce((acc, message) => {
      const messageMetadata: MessageMetadata = message.metadata as any;
      return acc + (messageMetadata?.outputTokens || 0);
    }, 0);
    const cachedInputCount = messages?.reduce((acc, message) => {
      const messageMetadata: MessageMetadata = message.metadata as any;
      return acc + (messageMetadata?.cachedInputTokens || 0);
    }, 0);
    setTokenCounts({
      totalTokens: totalCount,
      reasoningTokens: reasoningCount,
      inputTokens: inputCount,
      outputTokens: outputCount,
      cachedInputTokens: cachedInputCount
    })
  }, [messages])

  // Check if conversation has enough content for a workflow
  const canCreateWorkflow = useMemo(() => {
    const userMessages = messages?.filter(m => m.role === 'user') || [];
    const assistantMessages = messages?.filter(m => m.role === 'assistant') || [];
    return userMessages.length >= 1 && assistantMessages.length >= 1;
  }, [messages]);

  // Prompt selector handlers
  const handleSelectPrompt = (prompt: PromptLibrary) => {
    const variables = extractVariables(prompt.content);

    if (variables.length > 0) {
      // Prompt has variables, show form
      setSelectedPrompt(prompt);
      setPromptVariableFormOpen(true);
    } else {
      // No variables, insert directly
      insertPromptIntoChat(prompt.content);

      // Increment usage count
      incrementPromptUsage({
        variables: {
          id: prompt.id,
          usage_count: (prompt.usage_count || 0) + 1,
        },
      });
    }
  };

  const handleSubmitVariables = (values: Record<string, string>) => {
    if (!selectedPrompt) return;

    const filledPrompt = fillPromptVariables(selectedPrompt.content, values);
    insertPromptIntoChat(filledPrompt);

    // Increment usage count
    incrementPromptUsage({
      variables: {
        id: selectedPrompt.id,
        usage_count: (selectedPrompt.usage_count || 0) + 1,
      },
    });

    setPromptVariableFormOpen(false);
    setSelectedPrompt(null);
  };

  const insertPromptIntoChat = (promptText: string) => {
    // Append to existing input or replace if empty
    setInput((prev) => (prev ? `${prev}\n\n${promptText}` : promptText));

    // Focus the input
    inputRef.current?.focus();
  };

  // Handle initial prompt auto-fill when navigating from empty state
  useEffect(() => {
    if (initialPromptData?.prompt_library_itemById && !initialPromptProcessed) {
      const prompt = initialPromptData.prompt_library_itemById;
      setInitialPromptProcessed(true);
      handleSelectPrompt(prompt);
    }
  }, [initialPromptData, initialPromptProcessed]);

  const onSubmit = async (
    e: React.FormEvent,
    options?: ChatRequestOptions,
  ) => {
    e.preventDefault();

    let sessionToUse = currentSession;

    // If there's no session, create one first
    if (!sessionToUse) {
      try {
        const result = await createAgentSession({
          variables: {
            agent: agent.id,
            user: user.id,
            title: input.substring(0, 50), // Use first 50 chars of message as title
            rights_mode: 'private',
            RBAC: {
              users: [],
              roles: [],
            }
          }
        });

        if (result.data?.agent_sessionsCreateOne?.item) {
          const newSession = result.data.agent_sessionsCreateOne.item as AgentSession;
          newSession.created_by = user.id;
          sessionToUse = newSession;
          setCurrentSession(newSession);
          setWriteAccess(true);

          // Update URL quietly without triggering Next.js routing
          window.history.replaceState(null, '', `/chat/${agent.id}/${newSession.id}`);
        } else {
          setError("Failed to create session. Please try again.");
          return;
        }
      } catch (error) {
        console.error("Failed to create session:", error);
        setError("Failed to create session. Please try again.");
        return;
      }
    }

    sendMessage({
      text: input,
      files: files || []
    }, {
      body: {
        disabledTools: disabledTools,
      },
    });
    setInput('');
    setFiles(null);
    setFileItems(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
    }
  };

  const toggleTool = (id: string) => {
    setDisabledTools(prev =>
      prev.includes(id)
        ? prev.filter(name => name !== id)
        : [...prev, id]
    );
  };

  const updateMessageFiles = async (items: Item[]) => {
    const files = await Promise.all(items.map(async (item) => {

      if (!item.s3key) {
        // Take all item fields and turn into a data url
        let content = "";
        Object.entries(item).forEach(([key, value]) => {
          content += `${key}: ${value}\n`
        })
        return {
          type: "file" as const,
          mediaType: item.type,
          filename: item.name,
          url: `data:text/plain;base64,${btoa(content)}`
        }
      }

      return {
        type: "file" as const,
        mediaType: item.type,
        filename: item.name,
        url: await getPresignedUrl(item.s3key)
      }

    }))
    setFiles(files)
  }

  useEffect(() => {
    if (!fileItems) {
      setFiles(null)
      return;
    }
    updateMessageFiles(fileItems.map(item => ({
      s3key: item,
      name: item,
      type: "file"
    })))
  }, [fileItems])

  return (
    <div className="flex h-full w-full">
      {/* Main conversation area */}
      <div className="flex flex-col flex-1 relative h-[100vh] overflow-hidden">
        {/* Animated gradient at top - moved outside Conversation to prevent scroll interference */}
        <div className={`absolute w-full top-0 z-10 pointer-events-none`}>
          {agent.maxContextLength && (
            <Progress className="w-full rounded-none pointer-events-auto" value={tokenCounts.totalTokens / agent.maxContextLength * 100} />
          )}
          <div className="relative w-full h-[10px] overflow-hidden">
            {/* Primary color gradient in center */}
            <div
              className="absolute inset-0 animate-expand-from-center"
              style={{
                background: 'radial-gradient(ellipse at center, hsl(var(--primary) / 1) 0%, hsl(var(--primary) / 0.5) 70%, transparent 90%)',
                filter: 'blur(10px)',
              }}
            />
            {/* Inverted color gradient on edges */}
            <div
              className="absolute inset-0 animate-expand-from-center"
              style={{
                background: 'radial-gradient(ellipse at center, transparent 30%, hsl(var(--primary) / 0.4) 70%, hsl(var(--primary) / 0.2) 100%)',
                filter: 'blur(10px) hue-rotate(180deg)',
              }}
            />
          </div>
        </div>
        {/* Context/token counter - moved outside Conversation to prevent scroll interference */}
        {agent.maxContextLength ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`absolute w-full top-0 z-10`}>
                  <div className="justify-between flex felx-row">
                    <div></div>
                    <Context
                      maxTokens={agent.maxContextLength || 0}
                      usedTokens={tokenCounts.totalTokens}
                      usage={{
                        inputTokens: tokenCounts.inputTokens,
                        outputTokens: tokenCounts.outputTokens,
                        totalTokens: tokenCounts.totalTokens,
                        cachedInputTokens: tokenCounts.cachedInputTokens,
                        reasoningTokens: tokenCounts.reasoningTokens,
                      }}>
                      <ContextTrigger />
                      <ContextContent>
                        <ContextContentHeader />
                        <ContextContentBody>
                          {/* @ts-ignore */}
                          <ContextInputUsage />
                          {/* @ts-ignore */}
                          <ContextOutputUsage />
                          {/* @ts-ignore */}
                          <ContextReasoningUsage />
                          {/* @ts-ignore */}
                          <ContextCacheUsage />
                        </ContextContentBody>
                      </ContextContent>
                    </Context>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{Intl.NumberFormat('en-US').format(tokenCounts.totalTokens)} / {Intl.NumberFormat('en-US').format(agent.maxContextLength)} tokens in the context window used.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}
        {/* @ts-ignore */}
        <Conversation>
          {messages?.length === 0 ?
            <div className="size-full flex justify-center items-center">
              <div className="flex flex-col gap-4 items-center max-w-2xl w-full px-4 my-auto">
                <Logo alt="Logo" width={120} height={120} className="h-30 w-40 object-contain" />
                <p className="text-center text-lg text-muted-foreground">
                  How can I help you today?
                </p>

                <AgentVisual agent={agent} status={status} className="w-80" />

                {/* Workflow Banner for new users */}
                {/* <Card className="w-full mb-6">
                      <CardHeader className="text-center">
                        <CardTitle className="flex items-center justify-center gap-2">
                          <Workflow className="w-5 h-5" />
                          Create Reusable Workflows
                        </CardTitle>
                        <CardDescription>
                          Turn your conversations into templates that can be reused with different inputs. Perfect for recurring tasks and processes.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="text-muted-foreground"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Save as Workflow
                          <span className="ml-2 text-xs">(Available after chatting)</span>
                        </Button>
                      </CardContent>
                    </Card> */}
              </div>
            </div> : null}
          {/* @ts-ignore */}
          <ConversationContent className="px-6">
            {messages?.length > 0 && (
              <MessageRenderer
                messages={messages}
                config={{
                  marginTopFirstMessage: 'mt-12'
                }}
                status={status}
                onRegenerate={regenerate}
                onAddToolResult={addToolResult}
                UntypedToolPartComponent={UntypedToolPart}
                addToContext={(item) => {
                  setFileItems([...(fileItems || []), item])
                }}
                writeAccess={writeAccess}
              />
            )}
          </ConversationContent>
          {status === "streaming" && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 pointer-events-none">
              <Loader />
            </div>
          )}
          <ConversationScrollButton />
        </Conversation>
        {
          !writeAccess && (
            <div className="px-6 mx-auto mt-3">
              <Badge variant="outline">Read access only</Badge>
            </div>
          )
        }
        {error && (
          <div className="mx-5">
            <Alert className="mb-3" variant="destructive">
              <ExclamationTriangleIcon className="size-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          </div>
        )}
        {writeAccess && (
          <form
            onSubmit={onSubmit}
            className="px-6 border-input border rounded flex mx-5 p-5 flex-col gap-2">
            <div className="items-center flex relative gap-2 w-full">
              {
                configContext?.fileUploads?.s3endpoint && (<UppyDashboard
                  id={`chat-${currentSession?.id || 'new'}`}
                  selectionLimit={10}
                  allowedFileTypes={[
                    ...agent.capabilities?.audio || [],
                    ...agent.capabilities?.video || [],
                    ...agent.capabilities?.files || [],
                    ...agent.capabilities?.images || [],
                  ]}
                  dependencies={[]}
                  onConfirm={(items) => {
                    setFileItems(items)
                  }}
                />)
              }
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      onClick={() => setPromptSelectorOpen(true)}
                    >
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Insert prompt from library</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TextareaAutosize
                autoComplete="off"
                autoFocus={true}
                minRows={1}
                value={input}
                ref={inputRef}
                onKeyDown={handleKeyPress}
                onChange={(e) => setInput(e.target.value)}
                name="message"
                placeholder={`Ask me anything...`}
                className="max-h-40 px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 w-full items-center h-28 resize-none overflow-hidden dark:bg-card/35"
              />
              {status !== "streaming" ? (
                <Button
                  className="shrink-0"
                  variant="secondary"
                  size="icon"
                  disabled={status === "submitted" || !input?.trim()}
                >
                  <ArrowUp className=" size-6 text-muted-foreground" />
                </Button>
              ) : (
                <Button
                  className="shrink-0"
                  variant="secondary"
                  size="icon"
                  onClick={stop}
                >
                  <StopIcon className="size-6 text-muted-foreground" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {/* Show  selected files */}
              {fileItems?.map((item) => (
                <FileItem s3Key={item} disabled={true} active={false} onRemove={() => {
                  setFileItems(fileItems?.filter((i) => i !== item))
                }} />
              ))}
            </div>
          </form>
        )}
        {/* Save Workflow Modal */}
        <SaveWorkflowModal
          isOpen={showSaveWorkflowModal}
          onClose={() => setShowSaveWorkflowModal(false)}
          messages={messages || []}
          sessionTitle={currentSession?.title || 'New Chat'}
        />

        {/* Prompt Selector Modal */}
        <PromptSelectorModal
          open={promptSelectorOpen}
          onOpenChange={setPromptSelectorOpen}
          onSelectPrompt={handleSelectPrompt}
          agentId={agent.id}
        />

        {/* Prompt Variable Form */}
        {selectedPrompt && (
          <PromptVariableForm
            open={promptVariableFormOpen}
            onOpenChange={setPromptVariableFormOpen}
            variables={extractVariables(selectedPrompt.content)}
            promptName={selectedPrompt.name}
            onSubmit={handleSubmitVariables}
          />
        )}
      </div>

      {/* Agent Details Sidebar */}
      {writeAccess && (
        <div className="w-80 border-l bg-muted/20 p-4 space-y-4">
          {
            messages?.length > 0 && (
              <div>
                <AgentVisual agent={agent} status={status} className="w-80" />
              </div>
            )
          }
          <div>
            <p className="text-sm font-medium text-center">{agent.name}</p>
          </div>
          {agent.description && (
            <p className="text-xs text-muted-foreground mt-1">
              {agent.description?.length > 100 ? agent.description?.substring(0, 100) + "..." : agent.description}
            </p>
          )}
          <hr className="my-2" />
          {currentSession && (
            <div className="mt-1">
              <div className="border rounded">
                {
                  creatorQuery.loading && (
                    <div className="flex flex-row justify-between p-3">
                      <p className="text-sm font-medium">Session created by</p>
                      <Loading className="ml-2" />
                    </div>
                  )
                }
                {creatorQuery.data?.userById && !creatorQuery.loading && (
                  <div className="flex flex-row justify-between p-3">
                    <p className="text-sm font-medium">Session created by</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {creatorQuery.data.userById.name ? <p className="text-sm font-medium capitalize">
                        {creatorQuery.data.userById.name}
                      </p> : <p className="text-sm font-medium">{creatorQuery.data.userById.email}</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {currentSession?.project && (
            <div className="mt-1">
              <div className="border rounded">
                {
                  projectQuery.loading && (
                    <div className="flex flex-row justify-between p-3">
                      <p className="text-sm font-medium">This chat is part of a project:</p>
                      <Loading className="ml-2" />
                    </div>
                  )
                }
                {projectQuery.data?.projectById && !projectQuery.loading && (
                  <div className="flex flex-col p-3 gap-2">
                    <p className="text-sm font-medium">Project</p>
                    <Link
                      href={`/projects/${currentSession.project}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {projectQuery.data.projectById.name}
                    </Link>
                    {projectQuery.data.projectById.description && (
                      <p className="text-xs text-muted-foreground">
                        {projectQuery.data.projectById.description}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-muted-foreground pt-2">
              You can disable tools for individual messages in this session by clicking the switch:</p>
            <TooltipProvider>
              <div className="space-y-1 pt-2">
                {agent.tools && agent.tools.length > 0 ? (
                  agent.tools.map((tool, index) => {
                    const isEnabled = !disabledTools.includes(tool.id);
                    return (
                      <Tooltip key={tool.name + "_" + index}>
                        <TooltipTrigger asChild>
                          <div className="p-2 rounded-md border text-xs bg-background flex items-center justify-between">
                            <p className="font-medium flex items-center gap-2 capitalize">
                              {tool.name.replace(/_/g, " ")}
                            </p>
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={() => toggleTool(tool.id)}
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-[200px] text-wrap">{tool.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })
                ) : (
                  <p className="text-xs text-muted-foreground">No tools enabled.</p>
                )}
              </div>
            </TooltipProvider>
          </div>
          {currentSession && (
            <div className="mt-1">
              <Collapsible className="border rounded">
                <CardHeader className="px-3 py-1">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <p className="text-sm font-medium">
                        Access control ({currentSession.rights_mode || "private"})
                      </p>
                    </div>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <ChevronsUpDown className="size-4" />
                        <span className="sr-only">Toggle</span>
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="space-y-4 p-3">
                    <RBACControl
                      allowedModes={['private', 'users', 'roles']}
                      initialRightsMode={currentSession.rights_mode}
                      initialUsers={currentSession.RBAC?.users}
                      initialRoles={currentSession.RBAC?.roles}
                      // initialProjects={currentSession.RBAC?.projects}
                      onChange={(rights_mode, users, roles) => {
                        setRbac({
                          rights_mode,
                          users,
                          roles,
                          // projects
                        })
                      }}
                    />
                    <Button disabled={updateAgentSessionRbacResult.loading} onClick={() => {
                      updateAgentSessionRbac({
                        variables: {
                          id: currentSession.id,
                          rights_mode: rbac.rights_mode,
                          RBAC: {
                            users: rbac.users,
                            roles: rbac.roles,
                            // projects: rbac.projects
                          }
                        }
                      })
                    }}>Save access rights {updateAgentSessionRbacResult.loading && <Loading className="ml-2" />} </Button>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


const UntypedToolPart = ({ untypedToolPart, callId, addToContext }: { untypedToolPart: DynamicToolUIPart, callId: string, addToContext: (item: string) => void }) => {

  const output = untypedToolPart.output as any;
  console.log("output", output)
  // Replace - and _, replace 'tool-' prefix
  let styleToolName = untypedToolPart.type?.replace(/ /g, "-")
  styleToolName = styleToolName?.replace(/tool-/g, "")
  styleToolName = styleToolName?.replace(/_/g, " ")
  styleToolName = styleToolName?.charAt(0).toUpperCase() + styleToolName?.slice(1)

  return <Tool key={callId} className="mt-3" defaultOpen={false}>
    <ToolHeader className="capitalize" type={styleToolName as `tool-${string}`} state={untypedToolPart.state} />
    <ToolContent>
      <ToolInput input={untypedToolPart.input} />
      <ToolOutput
        output={
          output ?
            <Response>
              {typeof output === 'string' ?
                output : JSON.stringify(output, null, 2)
              }
            </Response>
            : !untypedToolPart.errorText && <Skeleton className="h-4 w-full" />
        }
        errorText={untypedToolPart.errorText}
      />
    </ToolContent>
  </Tool >
}