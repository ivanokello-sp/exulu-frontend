"use client";

import { DataTable } from "./components/data-table";

export const dynamic = "force-dynamic";

export default function FeedbackPage() {
  return (
    <>
      <div className="hidden h-full flex-1 flex-col space-y-8 p-8 md:flex">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Feedback</h2>
            <p className="text-muted-foreground">
              Review and manage user feedback from chat sessions.
            </p>
          </div>
        </div>
        <DataTable />
      </div>
    </>
  );
}
