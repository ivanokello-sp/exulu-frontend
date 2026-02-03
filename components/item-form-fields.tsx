"use client"

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { XCircle, Expand } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Context } from "@/types/models/context";
import { Item } from "@/types/models/item";
import UppyDashboard, { FileDataCard } from "@/components/uppy-dashboard";

interface ItemFormFieldsProps {
  context: Context;
  data: Partial<Item>;
  newItem: boolean;
  editing: boolean;
  onDataChange: (data: Partial<Item>) => void;
}

export function ItemFormFields({ context, data, editing, newItem, onDataChange }: ItemFormFieldsProps) {
  const [expandedField, setExpandedField] = useState<{ name: string, value: string, disabled: boolean } | null>(null);

  const handleTags = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!e.currentTarget.value) {
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      let values = data?.tags ?? [];
      let copy: string[];
      if (!Array.isArray(values)) {
        copy = [];
      } else {
        copy = [...values];
      }
      const tags: string[] = [...copy];
      tags.push(e.currentTarget.value);
      onDataChange({
        ...data,
        tags: tags,
      });
      e.currentTarget.value = "";
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Value</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {/* Name Field */}
        <TableRow>
          <TableCell className="font-medium capitalize">Name</TableCell>
          <TableCell>
            {!editing ? (
              <div className="flex-1 whitespace-pre-wrap text-sm">
                {data.name && data.name?.length > 200 ? data.name?.slice(0, 200) + "..." : data.name}
              </div>
            ) : (
              <Input
                type="text"
                disabled={!editing}
                onChange={(e) => {
                  onDataChange({
                    ...data,
                    name: e.target.value,
                  });
                }}
                placeholder="Item name"
                value={data.name ?? ""}
              />
            )}
          </TableCell>
        </TableRow>

        {/* Tags Field */}
        <TableRow>
          <TableCell className="font-medium capitalize">Tags</TableCell>
          <TableCell>
            {editing ? (
              <div className="grid-row grid grid-flow-col gap-4 pt-2">
                <Input
                  id="includes"
                  type="text"
                  onKeyUp={handleTags}
                  placeholder="Type and press enter to add"
                />
              </div>
            ) : null}

            {data?.tags?.length ? (
              <div className="gap-2 pt-2">
                {data?.tags?.map((text: string, index: number) => {
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
                              onDataChange({
                                ...data,
                                tags: tags,
                              });
                            }}
                          >
                            <XCircle className="ml-1" size={15} />
                          </span>
                        ) : null}
                      </div>
                    </Badge>
                  );
                })}
              </div>
            ) : null}
          </TableCell>
        </TableRow>

        {/* Description Field */}
        <TableRow>
          <TableCell className="font-medium capitalize">Description</TableCell>
          <TableCell>
            {!editing ? (
              <div className="flex-1 whitespace-pre-wrap text-sm">
                {data.description ?? ""}
              </div>
            ) : (
              <div className="relative">
                <Textarea
                  autoFocus={false}
                  disabled={!editing}
                  onChange={(e) => {
                    onDataChange({
                      ...data,
                      description: e.target.value,
                    });
                  }}
                  placeholder="Item description"
                  className="resize-none"
                  rows={4}
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
                          onDataChange({
                            ...data,
                            description: newValue,
                          });
                        }}
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </TableCell>
        </TableRow>

        {/* External ID Field */}
        <TableRow>
          <TableCell className="font-medium capitalize">External ID</TableCell>
          <TableCell>
            {!editing ? (
              <div className="flex-1 whitespace-pre-wrap text-sm">
                {data.external_id ?? ""}
              </div>
            ) : (
              <Input
                type="text"
                disabled={!editing}
                onChange={(e) => {
                  onDataChange({
                    ...data,
                    external_id: e.target.value,
                  });
                }}
                placeholder="xxxx-xxxx-xxxx-xxxx"
                value={data.external_id ?? ""}
              />
            )}
          </TableCell>
        </TableRow>

        {/* Custom Fields from Context */}
        {context?.fields?.length ?
          context.fields.map((contextField, index: number) => {
            if (newItem && contextField.editable === false) {
              return null;
            }
            return (
              <TableRow key={index}>
                <TableCell className="font-medium capitalize flex flex-col">
                  {contextField.label}
                  {contextField.calculated && (
                    <span className="text-sm text-muted-foreground">Calculated</span>
                  )}
                </TableCell>
                {!editing ? (
                  <TableCell>
                    <span className="text-sm">{data[contextField.name] ?? ""}</span>
                  </TableCell>
                ) : (
                  <TableCell>
                    {contextField.type === "code" ||
                      contextField.type === "json" ||
                      contextField.type === "text" ||
                      contextField.type === "longText" ||
                      contextField.type === "markdown" ||
                      contextField.type === "shortText" ? (
                      <div className="relative">
                        <Textarea
                          id={contextField.name}
                          rows={contextField.type === "shortText" ? 2 : 7}
                          onChange={(e) => {
                            onDataChange({
                              ...data,
                              [contextField.name]: e.target.value,
                            });
                          }}
                          value={data[contextField.name] ?? ""}
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
                              <DialogTitle>Edit {contextField.label}</DialogTitle>
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
                                  onDataChange({
                                    ...data,
                                    [contextField.name]: newValue,
                                  });
                                }}
                              />
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    ) : null}

                    {contextField.type === "number" ? (
                      <Input
                        id={contextField.name}
                        type="number"
                        onChange={(e) => {
                          onDataChange({
                            ...data,
                            [contextField.name]: e.target.value,
                          });
                        }}
                        value={data[contextField.name] ?? ""}
                      />
                    ) : null}

                    {contextField.type === "boolean" ? (
                      <Switch
                        checked={!!data[contextField.name]}
                        onCheckedChange={(value) => {
                          onDataChange({
                            ...data,
                            [contextField.name]: value,
                          });
                        }}
                      />
                    ) : null}

                    {contextField.type === "file" && (
                      <div>
                        <FileDataCard s3key={data[contextField.name]}>
                          <UppyDashboard
                            id={`item-new`}
                            buttonText="Select File"
                            allowedFileTypes={contextField.allowedFileTypes}
                            dependencies={[]}
                            selectionLimit={1}
                            onConfirm={(keys) => {
                              onDataChange({
                                ...data,
                                [contextField.name]: keys[0],
                              });
                            }}
                          />
                        </FileDataCard>
                      </div>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          }) : null}
      </TableBody>
    </Table>
  );
}
