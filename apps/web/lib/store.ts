import type { AnalysisJob, AnalysisResult, AxlMessage } from "@kingsvarmo/shared";

// Persist stores on globalThis so they survive Next.js module re-evaluations
// and are shared across all API route handlers in the same Node.js process.
declare global {
  // eslint-disable-next-line no-var
  var __ksJobsStore: Map<string, AnalysisJob> | undefined;
  // eslint-disable-next-line no-var
  var __ksMessagesStore: Map<string, AxlMessage[]> | undefined;
  // eslint-disable-next-line no-var
  var __ksResultsStore: Map<string, AnalysisResult> | undefined;
  // eslint-disable-next-line no-var
  var __ksKeeperHubStore: Map<string, unknown> | undefined;
}

globalThis.__ksJobsStore ??= new Map<string, AnalysisJob>();
globalThis.__ksMessagesStore ??= new Map<string, AxlMessage[]>();
globalThis.__ksResultsStore ??= new Map<string, AnalysisResult>();
globalThis.__ksKeeperHubStore ??= new Map<string, unknown>();

export const jobsStore = globalThis.__ksJobsStore;
export const messagesStore = globalThis.__ksMessagesStore;
export const resultsStore = globalThis.__ksResultsStore;
export const keeperHubStore = globalThis.__ksKeeperHubStore;
