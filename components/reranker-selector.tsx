"use client";

import * as React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@apollo/client";
import { GET_RERANKERS } from "@/queries/queries";
import { Input } from "@/components/ui/input";

export function RerankerSelector({
  disabled,
  value,
  onSelect,
}: any & { disabled: boolean, value: string, onSelect: (id) => void}) {

  const [selected, setSelected] = React.useState<{ id: string, name: string, description: string } | undefined>();
  const [searchTerm, setSearchTerm] = React.useState("");
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const { loading: isLoading, error, data, refetch, previousData } = useQuery(GET_RERANKERS, {
    fetchPolicy: "no-cache",
    nextFetchPolicy: "network-only",
  });

  let rerankers: { id: string, name: string, description: string }[] = []
  rerankers = data?.rerankers?.items || [];

  const filteredRerankers = rerankers.filter((reranker) =>
    `${reranker.name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Select
      disabled={disabled}
      value={value || undefined}
      onOpenChange={(open) => {
        if (open) {
          setTimeout(() => searchInputRef.current?.focus(), 0);
        }
      }}
      onValueChange={(value) => {
        setSelected(rerankers?.find((reranker) => reranker.id === value))
        onSelect(value);
      }}
    >
      <SelectTrigger>
        <SelectValue placeholder={selected?.name || `Select a reranker`} />
      </SelectTrigger>
      <SelectContent>
        <div className="p-2">
          <Input
            ref={searchInputRef}
            placeholder="Search providers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            className="h-8"
          />
        </div>
        {
          isLoading ? (
            <SelectItem key="loading" value="loading">
              Loading...
            </SelectItem>
          ) :
            filteredRerankers?.map((reranker) => (
              <SelectItem key={reranker.id} value={reranker.id}>
                {reranker.name}
              </SelectItem>
            ))
        }
      </SelectContent>
    </Select>
  );
}
