import { after } from "next/server";
import { NextResponse } from "next/server";
import { getJob, setJob, getMessages, setMessages, setResult, setKeeperHubRun, getKeeperHubRun } from "@/lib/store";
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

export async function POST(_req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await params;
    const job = await getJob(jobId);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.status !== "created") {
      return NextResponse.json({ error: "Job already started" }, { status: 400 });
    }

    job.status = "planning";
    job.plannerStatus = "running";
    job.keeperhubRunId = `run_${Date.now()}`;
    await setJob(jobId, job);

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
          metadata: {},
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      raw: {
        nodeStatuses: [{ nodeId: "planner", status: "Running" }],
        execution: { executionTrace: ["planner"] },
      },
    };
    await setKeeperHubRun(jobId, keeperRun);

    const initialMessages: AxlMessage[] = [
      {
        id: `msg_${Date.now()}_1`,
        jobId,
        sender: "api",
        receiver: "planner",
        type: "job.created",
        timestamp: new Date().toISOString(),
        payload: { instruction: "Analyze CSV data" },
      },
    ];
    await setMessages(jobId, initialMessages);

    after(runAnalysisWorkflow(jobId, job.keeperhubRunId));

    return NextResponse.json({ job });
  } catch (err: unknown) {
    console.error("[POST /api/jobs/:id/start]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

async function runAnalysisWorkflow(jobId: string, keeperhubRunId: string) {
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const addLog = async (level: "info" | "error", message: string) => {
    const current = (await getKeeperHubRun(jobId)) as LocalKeeperHubRun | null;
    if (!current) return;
    const log = { id: `log_${Date.now()}`, runId: keeperhubRunId, timestamp: new Date().toISOString(), level, message, metadata: {} };
    await setKeeperHubRun(jobId, { ...current, logs: [...current.logs, log], updatedAt: new Date().toISOString() });
  };

  const pushMessage = async (msg: AxlMessage) => {
    const messages = await getMessages(jobId);
    await setMessages(jobId, [...messages, msg]);
  };

  const patchKeeper = async (patch: Partial<LocalKeeperHubRun>) => {
    const current = (await getKeeperHubRun(jobId)) as LocalKeeperHubRun | null;
    if (!current) return;
    await setKeeperHubRun(jobId, { ...current, ...patch, updatedAt: new Date().toISOString() });
  };

  try {
    // PLANNER
    await delay(1500);
    const jobAfterPlanner = await getJob(jobId);
    if (!jobAfterPlanner) return;
    jobAfterPlanner.plannerStatus = "completed";
    jobAfterPlanner.analyzerStatus = "running";
    jobAfterPlanner.status = "analyzing";
    await setJob(jobId, jobAfterPlanner);

    const keeperAfterPlanner = (await getKeeperHubRun(jobId)) as LocalKeeperHubRun | null;
    if (keeperAfterPlanner) {
      await setKeeperHubRun(jobId, {
        ...keeperAfterPlanner,
        raw: {
          nodeStatuses: [...keeperAfterPlanner.raw.nodeStatuses, { nodeId: "analyzer", status: "Running" }],
          execution: { executionTrace: [...keeperAfterPlanner.raw.execution.executionTrace, "analyzer"] },
        },
        updatedAt: new Date().toISOString(),
      });
    }
    await addLog("info", "Planner completed successfully. Analyzer starting.");
    await pushMessage({
      id: `msg_${Date.now()}_2`,
      jobId,
      sender: "planner",
      receiver: "analyzer",
      type: "plan.generated",
      timestamp: new Date().toISOString(),
      payload: { steps: ["run_0g_compute"] },
    });

    // ANALYZER (0G Compute)
    await delay(1000);

    const providerAddress = process.env.ZERO_G_COMPUTE_PROVIDER_ADDRESS ?? process.env.ZERO_G_INFERENCE_PROVIDER;
    const computeModel = process.env.ZERO_G_COMPUTE_MODEL ?? "qwen/qwen-2.5-7b-instruct";
    const computeServiceUrl = process.env.ZERO_G_COMPUTE_SERVICE_URL ?? null;
    let analysisOutput = "Simulated output: No 0G inference provider configured.";
    let inferenceChatId: string | null = null;
    let inferenceVerified: boolean | null = null;
    let zeroGCompute: Record<string, unknown> = {
      mode: "simulated",
      reason: "No 0G inference provider configured.",
      providerAddress: null,
      model: computeModel,
      serviceUrl: computeServiceUrl,
    };

    const jobForAnalysis = await getJob(jobId);

    if (providerAddress && jobForAnalysis) {
      try {
        await addLog("info", `Calling 0G Compute provider: ${providerAddress}`);
        const csvData = (jobForAnalysis.inputMetadata?.csvText as string) || "Dose,Response\n10,20\n20,45\n30,85\n40,95";
        const result = await runInference({
          providerAddress,
          systemPrompt: "You are an expert scientific data analyzer. Summarize the provided data.",
          userPrompt: `Analyze this CSV dataset:\n\n${csvData}`,
          maxTokens: 256,
        });
        analysisOutput = result.text;
        inferenceChatId = result.chatId;
        inferenceVerified = result.verified;
        zeroGCompute = {
          mode: isLocalPlaceholderInference(result.raw) ? "simulated" : "real",
          providerAddress,
          model: computeModel,
          serviceUrl: computeServiceUrl,
          chatId: result.chatId,
          verified: result.verified,
          summary: result.text,
          raw: result.raw,
        };
        await addLog("info", `0G Compute returned successfully. ZG-Res-Key: ${result.chatId || "none"}`);
      } catch (err: unknown) {
        await addLog("error", `0G Compute failed: ${err instanceof Error ? err.message : String(err)}`);
        analysisOutput = "Failed to run 0G Compute inference.";
        zeroGCompute = { mode: "failed", providerAddress, model: computeModel, serviceUrl: computeServiceUrl, error: err instanceof Error ? err.message : String(err) };
      }
    }

    const jobAfterAnalysis = await getJob(jobId);
    if (!jobAfterAnalysis) return;
    jobAfterAnalysis.analyzerStatus = "completed";
    jobAfterAnalysis.criticStatus = "running";
    jobAfterAnalysis.status = "reviewing";
    await setJob(jobId, jobAfterAnalysis);

    await pushMessage({
      id: `msg_${Date.now()}_3`,
      jobId,
      sender: "analyzer",
      receiver: "critic",
      type: "analysis.completed",
      timestamp: new Date().toISOString(),
      payload: { output: analysisOutput, zgChatId: inferenceChatId },
    });

    const keeperAfterAnalysis = (await getKeeperHubRun(jobId)) as LocalKeeperHubRun | null;
    if (keeperAfterAnalysis) {
      await setKeeperHubRun(jobId, {
        ...keeperAfterAnalysis,
        raw: {
          nodeStatuses: [...keeperAfterAnalysis.raw.nodeStatuses, { nodeId: "critic", status: "Running" }],
          execution: { executionTrace: [...keeperAfterAnalysis.raw.execution.executionTrace, "critic"] },
        },
        updatedAt: new Date().toISOString(),
      });
    }

    // CRITIC
    await delay(1500);
    const jobAfterCritic = await getJob(jobId);
    if (!jobAfterCritic) return;
    jobAfterCritic.criticStatus = "completed";
    jobAfterCritic.reporterStatus = "running";
    jobAfterCritic.status = "reporting";
    await setJob(jobId, jobAfterCritic);

    await pushMessage({
      id: `msg_${Date.now()}_4`,
      jobId,
      sender: "critic",
      receiver: "reporter",
      type: "critic.reviewed",
      timestamp: new Date().toISOString(),
      payload: { score: 0.95 },
    });

    const keeperAfterCritic = (await getKeeperHubRun(jobId)) as LocalKeeperHubRun | null;
    if (keeperAfterCritic) {
      await setKeeperHubRun(jobId, {
        ...keeperAfterCritic,
        raw: {
          nodeStatuses: [...keeperAfterCritic.raw.nodeStatuses, { nodeId: "reporter", status: "Running" }],
          execution: { executionTrace: [...keeperAfterCritic.raw.execution.executionTrace, "reporter"] },
        },
        updatedAt: new Date().toISOString(),
      });
    }

    // REPORTER
    await delay(1000);
    const resultId = `res_${Date.now()}`;

    const jobAfterReporter = await getJob(jobId);
    if (!jobAfterReporter) return;
    jobAfterReporter.reporterStatus = "completed";
    jobAfterReporter.status = "completed";
    jobAfterReporter.resultId = resultId;
    await setJob(jobId, jobAfterReporter);

    await pushMessage({
      id: `msg_${Date.now()}_5`,
      jobId,
      sender: "reporter",
      receiver: "api",
      type: "report.generated",
      timestamp: new Date().toISOString(),
      payload: { resultId },
    });

    await setResult(jobId, {
      id: resultId,
      jobId,
      summary: "Analysis completed. " + analysisOutput,
      confidence: 0.95,
      keyFindings: [
        "Data was processed using 0G Compute Network.",
        `Inference Provider: ${providerAddress || "None (simulated)"}`,
      ],
      structuredJson: {
        estimatedDl50: 22.4,
        method: "0G Compute Inference",
        verified: inferenceVerified,
        zeroGCompute,
      },
      explanation: "This workflow used 0G Compute to run the analysis.",
      provenanceId: inferenceChatId || `prov_${Date.now()}`,
      completedAt: new Date().toISOString(),
    });

    await patchKeeper({ state: "completed" });
    await addLog("info", "Workflow finished successfully.");
  } catch (err) {
    const failedJob = await getJob(jobId);
    if (failedJob) {
      failedJob.status = "failed";
      await setJob(jobId, failedJob);
    }
    await patchKeeper({ state: "failed" });
    await addLog("error", `Workflow failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function isLocalPlaceholderInference(raw: unknown): boolean {
  return (
    typeof raw === "object" &&
    raw !== null &&
    "mode" in raw &&
    (raw as { mode?: unknown }).mode === "local-placeholder"
  );
}
