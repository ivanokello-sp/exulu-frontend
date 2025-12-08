import { BullMqJobData } from "./bullmq";

export type QueueJob = {
  name: string;
  id: string;
  returnvalue?: any;
  stacktrace?: string[];
  finishedOn?: number;
  processedOn?: number;
  attemptsMade?: number;
  failedReason?: string;
  state: string;
  data?: BullMqJobData;
  timestamp: number;
};