import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { useQuery, useMutation } from "@apollo/client";
import { useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { GENERATE_CHUNKS, DELETE_CHUNKS } from "@/queries/queries";
import { TruncatedText } from "@/components/truncated-text";
import { Item } from "@/types/models/item";
import { GET_ITEMS, PAGINATION_POSTFIX } from "@/queries/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { FilterOperator } from "@/types/models/filter";

export type ItemsFilters = {
  context?: FilterOperator,
}

export function RecentProcessings({ contextId }: { contextId: string }) {
  const twentyOneDaysAgoRef = useRef(new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString());
  let { loading, data: raw } = useQuery<{
    [key: string]: {
      pageInfo: {
        pageCount: number;
        itemCount: number;
        currentPage: number;
        hasPreviousPage: boolean;
        hasNextPage: boolean;
      };
      items: Item[];
    }
  }>(GET_ITEMS(contextId, []), {
    fetchPolicy: "no-cache",
    nextFetchPolicy: "network-only",
    pollInterval: 10000, // poll every 10 seconds for updates
    variables: {
      context: contextId,
      page: 1,
      limit: 5,
      filters: [{
        last_processed_at: {
          // 21 days ago
          gte: twentyOneDaysAgoRef.current,
        },
      }],
      sort: {
        field: "last_processed_at",
        direction: "DESC",
      }
    },
  });

  const [generateChunksMutation, generateChunksMutationResult] = useMutation<{
    [key: string]: {
      jobs: string[];
      items: number;
    }
  }>(GENERATE_CHUNKS(contextId), {
    onCompleted: (output) => {
      const data = output[contextId + "_itemsGenerateChunks"];
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
  }>(DELETE_CHUNKS(contextId), {
    onCompleted: (output) => {
      const data = output[contextId + "_itemsDeleteChunks"];
      if (data.jobs?.length > 0) {
        toast.success("Chunks deletion started", {
          description: "Jobs have been started in the background, depending on the size of the item this may take a while.",
        })
        return;
      }
      toast.success("Chunks deleted", {
        description: "Chunks deleted successfully.",
      })
    },
  });

  const data = raw?.[contextId + PAGINATION_POSTFIX] as any;

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 rounded-none">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <CardTitle>Recently Processed</CardTitle>
              <CardDescription>Items processed in the last 21 days</CardDescription>
            </div>

            {loading && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg">
          {data?.items?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No recently processed items
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.items?.map((item: Item, index: number) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      <Link
                        className="hover:text-blue-500 hover:underline"
                        href={`/data/${contextId}/${item.id}`}
                      >
                        <TruncatedText text={item.name || item.id || ""} length={100} />
                      </Link>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {item.last_processed_at
                        ? formatDistanceToNow(new Date(item.last_processed_at), {
                          addSuffix: true,
                        })
                        : "never"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>

    </Card>
  );
}
