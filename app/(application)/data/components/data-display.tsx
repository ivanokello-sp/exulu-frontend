"use client"

import { useQuery, useMutation } from "@apollo/client";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Archive,
  ChevronsUpDown,
  Edit,
  Expand,
  MessageCirclePlus,
  MoreVertical,
  PackageOpen,
  SaveIcon,
  Trash2,
  XCircle,
  XSquare,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { CodePreview } from "@/components/custom/code-preview";
import { TextPreview } from "@/components/custom/text-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loading } from "@/components/ui/loading";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { Item } from "@EXULU_SHARED/models/item";
import { Context } from "@/types/models/context";
import { DELETE_CHUNKS, DELETE_ITEM, GENERATE_CHUNKS, GET_ITEM_BY_ID, PROCESS_ITEM, UPDATE_ITEM } from "@/queries/queries";
import { RBACControl } from "@/components/rbac";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import UppyDashboard, { FileDataCard } from "@/components/uppy-dashboard";

interface DataDisplayProps {
  actions: boolean;
  itemId: string | null;
  context: Context;
}

export function DataDisplay(props: DataDisplayProps) {

  const [data, setData] = useState<Item>();
  const router = useRouter();

  const [rbac, setRbac] = useState<{
    rights_mode?: 'private' | 'users' | 'roles' | 'public' /* | 'projects' */;
    users?: Array<{ id: number; rights: 'read' | 'write' }>;
    roles?: Array<{ id: string; rights: 'read' | 'write' }>;
    // projects?: Array<{ id: string; rights: 'read' | 'write' }>;
  }>()

  const context = props.context;
  const fields = props.context.fields.map(field => field.name);

  console.log("fields", fields);
  console.log("context", context);

  const [retryCount, setRetryCount] = useState(0);

  // Validate itemId before using it - must be a non-empty string
  const isValidItemId = props.itemId && 
    typeof props.itemId === 'string' && 
    props.itemId.trim() !== '' &&
    props.itemId !== 'null' &&
    props.itemId !== 'undefined';
  
  // Skip query if no valid itemId or context
  const shouldSkip = !isValidItemId || !props.context?.id;

  // Memoize query config to ensure variables are only set when not skipping
  const queryConfig = useMemo(() => {
    if (shouldSkip) {
      return {
        skip: true,
        fetchPolicy: "no-cache" as const,
        nextFetchPolicy: "network-only" as const,
        errorPolicy: "all" as const,
      };
    }
    return {
      skip: false,
      variables: {
        id: props.itemId!
      },
      fetchPolicy: "no-cache" as const,
      nextFetchPolicy: "network-only" as const,
      errorPolicy: "all" as const,
    };
  }, [shouldSkip, props.itemId]);

  const { loading, error, refetch } = useQuery<{
    item: Item;
  }>(GET_ITEM_BY_ID(props.context.id, fields, true), {
    ...queryConfig,
    onError: (error) => {
      // Check if error is due to null ID - this shouldn't happen if skip is working
      if (error.message?.includes('must not be null') || error.message?.includes('Variable "$id"')) {
        console.warn("[DataDisplay] Query attempted with null/undefined ID. itemId:", props.itemId, "shouldSkip:", shouldSkip);
        return; // Don't log this as it's a validation issue
      }
      // Only log errors if we're not in a retry cycle (to avoid spam)
      if (retryCount === 0) {
        console.error("[DataDisplay] GraphQL error:", error);
        console.error("[DataDisplay] Error message:", error.message);
        console.error("[DataDisplay] GraphQL error details:", error.graphQLErrors);
        console.error("[DataDisplay] Network error:", error.networkError);
        if (error.networkError) {
          const netErr = error.networkError as any;
          console.error("[DataDisplay] Network error status:", netErr.statusCode);
          console.error("[DataDisplay] Network error body:", netErr.bodyText);
          if (netErr.result) {
            console.error("[DataDisplay] Network error result:", netErr.result);
          }
        }
        if (error.graphQLErrors && error.graphQLErrors.length > 0) {
          error.graphQLErrors.forEach((err, idx) => {
            console.error(`[DataDisplay] GraphQL Error ${idx}:`, err.message, err.extensions);
          });
        } else if (error.networkError) {
          // If it's a network error, try to parse the response
          try {
            const response = (error.networkError as any).result;
            if (response && response.errors) {
              console.error("[DataDisplay] Errors from network response:", response.errors);
            }
          } catch (e) {
            console.error("[DataDisplay] Could not parse network error:", e);
          }
        }
      }
      // If we're retrying and get an error, don't log it (it's expected during retries)
    },
    onCompleted: (data) => {
      console.log("[DataDisplay] Query completed, data:", data);
      console.log("[DataDisplay] Looking for key:", props.context.id + "_itemsById");
      console.log("[DataDisplay] Available keys:", Object.keys(data));
      const item = data[props.context.id + "_itemsById"];
      if (!item) {
        console.error("[DataDisplay] Item not found in query response, retry count:", retryCount);
        console.error("[DataDisplay] Context ID:", props.context.id, "Item ID:", props.itemId);
        // Retry up to 5 times with short delays (for newly created items)
        if (retryCount < 5) {
          setTimeout(() => {
            setRetryCount(retryCount + 1);
            refetch();
          }, 300); // Retry every 300ms
        }
        return;
      }
      setData({
        ...item,
        tags: item.tags ? item.tags.split(",") : [],
      });

      setRbac({
        rights_mode: item.rights_mode,
        users: item.RBAC?.users,
        roles: item.RBAC?.roles,
        // projects: item.RBAC?.projects
      })
      setRetryCount(0); // Reset retry count on success
    }
  });

  useEffect(() => {
    refetch();
  }, [props.itemId]);


  const [updateItemMutation, updateItemMutationResult] = useMutation<{
    [key: string]: {
      job: string;
      item: {
        name?: string;
        archived?: boolean;
        description?: string;
        tags?: string[];
        external_id?: string;
        [key: string]: any;
      }
    }
  }>(UPDATE_ITEM(props.context.id), {
    onCompleted: () => {
      toast.success("Item updated", {
        description: "Item updated successfully.",
      })
    },
    onError: (error) => {
      toast.error("Error updating item", {
        description: error.message,
      })
    }
  });

  const [deleteItemMutation, deleteItemMutationResult] = useMutation<{
    id: string;
  }>(DELETE_ITEM(props.context.id, []), {
    onCompleted: () => {
      toast.success("Item deleted successfully.", {
        description: "Item deleted successfully.",
      })
    },
    onError: (error) => {
      toast.error("Error deleting item", {
        description: error.message,
      })
    }
  });

  const [generateChunksMutation, generateChunksMutationResult] = useMutation<{
    [key: string]: {
      jobs: string[];
      items: number;
    }
  }>(GENERATE_CHUNKS(props.context.id), {
    onCompleted: (output) => {
      const data = output[props.context.id + "_itemsGenerateChunks"];
      if (data.jobs?.length > 0) {
        toast.success("Chunks generation started", {
          description: "Jobs have been started in the background, depending on the size of the item this may take a while.",
        })
        return;
      }
      toast.success("Chunks generated", {
        description: "Chunks generated successfully.",
      })
    },
  });


  const [deleteChunksMutation, deleteChunksMutationResult] = useMutation<{
    [key: string]: {
      jobs: string[];
      items: number;
    }
  }>(DELETE_CHUNKS(props.context.id), {
    onCompleted: (output) => {
      const data = output[props.context.id + "_itemsDeleteChunks"];
      if (data.jobs?.length > 0) {
        toast.success("Chunks deletion started", {
          description: "Jobs have been started in the background, depending on the size of the item this may take a while.",
        })
        return;
      }
      toast.success("Chunks deleted", {
        description: "Chunks deleted successfully.",
      })
      refetch();
    },
  });

  const [processItemMutation, processItemMutationResult] = useMutation<{
    [key: string]: {
      message: string;
      jobs: string[];
      results: string[];
    }
  }>(PROCESS_ITEM(props.context.id), {
    onCompleted: (data) => {
      console.log("data", data);
      const result = data[`${props.context.id}_itemsProcessItem`];
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

  const itemFormSchema = z.object({
    name: z.string().nullable().optional(),
    tags: z.string().nullable().optional(),
    external_id: z.string().nullable().optional(),
    description: z.string()
      .min(2, { message: "Text must be at least 2 characters." })
      .max(10000, { message: "Text must not be longer than 10.0000 characters." }),
    ...(context?.fields?.reduce((acc, field) => ({
      ...acc,
      [field.name]: z.string().nullable()
    }), {}) ?? {})
  });

  type ItemFormValues = z.infer<typeof itemFormSchema>;

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      description: data?.description,
    },
    mode: "onChange",
  });

  const handleTags = (e: any) => {
    if (!e.target.value) {
      return;
    }
    if (e.key === "Enter") {
      let values = data?.tags ?? [];
      let copy;
      if (!Array.isArray(values)) {
        copy = [];
      } else {
        copy = [...values];
      }
      const tags: string[] = [...copy];
      tags.push(e.target.value);
      console.log("tags", tags);
      form.setValue("tags", tags.join(","));
      setData({
        ...data,
        tags: tags,
      });
      e.target.value = "";
    }
  };

  const [editing, setEditing] = useState(false);
  const [expandedField, setExpandedField] = useState<{ name: string, value: string, disabled: boolean } | null>(null);
  const [confirmationModal, setConfirmationModal] = useState<"generate" | "delete" | null>(null);

  useEffect(() => {
    if (data?.text === "New item") {
      setEditing(true);
    } else {
      setEditing(false);
    }
  }, [data?.id]);

  // If no valid itemId, show nothing (parent should handle showing list view)
  if (!isValidItemId) {
    return null;
  }

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

  if (!loading && !data && retryCount >= 5) {
    return (
      <Alert variant="destructive">
        <ExclamationTriangleIcon className="size-4" />
        <AlertTitle>Item Not Found</AlertTitle>
        <AlertDescription>
          Item not found. It may have been deleted or you may not have permission to view it.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="flex h-full flex-col">

      {data ? (
        <>
          {props.actions ? (
            <>
              <div className="flex items-center justify-end p-4">
                <div className="flex items-center gap-3">
                  {data?.archived ? (
                    <>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={async () => {
                              if (!data.id) {
                                return;
                              }
                              updateItemMutation({
                                variables: {
                                  id: data.id,
                                  input: {
                                    archived: false,
                                  },
                                }
                              });
                              setData({
                                ...data,
                                archived: false,
                              });
                              router.push("./");
                            }}
                            variant="outline"
                            size="sm"
                            className="shadow-md hover:shadow-lg transition-all duration-200 hover:border-primary/50 hover:bg-accent"
                            disabled={!data || updateItemMutationResult.loading}
                          >
                            {updateItemMutationResult.loading ? (
                              <Loading />
                            ) : (
                              <PackageOpen className="size-4 mr-2" />
                            )}
                            Unarchive
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Restore this item</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={async () => {
                              if (!data.id) {
                                return;
                              }
                              deleteItemMutation({
                                variables: {
                                  id: data.id,
                                }
                              });
                              router.push("./");
                            }}
                            variant="destructive"
                            size="sm"
                            className="shadow-md hover:shadow-lg transition-all duration-200"
                            disabled={!data || deleteItemMutationResult.loading}
                          >
                            {deleteItemMutationResult.loading ? (
                              <Loading />
                            ) : (
                              <Trash2 className="size-4 mr-2" />
                            )}
                            Delete
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Permanently delete</TooltipContent>
                      </Tooltip>
                    </>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={async () => {
                            if (!data?.id) {
                              return;
                            }
                            updateItemMutation({
                              variables: {
                                id: data.id,
                                input: { archived: true },
                              }
                            });
                            setData({
                              ...data,
                              archived: true,
                            });
                            router.push("./");
                          }}
                          variant="outline"
                          size="sm"
                          className="shadow-md hover:shadow-lg transition-all duration-200 hover:border-primary/50"
                          disabled={!data || updateItemMutationResult.loading}
                        >
                          {updateItemMutationResult.loading ? (
                            <Loading />
                          ) : (
                            <Archive className="size-4 mr-2" />
                          )}
                          Archive
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Archive this item</TooltipContent>
                    </Tooltip>
                  )}
                  {editing ? (
                    <>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={() => {
                              setEditing(false);
                            }}
                            variant="outline"
                            size="sm"
                            className="shadow-md hover:shadow-lg transition-all duration-200 hover:bg-muted"
                          >
                            <XCircle className="size-4 mr-2" />
                            Cancel
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Cancel editing</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            disabled={updateItemMutationResult.loading}
                            onClick={() => {
                              if (!data?.id) {
                                return;
                              }
                              updateItemMutation({
                                variables: {
                                  id: data.id,
                                  input: {
                                    textlength: data?.text?.length,
                                    description: data?.description,
                                    name: data?.name,
                                    externalId: data?.externalId,
                                    tags: data?.tags?.join(","),
                                    source: data?.source,
                                    archived: data?.archived,
                                    rights_mode: rbac?.rights_mode,
                                    RBAC: {
                                      users: rbac?.users || [],
                                      roles: rbac?.roles || [],
                                      // projects: rbac?.projects || []
                                    },
                                    ...(context?.fields?.reduce((acc, field) => ({
                                      ...acc,
                                      [field.name]: data?.[field.name]
                                    }), {}) ?? {})
                                  },
                                }
                              });
                              setEditing(false);
                            }}
                            variant="default"
                            size="sm"
                            className="shadow-md hover:shadow-lg transition-all duration-200 bg-primary hover:bg-primary/90 text-primary-foreground"
                          >
                            {updateItemMutationResult.loading ? (
                              <Loading />
                            ) : (
                              <SaveIcon className="size-4 mr-2" />
                            )}
                            Save Changes
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Save your changes</TooltipContent>
                      </Tooltip>
                    </>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => {
                            setEditing(true);
                          }}
                          variant="outline"
                          size="sm"
                          className="shadow-md hover:shadow-lg transition-all duration-200 hover:border-primary/50 hover:bg-accent"
                          disabled={!data || updateItemMutationResult.loading}
                        >
                          <Edit className="size-4 mr-2" />
                          Edit
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit this item</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
              <Separator />
            </>
          ) : null}
          <div className="flex flex-1 flex-col">
            <div className={cn("space-y-2")}>
              <div className="flex items-center justify-between space-x-4 px-4 bg-muted rounded">
                <h3 className="text-lg p-5 font-semibold tracking-tight text-lg">
                  Fields
                </h3>

                {
                  context.processor && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="secondary" size="sm" className="w-auto mt-2" onClick={() => {
                          processItemMutation({
                            variables: {
                              item: data?.id,
                            }
                          });
                        }} disabled={processItemMutationResult.loading}>
                          {
                            processItemMutationResult.loading ? (
                              <Loading />
                            ) : (
                              <MessageCirclePlus className="size-4" />
                            )
                          }
                          <span className="ml-2">Process</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        {context.processor.name + "\n" + context.processor.description}
                        <span className="text-sm text-muted-foreground">
                          {context.processor.queue}
                        </span>
                      </TooltipContent>
                    </Tooltip>
                  )
                }
              </div>
              <div className="p-5">
                <Form {...form}>
                  <form className="space-y-8">
                    <div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Value</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>

                          <TableRow key={"name"}>
                            <TableCell className="font-medium capitalize">
                              Name
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                  <FormItem>
                                    {!editing ? (
                                      <div
                                        onClick={async () => {
                                          await navigator.clipboard.writeText(
                                            data.name ?? "",
                                          );
                                          toast.success("Copied to clipboard");
                                        }}
                                        className="flex-1 whitespace-pre-wrap text-sm cursor-copy"
                                      >
                                        {data.name && data.name?.length > 200 ? data.name?.slice(0, 200) + "..." : data.name}
                                      </div>
                                    ) : (
                                      <>
                                        <FormControl>
                                          <Input
                                            type="text"
                                            disabled={!editing}
                                            onChange={(e) => {
                                              setData({
                                                ...data,
                                                name: e.target.value,
                                              });
                                            }}
                                            placeholder="Item name"
                                            value={data.name ?? ""}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </>
                                    )}
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                          </TableRow>

                          <TableRow key={"tags"}>
                            <TableCell className="font-medium capitalize">
                              Tags
                            </TableCell>
                            <TableCell>
                              {editing ? (
                                <div className="grid-row grid grid-flow-col gap-4 pt-2">
                                  <FormField
                                    control={form.control}
                                    name="tags"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormControl>
                                          <Input
                                            id="includes"
                                            type="text"
                                            onKeyUp={(e) => handleTags(e)}
                                            placeholder="Type and press enter to add"
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              ) : null}

                              {data?.tags?.length ? (
                                <div className="gap-2 pt-2">
                                  {data?.tags?.map(
                                    (text: string, index: number) => {
                                      return (
                                        <Badge
                                          key={`tag-${index}`}
                                          variant={"secondary"}
                                          className="px-3 py-2 mr-2 mb-2"
                                        >
                                          <div className="flex items-center">
                                            <div className="text-muted-foreground truncate max-w-[200px]">
                                              {text}
                                            </div>
                                            {editing ? (
                                              <span
                                                className="size-4 cursor-pointer text-muted-foreground"
                                                onClick={() => {
                                                  const tags: string[] = [...data.tags ?? []];
                                                  tags.splice(index, 1);
                                                  form.setValue("tags", tags.join(","));
                                                  setData({
                                                    ...data,
                                                    tags: tags,
                                                  });
                                                }}
                                              >
                                                <XCircle
                                                  className="ml-1"
                                                  size={15}
                                                />
                                              </span>
                                            ) : null}
                                          </div>
                                        </Badge>
                                      );
                                    },
                                  )}
                                </div>
                              ) : null}
                            </TableCell>
                          </TableRow>

                          <TableRow key={19091}>
                            <TableCell className="font-medium capitalize">
                              Description
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                  <FormItem>
                                    {!editing ? (
                                      <div
                                        onClick={async () => {
                                          await navigator.clipboard.writeText(
                                            data.description ?? "",
                                          );
                                          toast.success("Copied to clipboard");
                                        }}
                                        className="flex-1 whitespace-pre-wrap text-sm cursor-copy"
                                      >
                                        <TextPreview text={data.description ?? ""} />
                                      </div>
                                    ) : (
                                      <>
                                        <FormControl>
                                          <div className="relative">
                                            <Textarea
                                              autoFocus={true}
                                              disabled={!editing}
                                              onChange={(e) => {
                                                setData({
                                                  ...data,
                                                  description: e.target.value,
                                                });
                                              }}
                                              placeholder="Item text content"
                                              className="resize-none"
                                              value={data.description ?? ""}
                                            />
                                            <Dialog>
                                              <DialogTrigger asChild>
                                                <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="sm"
                                                  className="absolute top-2 right-2 h-6 w-6 p-0"
                                                  onClick={() => setExpandedField({
                                                    name: "description",
                                                    value: data.description ?? "",
                                                    disabled: false
                                                  })}
                                                >
                                                  <Expand className="h-3 w-3" />
                                                  <span className="sr-only">Expand</span>
                                                </Button>
                                              </DialogTrigger>
                                              <DialogContent className="max-w-4xl max-h-[80vh]">
                                                <DialogHeader>
                                                  <DialogTitle>Edit Description</DialogTitle>
                                                </DialogHeader>
                                                <div className="mt-4">
                                                  <Textarea
                                                    rows={20}
                                                    className="min-h-[400px] resize-none"
                                                    value={expandedField?.name === "description" ? expandedField.value : data.description ?? ""}
                                                    onChange={(e) => {
                                                      const newValue = e.target.value;
                                                      setExpandedField(prev =>
                                                        prev?.name === "description"
                                                          ? { ...prev, value: newValue }
                                                          : prev
                                                      );
                                                      setData({
                                                        ...data,
                                                        description: newValue,
                                                      });
                                                    }}
                                                  />
                                                </div>
                                              </DialogContent>
                                            </Dialog>
                                          </div>
                                        </FormControl>
                                        <FormMessage />
                                      </>
                                    )}
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                          </TableRow>

                          <TableRow key={"externalId"}>
                            <TableCell className="font-medium capitalize">
                              External ID
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name="external_id"
                                render={({ field }) => (
                                  <FormItem>
                                    {!editing ? (
                                      <div
                                        onClick={async () => {
                                          await navigator.clipboard.writeText(
                                            data.external_id ?? "",
                                          );
                                          toast.success("Copied to clipboard");
                                        }}
                                        className="flex-1 whitespace-pre-wrap text-sm cursor-copy"
                                      >
                                        {data.external_id ?? ""}
                                      </div>
                                    ) : (
                                      <>
                                        <FormControl>
                                          <Input
                                            type="text"
                                            disabled={!editing}
                                            onChange={(e) => {
                                              console.log("e", e)
                                              setData({
                                                ...data,
                                                external_id: e.target.value,
                                              });
                                            }}
                                            placeholder="xxxx-xxxx-xxxx-xxxx"
                                            value={data.external_id ?? ""}
                                          />
                                        </FormControl>

                                        <FormMessage />
                                      </>
                                    )}
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                          </TableRow>

                          {
                            context.processor ? (
                              <TableRow key={"processor"}>
                                <TableCell className="font-medium capitalize">
                                  Last processed at
                                </TableCell>
                                <TableCell>
                                  {data.last_processed_at}
                                </TableCell>
                              </TableRow>
                            ) : null
                          }
                          {/* todo: add fixed  fields for "file" which can be a pdf, image, word doc etc...*/}

                          {context?.fields?.length ?
                            context.fields.map(
                              (
                                contextField,
                                index: number,
                              ) => {
                                return (
                                  <TableRow key={index}>
                                    <TableCell className="font-medium capitalize flex flex-col">
                                      {contextField.label}
                                      {
                                        contextField.calculated && (
                                          <span className="text-sm text-muted-foreground">Calculated</span>
                                        )
                                      }
                                    </TableCell>
                                    {!editing ? (
                                      <TableCell>
                                        {
                                          <span>
                                            {contextField.type === "code" && (
                                              <CodePreview
                                                code={data[contextField.name]}
                                              />
                                            )}
                                            {contextField.type === "json" && (
                                              <CodePreview
                                                code={data[contextField.name]}
                                                language="json"
                                              />
                                            )}
                                            {contextField.type === "shortText" && (
                                              <p
                                                className="cursor-copy"
                                                onClick={async () => {
                                                  await navigator.clipboard.writeText(
                                                    data[contextField.name],
                                                  );
                                                  toast.success("Copied to clipboard");
                                                }}>
                                                {data[contextField.name]}
                                              </p>
                                            )}
                                            {contextField.type === "longText" && (
                                              <TextPreview
                                                text={data[contextField.name]}
                                              />
                                            )}

                                            {contextField.type === "file" && (
                                              <FileDataCard s3key={data[contextField.name]} />
                                            )}

                                            {contextField.type === "markdown" && (
                                              <TextPreview
                                                text={data[contextField.name]}
                                              />
                                            )}
                                            {!contextField.type && (
                                              <TextPreview
                                                text={data[contextField.name]}
                                              />
                                            )}
                                            {contextField.type === "text" && (
                                              <TextPreview
                                                text={data[contextField.name]}
                                              />
                                            )}
                                            {contextField.type === "number" && (
                                              <p
                                                className="cursor-copy"
                                                onClick={async () => {
                                                  await navigator.clipboard.writeText(
                                                    data[contextField.name],
                                                  );
                                                  toast.success("Copied to clipboard");
                                                }}
                                              >
                                                {data[contextField.name]}
                                              </p>
                                            )}
                                            {contextField.type === "boolean" && (
                                              <p
                                                className="cursor-copy"
                                                onClick={async () => {
                                                  await navigator.clipboard.writeText(
                                                    data[contextField.name],
                                                  );
                                                  toast.success("Copied to clipboard");
                                                }}
                                              >
                                                {data[contextField.name] ?? ""}
                                              </p>
                                            )}
                                          </span>
                                        }
                                      </TableCell>
                                    ) : (
                                      <>
                                        <TableCell>
                                          {contextField.type === "code" ||
                                            contextField.type === "json" ||
                                            contextField.type === "text" ||
                                            contextField.type === "longText" ||
                                            contextField.type === "markdown" ||
                                            contextField.type === "shortText" ? (
                                            <FormField
                                              control={form.control}
                                              name={contextField.name as keyof ItemFormValues}
                                              render={({ field }) => (
                                                <FormItem>
                                                  <FormControl>
                                                    <div className="relative">
                                                      <Textarea
                                                        id={contextField.name}
                                                        rows={
                                                          contextField.type ===
                                                            "shortText"
                                                            ? 2
                                                            : 7
                                                        }
                                                        onChange={(e) => {
                                                          setData({
                                                            ...data,
                                                            [contextField.name]: e.target.value,
                                                          });
                                                        }}
                                                        value={
                                                          data[contextField.name] ?? ""
                                                        }
                                                      />
                                                      <Dialog>
                                                        <DialogTrigger asChild>
                                                          <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="absolute top-2 right-2 h-6 w-6 p-0"
                                                            onClick={() => setExpandedField({
                                                              name: contextField.name,
                                                              disabled: false,
                                                              value: data[contextField.name] ?? ""
                                                            })}
                                                          >
                                                            <Expand className="h-3 w-3" />
                                                            <span className="sr-only">Expand</span>
                                                          </Button>
                                                        </DialogTrigger>
                                                        <DialogContent className="max-w-4xl max-h-[80vh]">
                                                          <DialogHeader>
                                                            <DialogTitle>Edit {contextField.name}</DialogTitle>
                                                          </DialogHeader>
                                                          <div className="mt-4">
                                                            <Textarea
                                                              rows={20}
                                                              className="min-h-[400px] resize-none"
                                                              value={expandedField?.name === contextField.name ? expandedField.value : data[contextField.name] ?? ""}
                                                              onChange={(e) => {
                                                                const newValue = e.target.value;
                                                                setExpandedField(prev =>
                                                                  prev?.name === contextField.name
                                                                    ? { ...prev, value: newValue }
                                                                    : prev
                                                                );
                                                                setData({
                                                                  ...data,
                                                                  [contextField.name]: newValue,
                                                                });
                                                              }}
                                                            />
                                                          </div>
                                                        </DialogContent>
                                                      </Dialog>
                                                    </div>
                                                  </FormControl>
                                                  <FormMessage />
                                                </FormItem>
                                              )}
                                            />
                                          ) : null}

                                          {contextField.type === "number" ? (
                                            <FormField
                                              control={form.control}
                                              name={contextField.name as keyof ItemFormValues}
                                              render={({ field }) => (
                                                <FormItem>
                                                  <FormControl>
                                                    <Input
                                                      id={contextField.name}
                                                      type="number"
                                                      onChange={(e) => {
                                                        setData({
                                                          ...data,
                                                          [contextField.name]: e.target.value,
                                                        });
                                                      }}
                                                      value={
                                                        data[contextField.name] ?? ""
                                                      }
                                                    />
                                                  </FormControl>
                                                  <FormMessage />
                                                </FormItem>
                                              )}
                                            />
                                          ) : null}

                                          {contextField.type === "boolean" ? (
                                            <FormField
                                              control={form.control}
                                              name={contextField.name as keyof ItemFormValues}
                                              render={({ field }) => (
                                                <FormItem>
                                                  <FormControl>
                                                    <Switch
                                                      checked={!!field.value}
                                                      onCheckedChange={(
                                                        value,
                                                      ) => {
                                                        setData({
                                                          ...data,
                                                          [contextField.name]: value,
                                                        });
                                                      }}
                                                    />
                                                  </FormControl>
                                                  <FormMessage />
                                                </FormItem>
                                              )}
                                            />
                                          ) : null}

                                          {contextField.type === "file" && (
                                            <div className="space-y-2">
                                              <FileDataCard s3key={data[contextField.name]}>
                                                <UppyDashboard
                                                  id={`item-${data.id}`}
                                                  buttonText="Select File"
                                                  allowedFileTypes={contextField.allowedFileTypes}
                                                  dependencies={[]}
                                                  selectionLimit={1}
                                                  onConfirm={(keys) => {
                                                    console.log("keys", keys)
                                                    setData({
                                                      ...data,
                                                      [contextField.name]: keys[0],
                                                    });
                                                  }}
                                                />
                                              </FileDataCard>
                                              {data[contextField.name] && (
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={() => {
                                                    setData({
                                                      ...data,
                                                      [contextField.name]: null,
                                                    });
                                                  }}
                                                  className="w-full"
                                                >
                                                  <XCircle className="size-4 mr-2" />
                                                  Remove Document
                                                </Button>
                                              )}
                                            </div>
                                          )}
                                        </TableCell>
                                      </>
                                    )}
                                  </TableRow>
                                );
                              },
                            ) : null}
                        </TableBody>
                      </Table>

                      <Separator className="my-4" />
                    </div>
                  </form>
                </Form>
                <Card className="bg-transparent">
                  <Collapsible>
                    <CardHeader className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <p className="text-base">
                            Access Control
                          </p>
                          <p className="text-sm text-muted-foreground mb-0">
                            Control access to this item.
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
                    <CollapsibleContent className="mt-5">
                      <CardContent className="space-y-4">
                        <RBACControl
                          initialRightsMode={data.rights_mode}
                          initialUsers={data.RBAC?.users}
                          initialRoles={data.RBAC?.roles}
                          // initialProjects={data.RBAC?.projects}
                          onChange={(rights_mode, users, roles) => {
                            setRbac({
                              rights_mode,
                              users,
                              roles,
                              // projects
                            })
                          }}
                        />
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>


                <div className="mt-4 border border p-3 pb-5 rounded">
                  <div className="flex items-center justify-between ml-4 mt-3 mr-4 mb-2">
                    <h1 className="text-lg font-medium">Embeddings</h1>
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setConfirmationModal("generate")}>
                          Generate embeddings
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setConfirmationModal("delete")}>
                          Delete embeddings
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <Table>
                    <TableCaption>
                      {
                        data?.chunks?.length ? "A list of all embeddings for this item." : "No embeddings found."
                      }
                    </TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Index</TableHead>
                        <TableHead>Content</TableHead>
                        <TableHead>Created At</TableHead>
                        <TableHead>Updated At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {
                        data?.chunks?.length ? (
                          data?.chunks?.length && data.chunks.map((chunk) => (
                            <TableRow key={chunk.chunk_id}>
                              <TableCell className="font-medium capitalize">
                                {chunk.chunk_index + 1}
                              </TableCell>
                              <TableCell>
                                <TextPreview text={chunk.chunk_content} metadata={chunk.chunk_metadata} />
                              </TableCell>
                              <TableCell>
                                {new Date(chunk.chunk_created_at).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                {new Date(chunk.chunk_updated_at).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : null
                      }
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {" "}
          {!data && props.itemId ? (
            <div className="p-8 text-center text-muted-foreground">
              Item not found.
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              No item selected.
            </div>
          )}
        </>
      )
      }

      <AlertDialog open={confirmationModal === "generate"} onOpenChange={(open) => !open && setConfirmationModal(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate Embeddings</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to generate embeddings for this item? This will create new embedding vectors for the content.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={generateChunksMutationResult.loading}
              onClick={() => {
                if (!data?.id) {
                  return;
                }
                console.log("Generate embeddings for item:", data?.id);
                setConfirmationModal(null);
                generateChunksMutation({
                  variables: {
                    where: {
                      id: {
                        eq: data?.id,
                      }
                    },
                  },
                });
              }}>
              Generate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmationModal === "delete"} onOpenChange={(open) => !open && setConfirmationModal(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Embeddings</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete all embeddings for this item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteChunksMutationResult.loading}
              onClick={async () => {
                if (!data?.id) {
                  return;
                }
                console.log("Delete embeddings for item:", data?.id);
                setConfirmationModal(null);
                deleteChunksMutation({
                  variables: {
                    where: {
                      id: {
                        eq: data?.id,
                      }
                    },
                  },
                });
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div >
  );
}