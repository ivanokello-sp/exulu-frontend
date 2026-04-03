"use client"

import { subDays, formatDistanceToNow } from "date-fns";
import { useState, useContext, useEffect } from "react";
import * as React from "react";
import { DateRange } from "react-day-picker";
import { STATISTICS_TYPE, STATISTICS_TYPE_ENUM } from "@/types/enums/statistics";
import { DateRangeSelector } from "@/components/dashboard/date-range-selector";
import { TimeSeriesChart } from "@/components/dashboard/time-series-chart";
import { DonutChart } from "@/components/dashboard/donut-chart";
import { UserContext } from "@/app/(application)/authenticated";
import { useQuery } from "@apollo/client";
import { GET_CONTEXTS, GET_ITEMS, PAGINATION_POSTFIX } from "@/queries/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Database, FileText, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default function ContextsDashboard() {
  const { user } = useContext(UserContext);
  
  const [unit, setUnit] = useState<"tokens" | "count">("count");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date()
  });

  const [selectedType, setSelectedType] = useState<STATISTICS_TYPE>("CONTEXT_UPSERT");
  const [groupBy, setGroupBy] = useState<string>("label");

  const isSuperAdmin = user?.super_admin === true;

  // Render admin dashboard for super admins
  if (isSuperAdmin) {
    return (
      <AdminDashboard
        dateRange={dateRange}
        setDateRange={setDateRange}
        selectedType={selectedType}
        setSelectedType={setSelectedType}
        unit={unit}
        setUnit={setUnit}
        groupBy={groupBy}
        setGroupBy={setGroupBy}
      />
    );
  }

  // Render regular user view for non-admin users
  return <RecentItemsView />;
}

// Admin Dashboard Component (original dashboard)
function AdminDashboard({
  dateRange,
  setDateRange,
  selectedType,
  setSelectedType,
  unit,
  setUnit,
  groupBy,
  setGroupBy
}: {
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
  selectedType: STATISTICS_TYPE;
  setSelectedType: (type: STATISTICS_TYPE) => void;
  unit: "tokens" | "count";
  setUnit: (unit: "tokens" | "count") => void;
  groupBy: string;
  setGroupBy: (groupBy: string) => void;
}) {
  return (
    <div className="flex-1 flex flex-col p-6 gap-5 h-screen overflow-auto">
      {/* Header Section */}
      <div className="flex items-center justify-between border-b border-border/50 pb-4">
        <div>
          <h2 className="text-lg font-semibold">Contexts Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitor your contexts and their usage.
          </p>
        </div>
        <DateRangeSelector
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          maxDays={30}
        />
      </div>

      {/* Charts Grid - Improved layout and spacing */}
      <div className="flex-1 grid gap-6 md:grid-cols-3 min-h-0">
        <div className="rounded-lg border md:col-span-2 p-6 flex flex-col">
          <TimeSeriesChart
            dateRange={dateRange}
            selectedType={selectedType}
            onTypeChange={setSelectedType}
            unitOptions={[
              { value: 'count', label: 'Count' }
          ]}
            onUnitChange={setUnit}
            unit={unit}
            dataTypes={[
              STATISTICS_TYPE_ENUM.CONTEXT_RETRIEVE,
              // STATISTICS_TYPE_ENUM.EMBEDDER_UPSERT,
              // STATISTICS_TYPE_ENUM.EMBEDDER_GENERATE,
              // STATISTICS_TYPE_ENUM.EMBEDDER_DELETE,
              STATISTICS_TYPE_ENUM.CONTEXT_UPSERT
            ]}
          />
        </div>
        <div className="rounded-lg border p-6 flex flex-col">
          <DonutChart
            groupByOptions={[]}
            dateRange={dateRange}
            selectedType={selectedType}
            unit={unit}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
          />
        </div>
      </div>
    </div>
  );
}

// Recent Items View for regular users
function RecentItemsView() {
  const router = useRouter();
  const [hasAnyItems, setHasAnyItems] = useState<boolean | null>(null);

  // Get all contexts
  const { data: contextsData, loading: contextsLoading } = useQuery(GET_CONTEXTS);

  const contexts = contextsData?.contexts?.items || [];
  console.log("contexts", contexts);

  // Track if we've checked all contexts and found no items
  const handleItemsCheck = (contextHasItems: boolean) => {
    if (contextHasItems && hasAnyItems === null) {
      setHasAnyItems(true);
    }
  };

  // After loading, if we haven't found any items, set to false
  React.useEffect(() => {
    if (!contextsLoading && contexts.length > 0 && hasAnyItems === null) {
      // Give components time to load
      const timer = setTimeout(() => {
        if (hasAnyItems === null) {
          setHasAnyItems(false);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [contextsLoading, contexts.length, hasAnyItems]);

  return (
    <div className="flex-1 flex flex-col p-6 gap-5 h-screen overflow-auto">
      {/* Header Section */}
      <div className="border-b border-border/50 pb-4">
        <h2 className="text-lg font-semibold">Recent Items</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Browse recent items across all your knowledge sources.
        </p>
      </div>

      {/* Loading state */}
      {contextsLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state - no contexts */}
      {!contextsLoading && contexts.length === 0 && (
        <EmptyStateNoContexts />
      )}

      {/* Empty state - no items */}
      {!contextsLoading && contexts.length > 0 && hasAnyItems === false && (
        <EmptyStateNoItems />
      )}

      {/* Contexts with recent items */}
      {!contextsLoading && contexts.length > 0 && hasAnyItems !== false && (
        <div className="space-y-6">
          {contexts.map((context: any) => (
            <ContextRecentItems
              key={context.id}
              context={context}
              router={router}
              onItemsFound={handleItemsCheck}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Component to display recent items for a single context
function ContextRecentItems({
  context,
  router,
  onItemsFound
}: {
  context: any;
  router: any;
  onItemsFound?: (hasItems: boolean) => void;
}) {
  const { data: raw, loading } = useQuery(GET_ITEMS(context.id, []), {
    variables: {
      page: 1,
      limit: 5,
      filters: [],
    },
    skip: !context.slug,
  });

  console.log("raw", raw);
  console.log("context.id + PAGINATION_POSTFIX", context.id + PAGINATION_POSTFIX);

  const data: {
    items: any;
    pageInfo: {
      pageCount: number;
      itemCount: number;
      currentPage: number;
      hasPreviousPage: boolean;
      hasNextPage: boolean;
    };
  } = raw?.[context.id + PAGINATION_POSTFIX] as any;

  const items = data?.items || [];

  // Notify parent when items are found
  useEffect(() => {
    if (!loading && items.length > 0 && onItemsFound) {
      onItemsFound(true);
    }
  }, [loading, items.length, onItemsFound]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <Skeleton className="h-6 w-48" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!items || items.length === 0) {
    return null; // Don't show contexts with no items
  }

  console.log("items final", items);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <CardTitle>{context.name}</CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs">
            {items.length} recent
          </Badge>
        </div>
        {context.description && (
          <CardDescription>{context.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item: any) => (
            <div
              key={item.id}
              onClick={() => router.push(`/data/${context.id}/${item.id}`)}
              className="p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <h4 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                      {item.name || item.external_id || "Untitled"}
                    </h4>
                  </div>
                  {item.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 ml-6">
                      {item.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 ml-6">
                    {item.updatedAt && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}
                        </span>
                      </div>
                    )}
                    {item.chunks_count > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {item.chunks_count} chunks
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Empty State when no contexts exist
function EmptyStateNoContexts() {
  return (
    <div className="flex items-center justify-center flex-1">
      <div className="flex flex-col items-center gap-3 text-center max-w-sm px-6">
        <div className="p-3 rounded-full bg-muted">
          <Database className="h-6 w-6 text-muted-foreground" strokeWidth={1} />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">No knowledge sources yet</p>
          <p className="text-xs text-muted-foreground">
            Create a knowledge source in the sidebar to get started.
          </p>
        </div>
      </div>
    </div>
  );
}

// Empty State when contexts exist but no items
function EmptyStateNoItems() {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center flex-1">
      <div className="flex flex-col items-center gap-3 text-center max-w-sm px-6">
        <div className="p-3 rounded-full bg-muted">
          <FileText className="h-6 w-6 text-muted-foreground" strokeWidth={1} />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">No items yet</p>
          <p className="text-xs text-muted-foreground">
            Select a knowledge source in the sidebar and add items to get started.
          </p>
        </div>
        <Button onClick={() => router.push('/data')} variant="outline" size="sm" className="gap-2 mt-1">
          <Database className="h-3.5 w-3.5" />
          Browse sources
        </Button>
      </div>
    </div>
  );
}