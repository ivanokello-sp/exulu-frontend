"use client";

import { useContext, useEffect } from "react";
import { createColumns } from "./components/columns";
import { DataTable } from "./components/data-table";
import { UserContext } from "@/app/(application)/authenticated";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useMutation } from "@apollo/client";
import { RUN_WORKFLOW } from "@/queries/queries";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, Clock, Zap, Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { QueueManagement } from "../evals/[id]/runs/components/queue-management";
import { QueueJob } from "@/types/models/job";

export const dynamic = "force-dynamic";

export default function WorkflowsPage() {

  const { user } = useContext(UserContext);

  const [queueManagementModalOpen, setQueueManagementModalOpen] = useState<string | null>(null);

  const onRunWorkflow = (
    workflowId: string,
    queueName?: string | undefined,
    variables?: string[] | undefined
  ) => {
    console.log("Run workflow:", workflowId, queueName);
    setDialogOpen({
      id: workflowId,
      queue: queueName,
      variables: variables,
    });
  };

  const onShowQueueManagementModal = (queueName: string) => {
    console.log("Show queue management modal:", queueName);
    setQueueManagementModalOpen(queueName);
  };

  const columns = createColumns(user, onShowQueueManagementModal, onRunWorkflow);
  const [dialogOpen, setDialogOpen] = useState<{
    id: string;
    queue?: string | undefined;
    variables?: string[] | undefined;
  } | null>(null);

  const [runWorkflow, { loading }] = useMutation(RUN_WORKFLOW, {
    onCompleted: (data) => {
      console.log("Template run completed:", data);
      toast("Template run completed", {
        description: "The template has been run successfully.",
      });
    },
    onError: (error) => {
      console.error("Failed to run template:", error);
      toast("Failed to run template", {
        description: error.message,
      });
    },
  });

  const reactForm = useForm<{
    variables: Record<string, string>;
  }>({
    defaultValues: {
      variables: {},
    },
  });

  useEffect(() => {
    if (dialogOpen?.variables) {
      reactForm.reset({
        variables: dialogOpen?.variables.reduce((acc, variable) => {
          acc[variable] = "";
          return acc;
        }, {} as Record<string, string>),
      });
    }
  }, [dialogOpen?.variables]);

  return (
    <>
      <div className="hidden h-full flex-1 flex-col gap-4 p-6 md:flex">
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div>
            <h2 className="text-lg font-semibold">Templates</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage your templates and monitor running jobs.
            </p>
          </div>
        </div>

        {/* Info callout */}
        <div className="flex items-start gap-3 rounded-md border border-border bg-muted/30 px-4 py-3 text-sm">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-muted-foreground leading-relaxed">
            Start a chat with an agent, then save it as a template. Templates can run on-demand or on a CRON schedule when workers and a queue are configured.
          </p>
        </div>

        {/* Templates Table */}
        <DataTable columns={columns} />
      </div>

      <Dialog modal={true} open={
        dialogOpen !== null &&
        dialogOpen !== undefined
      } onOpenChange={(open) => {
        setDialogOpen(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Run Template</DialogTitle>
            <DialogDescription>
              Configure inputs and start the template execution.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            {/* Execution Mode Info */}
            <div className="flex items-start gap-3 rounded-md border border-border bg-muted/30 px-4 py-3 text-sm">
              {dialogOpen?.queue ? (
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              ) : (
                <Zap className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              )}
              <div className="flex-1">
                <p className="font-medium text-foreground mb-0.5">
                  {dialogOpen?.queue ? "Queued Execution" : "Immediate Execution"}
                </p>
                <p className="text-muted-foreground">
                  {dialogOpen?.queue ? (
                    <>
                      Will be queued in{" "}
                      <span className="font-medium text-foreground">{dialogOpen.queue}</span>.
                      {" "}Jobs are processed asynchronously based on queue priority.
                    </>
                  ) : (
                    <>This template will execute immediately — no queue is configured for this agent.</>
                  )}
                </p>
              </div>
            </div>

            {/* Input Variables Section */}
            {dialogOpen?.variables && dialogOpen.variables.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Input Variables ({dialogOpen.variables.length})
                </p>
                <div className="flex flex-col gap-3 max-h-[280px] overflow-y-auto">
                  {dialogOpen.variables.map((variable) => (
                    <div key={variable} className="space-y-1.5">
                      <Label className="text-sm capitalize" htmlFor={variable}>
                        {variable?.replaceAll("_", " ")}
                        <span className="text-destructive ml-1">*</span>
                      </Label>
                      <Input
                        id={variable}
                        placeholder={`Enter ${variable?.replaceAll("_", " ")}...`}
                        className="h-9"
                        {...reactForm.register(`variables.${variable}`, { required: true })}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Variables Message */}
            {(!dialogOpen?.variables || dialogOpen.variables.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4 border rounded-md bg-muted/20">
                No input variables required
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(null);
                reactForm.reset();
              }}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              disabled={loading}
              onClick={() => {
                // Check if all variables are filled
                if (dialogOpen?.variables && dialogOpen.variables.length > 0) {
                  const values = reactForm.getValues("variables");
                  const allVariablesFilled = Object.values(values).every((value) => value?.trim() !== "");

                  if (!allVariablesFilled) {
                    toast("Missing required variables", {
                      description: "Please fill in all required variables before starting the workflow.",
                    });
                    return;
                  }
                }

                const values = reactForm.getValues("variables");

                runWorkflow({
                  variables: {
                    id: dialogOpen?.id,
                    variables: values,
                  },
                }).then(() => {
                  setDialogOpen(null);
                  reactForm.reset();
                });
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  {dialogOpen?.queue ? (
                    <>
                      <Clock className="mr-2 h-4 w-4" />
                      Schedule Template
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Run Template
                    </>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {
        queueManagementModalOpen && (
          <Dialog modal={true} open={queueManagementModalOpen !== null && queueManagementModalOpen !== undefined} onOpenChange={(open) => {
            setQueueManagementModalOpen(null);
          }}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Queue Management</DialogTitle>
              </DialogHeader>
              <QueueManagement queueName={queueManagementModalOpen} nameGenerator={(job: QueueJob) => {
                return `Template Run: ${job.data?.workflow}`;
              }} retryJob={(job: QueueJob) => {
                setDialogOpen({
                  id: job.data?.workflow || "",
                  queue: queueManagementModalOpen,
                  variables: job.data?.inputs,
                })
              }} />
            </DialogContent>
          </Dialog>
        )
      }
    </>
  );
}