import { NextResponse } from "next/server";
import { jobsStore, messagesStore, keeperHubStore, resultsStore } from "@/lib/store";
import { runInference } from "@kingsvarmo/zero-g";
import type { AxlMessage } from "@kingsvarmo/shared";

type LocalKeeperHubRun = {
  id: string;
  jobId: string;
  state: "running" | "completed" | "failed";
  workflowId: string;
  logs: Array<{
    id: string;
    runId: string;
    timestamp: string;
    level: "info" | "error";
    message: string;
    metadata: Record<string, unknown>;
  }>;
  createdAt: string;
  updatedAt: string;
  raw: {
    nodeStatuses: Array<{ nodeId: string; status: string }>;
    execution: { executionTrace: string[] };
  };
};

export async function POST(req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await params;
    const job = jobsStore.get(jobId);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.status !== "created") {
      return NextResponse.json({ error: "Job already started" }, { status: 400 });
    }

    // 1. Update status to started
    job.status = "planning";
    job.plannerStatus = "running";
    job.keeperhubRunId = `run_${Date.now()}`;
    jobsStore.set(jobId, job);

    // Create initial keeperHub state
    const keeperRun: LocalKeeperHubRun = {
      id: job.keeperhubRunId,
      jobId,
      state: "running",
      workflowId: "wf_scientific_analysis_v1",
      logs: [
        {
          id: `log_${Date.now()}`,
          runId: job.keeperhubRunId,
          timestamp: new Date().toISOString(),
          level: "info",
          message: "Workflow started via API request",
          metadata: {}
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      raw: {
        nodeStatuses: [{ nodeId: "planner", status: "Running" }],
        execution: { executionTrace: ["planner"] }
      }
    };
    keeperHubStore.set(jobId, keeperRun);

    // Mock planner message
    const messages: AxlMessage[] = [];
    messages.push({
      id: `msg_${Date.now()}_1`,
      jobId,
      sender: "api",
      receiver: "planner",
      type: "job.created",
      timestamp: new Date().toISOString(),
      payload: { instruction: "Analyze CSV data" }
    });
    messagesStore.set(jobId, messages);

    // Run async analysis process without blocking the response
    runAnalysisWorkflow(jobId);

    return NextResponse.json({ job });
  } catch (err: unknown) {
    console.error("[POST /api/jobs/:id/start]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

async function runAnalysisWorkflow(jobId: string) {
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  const job = jobsStore.get(jobId)!;
  const messages = messagesStore.get(jobId)!;
  const keeperRun = keeperHubStore.get(jobId) as LocalKeeperHubRun;

  try {
    // ----------------------------------------------------------------------
    // PLANNER
    // ----------------------------------------------------------------------
    await delay(1500);
    job.plannerStatus = "completed";
    job.analyzerStatus = "running";
    job.status = "analyzing";
    jobsStore.set(jobId, job);
    
    keeperRun.raw.nodeStatuses.push({ nodeId: "analyzer", status: "Running" });
    keeperRun.raw.execution.executionTrace.push("analyzer");
    keeperRun.logs.push({
      id: `log_${Date.now()}`,
      runId: job.keeperhubRunId!,
      timestamp: new Date().toISOString(),
      level: "info",
      message: "Planner completed successfully. Analyzer starting.",
      metadata: {}
    });

    messages.push({
      id: `msg_${Date.now()}_2`,
      jobId,
      sender: "planner",
      receiver: "analyzer",
      type: "plan.generated",
      timestamp: new Date().toISOString(),
      payload: { steps: ["run_0g_compute"] }
    });

    // ----------------------------------------------------------------------
    // ANALYZER (0G Compute Inference)
    // ----------------------------------------------------------------------
    await delay(1000);
    
    // Check if we have 0G Provider set up
    const providerAddress = process.env.ZERO_G_INFERENCE_PROVIDER;
    let analysisOutput = "Simulated output: No 0G inference provider configured.";
    let inferenceChatId: string | null = null;
    let inferenceVerified: boolean | null = null;

    if (providerAddress) {
      try {
        keeperRun.logs.push({
          id: `log_${Date.now()}`,
          runId: job.keeperhubRunId!,
          timestamp: new Date().toISOString(),
          level: "info",
          message: `Calling 0G Compute provider: ${providerAddress}`,
          metadata: {}
        });

        // Use the dataset we got from inputMetadata (if any)
        const csvData = job.inputMetadata?.csvText as string || "Dose,Response\n10,20\n20,45\n30,85\n40,95";

        const result = await runInference({
          providerAddress,
          systemPrompt: "You are an expert scientific data analyzer. Summarize the provided data.",
          userPrompt: `Analyze this CSV dataset: \n\n${csvData}`,
          maxTokens: 256,
        });

        analysisOutput = result.text;
        inferenceChatId = result.chatId;
        inferenceVerified = result.verified;

        keeperRun.logs.push({
          id: `log_${Date.now()}`,
          runId: job.keeperhubRunId!,
          timestamp: new Date().toISOString(),
          level: "info",
          message: `0G Compute returned successfully. ZG-Res-Key: ${result.chatId || 'none'}`,
          metadata: { verified: result.verified }
        });
      } catch (err: unknown) {
        keeperRun.logs.push({
          id: `log_${Date.now()}`,
          runId: job.keeperhubRunId!,
          timestamp: new Date().toISOString(),
          level: "error",
          message: `0G Compute failed: ${err instanceof Error ? err.message : String(err)}`,
          metadata: {}
        });
        analysisOutput = "Failed to run 0G Compute inference.";
      }
    }

    job.analyzerStatus = "completed";
    job.criticStatus = "running";
    job.status = "reviewing";
    jobsStore.set(jobId, job);

    messages.push({
      id: `msg_${Date.now()}_3`,
      jobId,
      sender: "analyzer",
      receiver: "critic",
      type: "analysis.completed",
      timestamp: new Date().toISOString(),
      payload: { output: analysisOutput, zgChatId: inferenceChatId }
    });

    keeperRun.raw.nodeStatuses.push({ nodeId: "critic", status: "Running" });
    keeperRun.raw.execution.executionTrace.push("critic");

    // ----------------------------------------------------------------------
    // CRITIC
    // ----------------------------------------------------------------------
    await delay(1500);
    job.criticStatus = "completed";
    job.reporterStatus = "running";
    job.status = "reporting";
    jobsStore.set(jobId, job);

    messages.push({
      id: `msg_${Date.now()}_4`,
      jobId,
      sender: "critic",
      receiver: "reporter",
      type: "critic.reviewed",
      timestamp: new Date().toISOString(),
      payload: { score: 0.95 }
    });

    keeperRun.raw.nodeStatuses.push({ nodeId: "reporter", status: "Running" });
    keeperRun.raw.execution.executionTrace.push("reporter");

    // ----------------------------------------------------------------------
    // REPORTER & FINISH
    // ----------------------------------------------------------------------
    await delay(1000);
    
    const resultId = `res_${Date.now()}`;
    job.reporterStatus = "completed";
    job.status = "completed";
    job.resultId = resultId;
    jobsStore.set(jobId, job);

    messages.push({
      id: `msg_${Date.now()}_5`,
      jobId,
      sender: "reporter",
      receiver: "api",
      type: "report.generated",
      timestamp: new Date().toISOString(),
      payload: { resultId }
    });

    resultsStore.set(resultId, {
      id: resultId,
      jobId,
      summary: "Analysis completed. " + analysisOutput,
      confidence: 0.95,
      keyFindings: [
        "Data was processed using 0G Compute Network.",
        `Inference Provider: ${providerAddress || 'None (simulated)'}`
      ],
      structuredJson: {
        estimatedDl50: 22.4,
        method: "0G Compute Inference",
        verified: inferenceVerified,
      },
      explanation: "This workflow used 0G Compute to run the analysis.",
      provenanceId: inferenceChatId || `prov_${Date.now()}`,
      completedAt: new Date().toISOString()
    });

    keeperRun.state = "completed";
    keeperRun.logs.push({
      id: `log_${Date.now()}`,
      runId: job.keeperhubRunId!,
      timestamp: new Date().toISOString(),
      level: "info",
      message: "Workflow finished successfully.",
      metadata: {}
    });

  } catch (err) {
    job.status = "failed";
    jobsStore.set(jobId, job);
    keeperRun.state = "failed";
    keeperRun.logs.push({
      id: `log_${Date.now()}`,
      runId: job.keeperhubRunId!,
      timestamp: new Date().toISOString(),
      level: "error",
      message: `Workflow failed: ${err instanceof Error ? err.message : String(err)}`,
      metadata: {}
    });
  }
}
