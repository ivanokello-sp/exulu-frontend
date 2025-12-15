"use client"

import { DynamicToolUIPart, UIMessage } from "ai"
import { Message, MessageContent } from '@/components/ai-elements/message'
import { Actions, Action } from '@/components/ai-elements/actions'
import { Response } from '@/components/ai-elements/response'
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@/components/ai-elements/reasoning"
import { Source, Sources, SourcesContent, SourcesTrigger } from "@/components/ai-elements/source"
import { RefreshCcwIcon, CopyIcon, ChevronDown, ChevronRight, Search, FileText, Database } from "lucide-react"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { useToast } from "@/components/ui/use-toast"
import { TodoList } from "./ai-elements/todo-list"
import { FileItem } from "./uppy-dashboard"
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation"
import { KnowledgeSourceSearchResultChunk } from "@/types/models/knowledge-source-search-results"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useState } from "react"

interface ItemWithChunks {
  id: string,
  external_id: string,
  name: string,
  updatedAt: string,
  createdAt: string,
  context: {
    name: string,
    id: string
  },
  chunks: KnowledgeSourceSearchResultChunk[]
}

function camelCaseToLabel(camelCaseString) {
  if (!camelCaseString || typeof camelCaseString !== 'string') {
    return ''; // Return empty string for null, undefined, or non-string inputs
  }

  // 1. Insert a space before all capital letters that are not at the start of the string.
  let spacedString = camelCaseString.replace(/([A-Z])/g, ' $1');

  // 2. Trim any leading/trailing spaces (if they were introduced at the beginning).
  let trimmedString = spacedString.trim();

  // 3. Capitalize the first letter of the resulting string.
  let finalLabel = trimmedString.charAt(0).toUpperCase() + trimmedString.slice(1);

  return finalLabel;
}

interface MessageRendererProps {
  messages: UIMessage[]
  status?: "streaming" | "idle" | "error" | "submitted" | "ready"
  className?: string
  showActions?: boolean
  onRegenerate?: () => void
  onAddToolResult?: (args: { tool: string; toolCallId: string; output: string }) => void
  UntypedToolPartComponent?: React.ComponentType<{
    untypedToolPart: DynamicToolUIPart
    callId: string
    addToContext: (item: any) => void
  }>
  addToContext?: (item: any) => void
  writeAccess?: boolean
  config?: {
    marginTopFirstMessage?: string
    customAssistantClassnames?: string
  }
}

export function MessageRenderer({
  messages,
  status = "idle",
  className,
  showActions = true,
  onRegenerate,
  onAddToolResult,
  UntypedToolPartComponent,
  addToContext,
  writeAccess = true,
  config
}: MessageRendererProps) {
  const { toast } = useToast()

  const todoToolType = 'tool-todo_write';
  
  // 1. Find all message indices that contain the specified tool part
  const todoMessageIndices = messages
    ?.map((message, index) => ({
      index,
      hasTodoPart: message.parts.some(part => part.type.toLowerCase() === todoToolType)
    }))
    .filter(item => item.hasTodoPart)
    .map(item => item.index) ?? [];

  // 2. Determine which messages to keep and which to filter out
  let filteredMessages = messages;
  
  if (todoMessageIndices.length > 1) {
    // If there is more than one message with the todo part, filter out all but the last one.
    const lastIndex = todoMessageIndices[todoMessageIndices.length - 1];
    
    // Create a Set of indices to be removed for quick lookup
    const indicesToRemove = new Set(todoMessageIndices.filter(index => index !== lastIndex));

    filteredMessages = messages?.filter((_, index) => !indicesToRemove.has(index));
  }
  
  // Use filteredMessages in the rendering logic
  const messagesToRender = filteredMessages;


  return (
    <>
      {messagesToRender?.map((message, messageIndex) => {
        const isFirstMessage = messageIndex === 0
        const messageMetadata = message.metadata as any
        // iterate through all parts and find the ones that have a type of 'text' and contain '<file name="', if so
        // extract the filename and content, and return an array of objects with the filename and content
        // Remove the <file name="...">...</file> from the text and return the text without the file parts
        const files: { s3Key: string, content: string }[] = message.parts.filter(
          (part) => part.type === 'text' &&
            part.text?.includes('<file name="')
        )?.flatMap((part) => {
          const fileParts = (part as any).text.match(/<file name="([^"]+)">([^<]+)<\/file>/g);
          return fileParts?.map((filePart) => {
            console.log("filePart", filePart);
            const s3Key = filePart.match(/<file name="([^"]+)">/)?.[1] ?? '';
            console.log("s3Key", s3Key);
            const content = filePart.match(/<file name="([^"]+)">([^<]+)<\/file>/)?.[2] ?? '';
            return { s3Key, content } as { s3Key: string, content: string };
          }) ?? []
        }) ?? [];
        console.log("files", files);
        return (
          <Message
            className={cn(
              message.role === 'assistant' && (
                config?.customAssistantClassnames ? config?.customAssistantClassnames : ''
              ),
              isFirstMessage && (
                config?.marginTopFirstMessage ? config?.marginTopFirstMessage : 'mt-12'
              ), className
            )}
            from={message.role}
            key={message.id}
          >
            <MessageContent>
              {message.parts.map((part, i) => {
                if (part.type === 'step-start') {
                  return null
                }

                if (part.type === 'text') {
                  let text = part.text.replace(/<file name="([^"]+)">([^<]+)<\/file>/g, '');
                  return <Response className="chat-response-container" key={`${message.id}-${i}` + "_response"}>
                    {text}
                  </Response>
                }

                if (part.type === 'tool-askForConfirmation' && onAddToolResult) {
                  const callId = part.toolCallId

                  switch (part.state) {
                    case 'input-streaming':
                      return (
                        <div key={callId}>Loading confirmation request...</div>
                      )
                    case 'input-available':
                      return (
                        <div key={callId}>
                          {(part.input as { message: string }).message}
                          <div>
                            <button
                              onClick={() =>
                                onAddToolResult({
                                  tool: 'askForConfirmation',
                                  toolCallId: callId,
                                  output: 'Yes, confirmed',
                                })
                              }
                            >
                              Yes
                            </button>
                            <button
                              onClick={() =>
                                onAddToolResult({
                                  tool: 'askForConfirmation',
                                  toolCallId: callId,
                                  output: 'No, denied',
                                })
                              }
                            >
                              No
                            </button>
                          </div>
                        </div>
                      )
                    case 'output-available':
                      return (
                        <div key={callId}>
                          Tool call allowed: {part.output as string}
                        </div>
                      )
                    case 'output-error':
                      return <div key={callId}>Error: {part.errorText}</div>
                  }
                }

                if (part.type?.toLowerCase().includes('preview_pdf') || part.type?.toLowerCase().includes('pdf_file_in_a_web_view')) {
                  const dynamicToolPart = part as any;
                  const output = JSON.parse(dynamicToolPart.output?.result ?? '{}') as {
                    url: string
                    page: number
                  };
                  if (!output?.url) {
                    return <div>No URL provided for PDF preview {JSON.stringify(output)}</div>;
                  }
                  const pdfUrl = `${output.url}#page=${output.page ?? 1}`;
                  return <iframe src={pdfUrl} style={{ width: '100%', height: '100vh' }} title="PDF viewer" />
                }

                if (part.type?.toLowerCase() === 'tool-todo_write') {
                  const dynamicToolPart = part as any;
                  const output = dynamicToolPart.output as {
                    result: {
                      content: string
                      status: "pending" | "in_progress" | "completed" | "cancelled"
                      priority: "high" | "medium" | "low"
                      id: string
                    }[]
                  };
                  if (!output?.result) {
                    return null;
                  }
                  const state: "input-streaming" | "input-available" | "output-available" | "output-error" = dynamicToolPart.state;
                  return (
                    <TodoList todos={output.result} showPriority={true} state={state} />
                  )
                }
                
                if (part.type?.toLowerCase() === 'tool-todo_read') {
                  return null;
                }

                if (part.type?.toLowerCase().includes('context_search')) {
                  const dynamicToolPart = part as any;
                  let output = dynamicToolPart.output as {
                    result: KnowledgeSourceSearchResultChunk[]
                  };
                  if (typeof output === "string") {
                    output = JSON.parse(output)
                  }
                  if (typeof output?.result === "string") {
                    output.result = JSON.parse(output?.result)
                  }
                  console.log("output", output);
                  console.log("output.result", output?.result);
                  if (!output?.result?.length) {
                    return null;
                  }
                  // Map the chunks to items
                  const itemsMap = new Map<string, ItemWithChunks>();
                  const context = output.result[0]?.context?.name;
                  for (const chunk of output.result) {
                    if (itemsMap.has(chunk.item_id)) {
                      itemsMap.get(chunk.item_id)?.chunks.push(chunk);
                    } else {
                      itemsMap.set(chunk.item_id, {
                        id: chunk.item_id,
                        updatedAt: chunk.item_updated_at,
                        createdAt: chunk.item_created_at,
                        external_id: chunk.item_external_id,
                        name: chunk.item_name,
                        context: {
                          name: chunk.context?.name,
                          id: chunk.context?.id
                        },
                        chunks: [chunk]
                      });
                    }
                  }
                  return (
                    <ContextSearchResults
                      key={`${message.id}-${i}`}
                      input={dynamicToolPart.input}
                      context={context}
                      items={Array.from(itemsMap.values())}
                      totalChunks={output.result.length}
                    />
                  )
                }

                if (
                  (part.type.startsWith('tool-') || part.type === 'dynamic-tool') &&
                  UntypedToolPartComponent &&
                  addToContext
                ) {
                  const untypedToolPart = part as DynamicToolUIPart
                  const callId = untypedToolPart.toolCallId
                  return (
                    <UntypedToolPartComponent
                      key={callId}
                      untypedToolPart={untypedToolPart}
                      callId={callId}
                      addToContext={addToContext}
                    />
                  )
                }

                if (part.type === 'file') {
                  if (part.mediaType?.startsWith('image/')) {
                    return (
                      <Image
                        key={`${message.id}-${i}`}
                        src={part.url}
                        width={300}
                        height={300}
                        alt={"Generated image"}
                      />
                    )
                  }
                }

                if (part.type === 'source-url') {
                  return (
                    <Sources key={`${message.id}-${i}`}>
                      <SourcesTrigger
                        count={message.parts.filter(
                          (part) => part.type === 'source-url'
                        ).length}
                      />
                      <SourcesContent key={`${message.id}`}>
                        {message.parts.map((part, i) => {
                          switch (part.type) {
                            case 'source-url':
                              return (
                                <Source
                                  key={`${message.id}-${i}`}
                                  href={part.url}
                                  title={part.title}
                                />
                              )
                          }
                        })}
                      </SourcesContent>
                    </Sources>
                  )
                }

                if (part.type === 'reasoning') {
                  return (
                    <Reasoning
                      key={`${message.id}-${i}`}
                      className="w-full"
                      isStreaming={status === 'streaming'}
                    >
                      <ReasoningTrigger />
                      <ReasoningContent>{part.text}</ReasoningContent>
                    </Reasoning>
                  )
                }

                return null
              })}

              {files.length > 0 && (
                <div className="grid grid-cols-6 min-w-[500px] gap-2 mt-3 mb-3">
                  {files.map((file) => (
                    <FileItem key={file.s3Key + "_file_item_" + message.id} s3Key={file.s3Key} onRemove={() => { }} active={false} disabled={false} />
                  ))}
                </div>
              )}

              {showActions && message.role === 'assistant' && (
                <Actions className="mt-2">
                  {onRegenerate && (
                    <Action
                      onClick={() => onRegenerate()}
                      label="Retry"
                      disabled={!writeAccess}
                    >
                      <RefreshCcwIcon className="size-3" />
                    </Action>
                  )}
                  <Action
                    onClick={() => {
                      navigator.clipboard.writeText(
                        message.parts.map((part: any) => part?.text || "").join('\n')
                      )
                      toast({
                        title: "Copied message",
                        description: "The message was copied to your clipboard.",
                      })
                    }}
                    label="Copy"
                  >
                    <CopyIcon className="size-3" />
                  </Action>
                  {messageMetadata?.totalTokens && (
                    <small className="text-muted-foreground">
                      {Intl.NumberFormat('en-US').format(messageMetadata?.totalTokens)} tokens
                    </small>
                  )}
                </Actions>
              )}
            </MessageContent>
          </Message>
        )
      })}
    </>
  )
}

const ContextSearchResults = ({
  context,
  input,
  items,
  totalChunks
}: {
  context: string;
  input: Record<string, any>;
  items: ItemWithChunks[];
  totalChunks: number;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAllItems, setShowAllItems] = useState(false);

  const uniqueContexts = new Set(items.map(item => item.context.name));
  const displayItems = showAllItems ? items : items.slice(0, 3);

  return (
    <div className="my-3 border rounded-lg overflow-hidden bg-card">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-primary/10">
                <Search className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <div className="font-medium text-sm flex items-center gap-2">
                  Context Search Results for {context}
                  <Badge variant="secondary" className="text-xs">
                    {items.length} {items.length === 1 ? 'item' : 'items'}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {totalChunks} chunks
                  </span>
                  {uniqueContexts.size > 0 && (
                    <span className="flex items-center gap-1">
                      <Database className="h-3 w-3" />
                      {uniqueContexts.size} {uniqueContexts.size === 1 ? 'context' : 'contexts'}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {isOpen ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t">
            {/* Search Parameters */}
            {Object.keys(input).length > 0 && (
              <div className="p-4 bg-muted/30 border-b">
                <div className="text-xs font-medium text-muted-foreground mb-2">Search Parameters</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(input).map(([key, value]) => (
                    <Badge key={key} variant="outline" className="text-xs">
                      <span className="font-medium">{camelCaseToLabel(key)}:</span>
                      <span className="ml-1 font-normal">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Results Grid */}
            <div className="p-4">
              {items.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 gap-3">
                    {displayItems.map((item) => (
                      <SearchResultItem key={item.id} item={item} />
                    ))}
                  </div>
                  {items.length > 3 && (
                    <div className="mt-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAllItems(!showAllItems);
                        }}
                        className="text-sm text-primary hover:underline"
                      >
                        {showAllItems ? 'Show less' : `Show ${items.length - 3} more items`}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No items found.
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

const SearchResultItem = ({ item }: { item: ItemWithChunks }) => {

  const router = useRouter();

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (<Card className="group relative overflow-hidden hover:shadow-md transition-all duration-200 hover:border-primary/50 cursor-pointer" onClick={() => {
    router.push(`/data/${item.context.id}/${item.id}`);
  }}>
    <CardContent className="p-4">
      {/* Item Name */}
      <div className="mb-2">
        <h4 className="font-medium text-sm line-clamp-2">
          {item.name || "Untitled"}
        </h4>
      </div>

      {item.external_id && (
        <small className="text-xs text-muted-foreground">
          {item.context.name} {item.external_id && `| ${item.external_id}`} | {item.id}
        </small>
      )}

      {/* Metadata Section */}
      <div className="space-y-2 pt-2 border-t">
        {/* Context Type */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {item.updatedAt && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDate(item.updatedAt)}
            </span>
          )}
        </div>

        {/* Text Length Indicator */}
        {item.chunks && item.chunks.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="text-xs">• {item.chunks.length} chunks</span>
          </div>
        )}
        {/* TODO provide a dialog modal that allows the user to view the chunks */}
        {/* TODO if metadata includes a source file name, show a link to the file */}
      </div>
    </CardContent>
  </Card>)
}