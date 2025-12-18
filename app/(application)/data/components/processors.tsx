"use client"

import { useQuery, useMutation } from "@apollo/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { GET_CONTEXT_BY_ID, PROCESS_ITEM, PROCESS_ITEMS } from "@/queries/queries";
import { Context } from "@/types/models/context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    ArrowLeft,
    ChevronDown,
    Play,
    Loader2,
} from "lucide-react";
import { QueueManagement } from "../../evals/[id]/runs/components/queue-management";
import { QueueJob } from "@/types/models/job";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface DataDisplayProps {
    expand: boolean;
    actions: boolean;
    context: string
}

export function ContextProcessors(props: DataDisplayProps) {

    const [processorsOpen, setProcessorsOpen] = useState(true);
    const router = useRouter();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [filterValues, setFilterValues] = useState<Record<string, string>>({});
    const [limit, setLimit] = useState(10);

    const { data, loading, error } = useQuery<
        { contextById: Context }>(GET_CONTEXT_BY_ID, {
            variables: {
                id: props.context
            }
        });

    const context = data?.contextById;

    const [executeSource, { loading: executingProcessor }] = useMutation(
        PROCESS_ITEMS(props.context),
        {
            onCompleted: (data) => {
                console.log("[EXULU] Processor result", data);
                const result = data[`${props.context}_itemsProcessItems`];
                setDialogOpen(false);
                setFilterValues({});

                toast.success(result.message || "Items processed successfully", {
                    description: result.jobs?.length
                        ? `${result.jobs.length} job(s) scheduled`
                        : result.items?.length
                            ? `${result.items.length} item(s) processed`
                            : undefined
                });
            },
            onError: (error) => {
                toast.error("Failed to execute source", {
                    description: error.message
                });
            }
        }
    );

    const [processItemMutation, processItemMutationResult] = useMutation<{
        [key: string]: {
            message: string;
            jobs: string[];
            results: string[];
        }
    }>(PROCESS_ITEM(props.context), {
        onCompleted: (data) => {
            console.log("data", data);
            const result = data[`${props.context}_itemsProcessItem`];
            toast.success(result.message || "Items processed successfully", {
                description: result.jobs?.length
                    ? `${result.jobs.length} job(s) scheduled`
                    : result.results?.length
                        ? `${result.results.length} item(s) processed`
                        : undefined
            });
        },
        onError: (error) => {
            toast.error("Error processing item", {
                description: error.message,
            })
        }
    });

    const handleTriggerSource = (
        params?: { name: string; description: string; default: string }[]
    ) => {
        // Initialize param values with defaults
        if (params) {
            const initialValues: Record<string, string> = {};
            params.forEach(param => {
                initialValues[param.name] = param.default || '';
            });
            setFilterValues(initialValues);
        }

        setDialogOpen(true);
    };

    const confirmTrigger = () => {
        executeSource({
            variables: {
                limit: limit || 10,
                filters: filterValues,
                sort: {
                    field: "updatedAt",
                    direction: "DESC"
                }
            }
        });
    };

    if (loading) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                <Skeleton className="w-full h-[80px] rounded-md" />
                <Skeleton className="w-full h-[50px] rounded-md mt-3" />
                <Skeleton className="w-full h-[80px] rounded-md mt-3" />
                <Skeleton className="w-full h-[80px] rounded-md mt-3" />
                <Skeleton className="w-full h-[80px] rounded-md mt-3" />
                <Skeleton className="w-full h-[80px] rounded-md mt-3" />
            </div>
        )
    }
    if (error) {
        return (
            <Alert variant="destructive">
                <ExclamationTriangleIcon className="size-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                    {error?.message || "Error loading item."}
                </AlertDescription>
            </Alert>
        )
    }

    return (
        <div className="flex h-full flex-col">
            {props.actions ? (
                <>
                    <div className="flex p-2 justify-between">
                        <div className="flex items-center gap-2"></div>
                        <Button
                            onClick={() => {
                                router.push("/context");
                            }}
                            variant="ghost"
                            size="icon">
                            <ArrowLeft className="size-4" />
                            <span className="sr-only">Back</span>
                        </Button>
                    </div>
                    <Separator />
                </>
            ) : null}
            {context ? (
                <div className="flex flex-1 flex-col">
                    <Card className="border-0 rounded-none">
                        <CardHeader>
                            <CardTitle className="text-lg">Settings</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            <div className="space-y-6 pr-4">
                                <div>
                                    <h2 className="text-xl font-bold">{context.name}</h2>
                                    <p className="text-muted-foreground mt-1">{context.description}</p>
                                    <div className="mt-3 flex items-center">
                                        <span className="text-sm font-medium mr-2">Embedder:</span>
                                        <Badge variant="outline">{context.embedder?.name || "None"} ({context.embedder?.id})</Badge>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 rounded-none">
                        <CardHeader>
                            <CardTitle>Processors</CardTitle>
                            <CardDescription>
                                Processors are used to convert data before generating embeddings.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {context.processor ? (
                                <TooltipProvider>
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Name</TableHead>
                                                    <TableHead>Description</TableHead>
                                                    <TableHead>Queue Configuration</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                <TableRow key={context.processor.name}>
                                                    <TableCell className="font-medium">{context.processor.name}</TableCell>
                                                    <TableCell className="max-w-[300px]">
                                                        {context.processor.description || '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {context.processor.queue ? (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <div className="cursor-help">
                                                                        <Badge variant="outline" className="cursor-help">
                                                                            {context.processor.queue}
                                                                        </Badge>
                                                                    </div>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="max-w-[300px]">
                                                                    <div className="space-y-2">
                                                                        <div>
                                                                            <span className="font-semibold text-xs">Queue:</span>
                                                                            <span className="ml-2 text-xs">{context.processor.queue}</span>
                                                                        </div>
                                                                        {context.processor.trigger && (
                                                                            <div>
                                                                                <span className="font-semibold text-xs">Trigger:</span>
                                                                                <code className="ml-2 text-xs bg-muted px-1 py-0.5 rounded">
                                                                                    {context.processor.trigger}
                                                                                </code>
                                                                            </div>
                                                                        )}
                                                                        {context.processor.timeoutInSeconds !== undefined && (
                                                                            <div>
                                                                                <span className="font-semibold text-xs">Timeout (seconds):</span>
                                                                                <span className="ml-2 text-xs">{context.processor.timeoutInSeconds || "Default (600)"}</span>
                                                                            </div>
                                                                        )}
                                                                        {context.processor.generateEmbeddings !== undefined && (
                                                                            <div>
                                                                                <span className="font-semibold text-xs">Generate Embeddings:</span>
                                                                                <span className="ml-2 text-xs">
                                                                                    {context.processor.generateEmbeddings ? "Enabled" : "Disabled"}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        ) : (
                                                            <span className="text-muted-foreground">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleTriggerSource()}
                                                            title="Manually trigger source"
                                                        >
                                                            <Play className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </div>
                                </TooltipProvider>
                            ) : (
                                <div className="text-center text-muted-foreground p-5 border rounded-md">
                                    No processors found.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Collapsible open={processorsOpen} onOpenChange={setProcessorsOpen}>
                        <Card className="bg-none border-0 rounded-none">
                            <CardHeader>
                                <CollapsibleTrigger asChild>
                                    <div className="flex items-center justify-between cursor-pointer">
                                        <CardTitle>Processors</CardTitle>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                            <ChevronDown className={`h-4 w-4 transition-transform ${processorsOpen ? "" : "-rotate-90"}`} />
                                            <span className="sr-only">Toggle processors</span>
                                        </Button>
                                    </div>
                                </CollapsibleTrigger>
                            </CardHeader>
                            <CollapsibleContent>
                                <CardContent>
                                    {
                                        context.processor ?
                                            <div key={context.processor.queue} className="space-y-4 mb-6">
                                                <Card className="border-l-4 border-l-primary">
                                                    <CardHeader>
                                                        <CardTitle className="text-base flex items-center justify-between">
                                                            <Badge variant="outline">{context.processor.queue}</Badge>
                                                        </CardTitle>
                                                        {context.processor.description && (
                                                            <p className="text-sm text-muted-foreground">{context.processor.description}</p>
                                                        )}
                                                    </CardHeader>
                                                    <CardContent>
                                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                                                            <div className="space-y-1">
                                                                <p className="text-xs text-muted-foreground">Trigger</p>
                                                                <Badge variant="secondary" className="font-mono text-xs">
                                                                    {context.processor.trigger}
                                                                </Badge>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-xs text-muted-foreground">Embeddings</p>
                                                                <Badge
                                                                    variant={context.processor.generateEmbeddings ? "default" : "secondary"}
                                                                    className="text-xs"
                                                                >
                                                                    {context.processor.generateEmbeddings ?
                                                                        "Enabled, this means embeddings will be generated after the processor finishes executing" :
                                                                        "Disabled, this means embeddings will not be generated after the processor finishes executing"
                                                                    }
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                        <Separator className="my-4" />
                                                        <QueueManagement
                                                            queueName={context.processor.queue}
                                                            nameGenerator={(job) => {
                                                                return `Processor update`;
                                                            }}
                                                            retryJob={(job: QueueJob) => {
                                                                if (!job.data?.item) {
                                                                    return;
                                                                }
                                                                processItemMutation({
                                                                    variables: {
                                                                      item: job.data?.item,
                                                                    }
                                                                  });
                                                            }}
                                                        />
                                                    </CardContent>
                                                </Card>
                                            </div> :
                                            <div className="text-center text-muted-foreground p-5 border rounded-md">No processor found.</div>
                                    }
                                </CardContent>
                            </CollapsibleContent>
                        </Card>
                    </Collapsible>
                </div>
            ) : (
                <div className="p-8 text-center text-muted-foreground">
                    Context not found.
                </div>
            )}


            <Dialog modal={false} open={dialogOpen} onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) {
                    setFilterValues({});
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Trigger Source</DialogTitle>
                        <DialogDescription>
                            {context?.processor?.queue ? (
                                <>
                                    Are you sure you want to trigger <strong>{context.processor.name}</strong>?
                                    <br />
                                    <br />
                                    A job will be scheduled and visible in the <span className="font-semibold">{context.processor.queue}</span> queue.
                                </>
                            ) : (
                                <>
                                    Are you sure you want to trigger <strong>{context?.name}</strong>?
                                    <br />
                                    <br />
                                    The processor will be executed immediately without queuing.
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <Label htmlFor={"limit"}>
                        Limit
                        <span className="ml-2 text-xs text-muted-foreground font-normal">
                            Maximum number of items to process.
                        </span>
                    </Label>
                    <Input
                        id={"limit"}
                        value={limit || ''}
                        onChange={(e) => {
                            setLimit(parseInt(e.target.value));
                        }}
                        placeholder="10"
                        type="number"
                        min={1}
                        max={500}
                        disabled={executingProcessor}
                    />
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDialogOpen(false)}
                            disabled={executingProcessor}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={confirmTrigger}
                            disabled={executingProcessor}
                        >
                            {executingProcessor ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Executing...
                                </>
                            ) : (
                                <>
                                    <Play className="mr-2 h-4 w-4" />
                                    Trigger Processor
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}