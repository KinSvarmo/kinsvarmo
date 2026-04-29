"use client";

import { use, useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAccount, useConnect, useBalance, useChainId, useSwitchChain } from "wagmi";
import { seededAgents, type AnalysisJob, type AgentListing } from "@kingsvarmo/shared";
import { useINFTToken, useTokenMetadata, usePurchaseUsage } from "@/hooks/useINFTRegistry";
import { fetchJson } from "@/lib/api";
import { ogTestnet } from "@/lib/chain";
import { CONTRACT_ADDRESSES } from "@/lib/contracts";
import { injectedConnector } from "@/lib/wagmi";
import { formatEther, formatUnits, parseEther, stringToHex } from "viem";

type Step = "upload" | "validate" | "review" | "confirm";

const STEP_ORDER: Step[] = ["upload", "validate", "review", "confirm"];

const STEP_LABELS: Record<Step, string> = {
  upload: "Upload Dataset",
  validate: "Validate File",
  review: "Review Cost",
  confirm: "0G Authorization",
};

const ALLOWED_FORMATS = ["csv", "json", "tsv", "txt"];
const MAX_SIZE_MB = 50;

const DOMAIN_EMOJI: Record<string, string> = {
  phytochemistry: "🌿",
  toxicology: "⚠️",
  genomics: "🧬",
  materials: "⚗️",
  "research-ops": "📋",
  onchain: "◆",
  default: "🤖",
};

type FileCheck = {
  label: string;
  status: "pass" | "fail" | "pending";
  detail?: string;
};

type ZeroGStatus = {
  configured: boolean;
  chain: { configured: boolean; missing: string[] };
  storage: { configured: boolean; missing: string[] };
  compute: {
    configured: boolean;
    providerAddress?: string;
    model?: string;
    hasSecret: boolean;
    missing: string[];
  };
  contracts: {
    configured: boolean;
    agentRegistryAddress?: string;
    usageAuthorizationAddress?: string;
    missing: string[];
  };
};

function CheckIcon({ status }: { status: FileCheck["status"] }) {
  if (status === "pass")
    return (
      <svg className="check-icon pass" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" />
      </svg>
    );
  if (status === "fail")
    return (
      <svg className="check-icon fail" viewBox="0 0 20 20" fill="currentColor">
        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
      </svg>
    );
  return (
    <svg className="check-icon pending" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" />
    </svg>
  );
}

function ReadinessRow({ label, ready, missing = [] }: { label: string; ready?: boolean | undefined; missing?: string[] | undefined }) {
  const value = ready
    ? "configured"
    : missing.length > 0
      ? `missing ${missing.length}`
      : "checking";

  return (
    <div className="job-detail-row">
      <span>{label}</span>
      <strong style={{ color: ready ? "var(--teal)" : "var(--amber)" }}>{value}</strong>
    </div>
  );
}

function StepBar({ current }: { current: Step }) {
  const idx = STEP_ORDER.indexOf(current);
  return (
    <div className="stepper">
      {STEP_ORDER.map((s, i) => (
        <div key={s} style={{ display: "flex", alignItems: "center", flex: i < STEP_ORDER.length - 1 ? 1 : undefined }}>
          <div className="step-item">
            <div className={`step-dot ${i < idx ? "done" : i === idx ? "active" : "inactive"}`}>
              {i < idx ? "✓" : i + 1}
            </div>
            <span className={`step-label ${i === idx ? "active" : ""}`}>{STEP_LABELS[s]}</span>
          </div>
          {i < STEP_ORDER.length - 1 && <div className="step-connector" />}
        </div>
      ))}
    </div>
  );
}

export default function AgentRunPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const seededAgent = seededAgents.find((candidate) => candidate.slug === slug || candidate.onchainTokenId === slug);
  const [apiAgent, setApiAgent] = useState<AgentListing | null>(null);
  const [isAgentLoaded, setIsAgentLoaded] = useState(false);
  const isTokenIdRoute = /^\d+$/.test(slug);
  const baseAgent = apiAgent ?? seededAgent;
  const tokenIdBigInt = seededAgent?.onchainTokenId
    ? BigInt(seededAgent.onchainTokenId)
    : isTokenIdRoute
      ? BigInt(slug)
      : undefined;
  const token = useINFTToken(tokenIdBigInt);
  const onchainMetadata = token.agentMetadata.data;
  const onchainTokenURI = token.tokenURI.data;
  const tokenMetadata = useTokenMetadata(onchainTokenURI ? String(onchainTokenURI) : undefined);
  const tokenId = tokenIdBigInt?.toString() ?? baseAgent?.onchainTokenId ?? slug;
  const contractAddress = baseAgent?.contractAddress ?? CONTRACT_ADDRESSES.INFTRegistry;

  const resolvedFormats = tokenMetadata.data?.formats?.length
    ? tokenMetadata.data.formats
    : baseAgent?.supportedFormats ?? ["csv", "json"];
  const resolvedCreatorName = tokenMetadata.data?.creatorName || onchainMetadata?.[3] || baseAgent?.creatorName || "Onchain creator";
  const resolvedName = tokenMetadata.data?.name || onchainMetadata?.[0] || baseAgent?.name || `iNFT #${tokenId}`;
  const resolvedDescription = tokenMetadata.data?.description || onchainMetadata?.[1] || baseAgent?.description || "Readable metadata is still loading from the token URI.";
  const resolvedPreview = tokenMetadata.data?.previewOutput || baseAgent?.previewOutput || "No preview output available yet.";
  const resolvedIntelligenceRef = tokenMetadata.data?.intelligenceReference || onchainMetadata?.[5] || baseAgent?.intelligenceReference || "—";
  const resolvedStorageRef = tokenMetadata.data?.storageReference || onchainMetadata?.[6] || baseAgent?.storageReference || "—";
  const resolvedPrice = tokenMetadata.data?.priceIn0G || baseAgent?.priceIn0G || "0";
  const resolvedRuntimeSeconds = tokenMetadata.data?.runtimeSeconds
    ? Number(tokenMetadata.data.runtimeSeconds)
    : baseAgent?.runtimeEstimateSeconds ?? 120;

  const fallbackAgent: AgentListing = {
    id: `agent_token_${tokenId}`,
    onchainTokenId: tokenId,
    contractAddress,
    name: resolvedName,
    slug,
    creatorName: resolvedCreatorName,
    creatorWallet: token.owner.data ? String(token.owner.data) : "0x0000000000000000000000000000000000000000",
    description: resolvedDescription,
    longDescription: resolvedDescription,
    domain: tokenMetadata.data?.domain || baseAgent?.domain || "onchain",
    supportedFormats: resolvedFormats as AgentListing["supportedFormats"],
    priceIn0G: resolvedPrice,
    runtimeEstimateSeconds: resolvedRuntimeSeconds,
    status: "published",
    previewOutput: resolvedPreview,
    expectedOutput: resolvedPreview,
    privacyNotes: baseAgent?.privacyNotes || "Onchain token metadata",
    createdAt: baseAgent?.createdAt || "1970-01-01T00:00:00.000Z",
    ...(resolvedIntelligenceRef !== "—" ? { intelligenceReference: resolvedIntelligenceRef } : {}),
    ...(resolvedStorageRef !== "—" ? { storageReference: resolvedStorageRef } : {}),
  };
  const agent = baseAgent ?? fallbackAgent;
  const isExecutableDemoAgent = agent.status === "published";
  const displayName = resolvedName;
  const displayCreator = resolvedCreatorName;
  const displayDescription = resolvedDescription;
  const displayPreview = resolvedPreview;
  const displayIntelligenceRef = resolvedIntelligenceRef;
  const displayStorageRef = resolvedStorageRef;
  const displayPrice = resolvedPrice;
  const displayRuntime = `~${Math.round(resolvedRuntimeSeconds / 60)} min`;
  const displayFormats = resolvedFormats.map((format) => `.${format}`).join(", ");
  const explorerContractUrl = contractAddress
    ? `${ogTestnet.blockExplorers.default.url}/address/${contractAddress}`
    : ogTestnet.blockExplorers.default.url;

  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [dragover, setDragover] = useState(false);
  const [checks, setChecks] = useState<FileCheck[]>([]);
  const [datasetRef, setDatasetRef] = useState<string>("");
  const [confirmed, setConfirmed] = useState(false);
  const [apiJobId, setApiJobId] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [zeroGStatus, setZeroGStatus] = useState<ZeroGStatus | null>(null);
  const [isSubmittingJob, setIsSubmittingJob] = useState(false);
  const [isStartingDemoRun, setIsStartingDemoRun] = useState(false);
  const [pendingAnalysisPayload, setPendingAnalysisPayload] = useState<{
    csvText: string;
    filename: string;
  } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { data: balance } = useBalance({ address, chainId: ogTestnet.id });
  const { purchaseUsage, txHash, isPending, isConfirming, isSuccess, error } = usePurchaseUsage();

  useEffect(() => {
    let cancelled = false;

    async function loadAgent() {
      try {
        const response = await fetchJson<{ agent: AgentListing }>(`/api/agents/${slug}`);

        if (!cancelled) {
          setApiAgent(response.agent);
        }
      } catch {
        if (!cancelled) {
          setApiAgent(null);
        }
      } finally {
        if (!cancelled) {
          setIsAgentLoaded(true);
        }
      }
    }

    void loadAgent();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    let cancelled = false;

    async function loadZeroGStatus() {
      try {
        const response = await fetchJson<{ zeroG: ZeroGStatus }>("/api/0g/status");

        if (!cancelled) {
          setZeroGStatus(response.zeroG);
        }
      } catch {
        if (!cancelled) {
          setZeroGStatus(null);
        }
      }
    }

    void loadZeroGStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!baseAgent && !isTokenIdRoute && isAgentLoaded) {
    return (
      <div className="container" style={{ paddingTop: 80, paddingBottom: 80, maxWidth: 720 }}>
        <div className="glass-lg" style={{ padding: 32 }}>
          <p className="eyebrow" style={{ marginBottom: 10 }}>Agent</p>
          <h1 style={{ fontSize: "1.8rem", marginBottom: 12 }}>Agent unavailable</h1>
          <div className="callout callout-error" style={{ marginBottom: 20 }}>
            This agent could not be found in the API marketplace.
          </div>
          <Link href="/agents" className="btn btn-secondary">Back to Agents</Link>
        </div>
      </div>
    );
  }

  // File validation
  const validateFile = useCallback((f: File) => {
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    const agentSupportsFormat = agent.supportedFormats.some((format) => format === ext);
    const sizeMB = f.size / (1024 * 1024);
    const results: FileCheck[] = [
      {
        label: "File format",
        status: ALLOWED_FORMATS.includes(ext) ? "pass" : "fail",
        detail: ALLOWED_FORMATS.includes(ext)
          ? `.${ext} is supported`
          : `".${ext}" is not supported — use ${ALLOWED_FORMATS.join(", ")}`,
      },
      {
        label: "File size",
        status: sizeMB <= MAX_SIZE_MB ? "pass" : "fail",
        detail: `${sizeMB.toFixed(2)} MB / ${MAX_SIZE_MB} MB limit`,
      },
      {
        label: "Non-empty file",
        status: f.size > 0 ? "pass" : "fail",
        detail: f.size > 0 ? "File contains data" : "File is empty",
      },
      {
        label: "Compatible with agent",
        status: agentSupportsFormat ? "pass" : "fail",
        detail: agentSupportsFormat
          ? "Format matches agent requirements"
          : `Agent accepts: ${agent.supportedFormats.join(", ")}`,
      },
    ];
    return results;
  }, [agent]);

  const handleFile = (f: File) => {
    setFile(f);
    const results = validateFile(f);
    setChecks(results);
    setDatasetRef(`0g://dataset/${Date.now()}-${f.name}`);
    setStep("validate");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragover(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const allPass = checks.every((c) => c.status === "pass");
  const usageFeeValue = token.usageFee.data ? (token.usageFee.data as bigint) : parseEther("0.01");
  const hasSufficientBalance = balance
    ? balance.value >= usageFeeValue
    : false;

  // Compute cost breakdown
  const basePrice = parseFloat(agent.priceIn0G);
  const storageFee = 0.02;
  const protocolFee = +(basePrice * 0.05).toFixed(3);
  const totalOG = +(basePrice + storageFee + protocolFee).toFixed(3);

  const handleDemoRun = async () => {
    if (isStartingDemoRun || !isExecutableDemoAgent) {
      return;
    }

    setApiError(null);
    setIsStartingDemoRun(true);

    try {
      const { job } = await fetchJson<{ job: AnalysisJob }>("/api/jobs", {
        method: "POST",
        body: JSON.stringify({
          agentId: agent.id,
          userWallet: address ?? "0x0000000000000000000000000000000000000001",
          filename: `${agent.slug}-demo.csv`,
          uploadReference: `demo://${agent.slug}.csv`,
          inputMetadata: {
            source: "ui-demo-run",
            analysisType: `${agent.domain}-demo`,
            mode: "local-axl-plus-real-keeperhub"
          }
        })
      });

      await fetchJson<{ job: AnalysisJob | null }>(`/api/jobs/${job.id}/start`, {
        method: "POST"
      });

      router.push(`/jobs/${job.id}`);
    } catch (caught) {
      setApiError(caught instanceof Error ? caught.message : "Could not start the demo workflow");
    } finally {
      setIsStartingDemoRun(false);
    }
  };

  const handleLocalUploadRun = async () => {
    if (isSubmittingJob || !file) {
      return;
    }

    setApiError(null);
    setIsSubmittingJob(true);

    try {
      const datasetText = await file.text();
      const { job } = await fetchJson<{ job: AnalysisJob }>("/api/jobs", {
        method: "POST",
        body: JSON.stringify({
          agentId: agent.id,
          userWallet: address ?? "local-demo-user",
          filename: file.name,
          uploadReference: `local://uploads/${Date.now()}-${file.name}`,
          inputMetadata: {
            source: "web-local-upload",
            analysisType: `${agent.domain}-demo`,
            datasetText,
            totalOG,
            storageFee,
            protocolFee,
            fileSizeBytes: file.size
          }
        })
      });

      await fetchJson<{ job: AnalysisJob | null }>(`/api/jobs/${job.id}/start`, {
        method: "POST"
      });

      router.push(`/jobs/${job.id}`);
    } catch (caught) {
      setApiError(caught instanceof Error ? caught.message : "Could not start the local analysis job");
    } finally {
      setIsSubmittingJob(false);
    }
  };

  const handleAuthorize = async () => {
    if (!isConnected) {
      connect({ connector: injectedConnector, chainId: ogTestnet.id });
      return;
    }

    setApiError(null);
    if (chainId !== ogTestnet.id) {
      try {
        await switchChainAsync({ chainId: ogTestnet.id });
      } catch (caught) {
        setApiError(caught instanceof Error ? caught.message : "Could not switch wallet to 0G Galileo testnet");
        return;
      }
    }

    if (!tokenIdBigInt) {
      setApiError("This agent does not have an onchain token ID yet.");
      return;
    }
    if (!file) {
      setApiError("Please upload a CSV dataset first.");
      return;
    }

    setIsSubmittingJob(true);
    try {
      const csvText = await file.text();
      setPendingAnalysisPayload({
        csvText,
        filename: file.name,
      });
      const permissions = stringToHex(`dl50:${agent.id}:${datasetRef}`);
      await purchaseUsage(tokenIdBigInt, permissions, usageFeeValue);
    } catch (caught) {
      setIsSubmittingJob(false);
      setPendingAnalysisPayload(null);
      setApiError(caught instanceof Error ? caught.message : "Could not start the wallet transaction");
    }
  };

  useEffect(() => {
    if (!isSuccess || !pendingAnalysisPayload) {
      return;
    }

    let cancelled = false;
    const payload = pendingAnalysisPayload;

    async function submitAnalysisJob() {
      try {
        const { job } = await fetchJson<{ job: AnalysisJob }>("/api/jobs", {
          method: "POST",
          body: JSON.stringify({
            agentId: agent.id,
            userWallet: address ?? "0x0000000000000000000000000000000000000001",
            filename: payload.filename,
            uploadReference: datasetRef,
            inputMetadata: {
              source: "web-run-page",
              analysisType: "dl50",
              csvText: payload.csvText,
              totalOG,
              storageFee,
              protocolFee,
              fileSizeBytes: file?.size ?? 0
            }
          })
        });

        await fetchJson<{ job: AnalysisJob | null }>(`/api/jobs/${job.id}/start`, {
          method: "POST"
        });

        if (!cancelled) {
          setApiJobId(job.id);
          setConfirmed(true);
        }
      } catch (caught) {
        if (!cancelled) {
          setApiError(caught instanceof Error ? caught.message : "Could not create the analysis job");
        }
      } finally {
        if (!cancelled) {
          setIsSubmittingJob(false);
          setPendingAnalysisPayload(null);
        }
      }
    }

    void submitAnalysisJob();

    return () => {
      cancelled = true;
    };
  }, [isSuccess, pendingAnalysisPayload, address, agent.id, datasetRef, totalOG, storageFee, protocolFee, file?.size]);

  // Success redirect (once contracts live + real txHash)
  useEffect(() => {
    if (isSuccess && txHash) {
      // redirect(`/jobs/${txHash}`)
    }
  }, [isSuccess, txHash]);

  if (confirmed) {
    return (
      <div className="container" style={{ paddingTop: 80, paddingBottom: 80, maxWidth: 640, margin: "0 auto" }}>
        <div className="glass-lg" style={{ padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: 16 }}>🚀</div>
          <h1 style={{ fontSize: "1.8rem", marginBottom: 12 }}>Analysis Queued</h1>
          <p style={{ color: "var(--text-2)", marginBottom: 24, lineHeight: 1.6 }}>
            Your job has been submitted. The agent swarm will coordinate via Gensyn AXL and execute through KeeperHub.
            Results will appear once the workflow completes.
          </p>
          <div className="tx-panel" style={{ marginBottom: 24, textAlign: "left" }}>
            {txHash && (
              <div style={{ marginBottom: 6 }}>
                <span style={{ color: "var(--text-3)" }}>Wallet tx:</span>{" "}
                <a
                  href={`https://chainscan-galileo.0g.ai/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--teal)" }}
                >
                  {txHash.slice(0, 20)}…
                </a>
              </div>
            )}
            <div style={{ marginBottom: 6 }}><span style={{ color: "var(--text-3)" }}>Dataset ref:</span> {datasetRef}</div>
            <div><span style={{ color: "var(--text-3)" }}>Agent:</span> {agent.name}</div>
            {apiJobId && (
              <div style={{ marginTop: 6 }}><span style={{ color: "var(--text-3)" }}>API job:</span> {apiJobId}</div>
            )}
          </div>
          <div className="callout callout-info" style={{ marginBottom: 24, textAlign: "left" }}>
            Smart contract integration is coming once deployed to 0G testnet. The on-chain job ID and tx hash will appear here.
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            {apiJobId && (
              <Link href={`/jobs/${apiJobId}`} className="btn btn-primary">View Job Status</Link>
            )}
            <Link href="/agents" className="btn btn-secondary">Back to Agents</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 80 }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32, fontSize: "0.82rem", color: "var(--text-3)" }}>
        <Link href="/agents" style={{ color: "var(--text-3)" }}>Agents</Link>
        <span>/</span>
        <span style={{ color: "var(--text)" }}>{agent.name}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 32, alignItems: "start" }}>
        {/* ── Main panel ── */}
        <div>
          {/* Agent header */}
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 32 }}>
            <div className="agent-avatar" style={{ fontSize: "2rem", width: 64, height: 64 }}>
              {DOMAIN_EMOJI[agent.domain] ?? DOMAIN_EMOJI.default}
            </div>
            <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap", alignItems: "center" }}>
                <h1 style={{ fontSize: "1.6rem" }}>{displayName}</h1>
                <span className="badge badge-teal">Published</span>
                {agent.intelligenceReference && (
                  <a
                    href={`https://chainscan-galileo.0g.ai`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="badge badge-violet"
                    style={{ cursor: "pointer" }}
                    title={agent.intelligenceReference}
                  >
                    ◆ 0G indexed ↗
                  </a>
                )}
              </div>
              <p style={{ color: "var(--text-2)", fontSize: "0.9rem", marginBottom: 4 }}>
                by {displayCreator}
              </p>
              <p style={{ color: "var(--text-2)", lineHeight: 1.6 }}>{displayDescription}</p>
              <div className="callout callout-info" style={{ marginTop: 12 }}>
                <strong>Preview output:</strong> {displayPreview}
              </div>
              {isExecutableDemoAgent && (
                <div className="glass" style={{ marginTop: 16, padding: 18, background: "var(--bg-raised)" }}>
                  <p className="eyebrow" style={{ marginBottom: 8 }}>AXL + KeeperHub test path</p>
                  <p style={{ color: "var(--text-2)", fontSize: "0.86rem", lineHeight: 1.6, marginBottom: 14 }}>
                    Start a local demo job without wallet payment. This creates an API job, triggers KeeperHub, and sends the request through AXL worker nodes.
                  </p>
                  <button
                    className="btn btn-primary"
                    disabled={isStartingDemoRun}
                    onClick={handleDemoRun}
                  >
                    {isStartingDemoRun ? "Starting Demo Workflow..." : "Run Demo Analysis"}
                  </button>
                </div>
              )}
              {apiError && (
                <div className="callout callout-error" style={{ marginTop: 12 }}>
                  {apiError}
                </div>
              )}
            </div>
          </div>

          {/* Stepper */}
          <div style={{ marginBottom: 32 }}>
            <StepBar current={step} />
          </div>

          {/* ── Step: Upload ── */}
          {step === "upload" && (
            <div>
              <h2 style={{ fontSize: "1.2rem", marginBottom: 8 }}>Upload your dataset</h2>
              <p style={{ color: "var(--text-2)", marginBottom: 20, fontSize: "0.9rem" }}>
                Accepted formats: {agent.supportedFormats.map((f) => `.${f}`).join(", ")} · Max {MAX_SIZE_MB} MB
              </p>

              <div
                className={`upload-zone ${dragover ? "dragover" : ""} ${file ? "has-file" : ""}`}
                onClick={() => fileInput.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
                onDragLeave={() => setDragover(false)}
                onDrop={handleDrop}
              >
                <div className="upload-icon">
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p style={{ fontWeight: 600, marginBottom: 6 }}>
                  {dragover ? "Drop your file here" : "Drag & drop your dataset"}
                </p>
                <p style={{ fontSize: "0.82rem", color: "var(--text-3)" }}>
                  or <span style={{ color: "var(--teal)", textDecoration: "underline" }}>browse files</span>
                </p>
                <input
                  ref={fileInput}
                  type="file"
                  accept={agent.supportedFormats.map((f) => `.${f}`).join(",")}
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </div>

              <div className="callout callout-info" style={{ marginTop: 20 }}>
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20" style={{ flexShrink: 0, marginTop: 1 }}>
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                </svg>
                <span>Your dataset is uploaded to 0G Storage and only accessible by the authorized analysis execution. The agent&apos;s logic remains encrypted and private at all times.</span>
              </div>
            </div>
          )}

          {/* ── Step: Validate ── */}
          {step === "validate" && file && (
            <div>
              <h2 style={{ fontSize: "1.2rem", marginBottom: 4 }}>Validating: <span style={{ color: "var(--teal)" }}>{file.name}</span></h2>
              <p style={{ color: "var(--text-2)", fontSize: "0.88rem", marginBottom: 24 }}>
                {(file.size / 1024).toFixed(1)} KB · {file.type || "unknown type"}
              </p>

              <div className="glass" style={{ padding: 24, marginBottom: 24 }}>
                <div className="check-list">
                  {checks.map((c) => (
                    <div key={c.label} className="check-item">
                      <CheckIcon status={c.status} />
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 500 }}>{c.label}</span>
                        {c.detail && (
                          <span style={{ color: c.status === "fail" ? "#f87171" : "var(--text-3)", marginLeft: 8, fontSize: "0.82rem" }}>
                            — {c.detail}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {!allPass && (
                <div className="callout callout-error" style={{ marginBottom: 20 }}>
                  Some checks failed. Please upload a valid file.
                </div>
              )}

              <div style={{ display: "flex", gap: 12 }}>
                <button className="btn btn-ghost" onClick={() => { setFile(null); setStep("upload"); }}>
                  ← Change file
                </button>
                <button
                  className="btn btn-primary"
                  disabled={!allPass}
                  onClick={() => setStep("review")}
                >
                  Proceed to Cost Review →
                </button>
              </div>
            </div>
          )}

          {/* ── Step: Review ── */}
          {step === "review" && (
            <div>
              <h2 style={{ fontSize: "1.2rem", marginBottom: 20 }}>Review cost</h2>

              <div className="glass" style={{ padding: 24, marginBottom: 20 }}>
                <div className="cost-row">
                  <span className="label">Analysis fee</span>
                  <span className="value">{agent.priceIn0G} OG</span>
                </div>
                <div className="cost-row">
                  <span className="label">0G Storage (dataset)</span>
                  <span className="value">{storageFee} OG</span>
                </div>
                <div className="cost-row">
                  <span className="label">Protocol fee (5%)</span>
                  <span className="value">{protocolFee} OG</span>
                </div>
                <div className="cost-row cost-total" style={{ paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                  <span className="label font-bold">Total</span>
                  <span className="value">{totalOG} OG</span>
                </div>
              </div>

              <div className="glass" style={{ padding: 20, marginBottom: 24 }}>
                <p className="eyebrow" style={{ marginBottom: 10, fontSize: "0.7rem" }}>What you&apos;re paying for</p>
                <ul style={{ fontSize: "0.85rem", color: "var(--text-2)", lineHeight: 1.7, paddingLeft: 16 }}>
                  <li>Temporary execution rights on the encrypted iNFT intelligence</li>
                  <li>Dataset storage on 0G Storage (pinned for 30 days)</li>
                  <li>Planner → Analyzer → Critic → Reporter workflow via Gensyn AXL</li>
                  <li>Structured report with confidence scores and 0G provenance hash</li>
                </ul>
              </div>

              {/* Runtime estimate */}
              <div style={{ display: "flex", gap: 20, marginBottom: 24, flexWrap: "wrap" }}>
                <div style={{ fontSize: "0.85rem", color: "var(--text-2)" }}>
                  ⏱ Est. runtime: <strong style={{ color: "var(--text)" }}>~{Math.round(agent.runtimeEstimateSeconds / 60)} min</strong>
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-2)" }}>
                  📁 Dataset: <strong style={{ color: "var(--text)" }}>{file?.name}</strong>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button className="btn btn-ghost" onClick={() => setStep("validate")}>← Back</button>
                <button
                  className="btn btn-primary"
                  disabled={!file || isSubmittingJob}
                  onClick={handleLocalUploadRun}
                >
                  {isSubmittingJob ? "Starting local workflow..." : "Start Local AXL Run"}
                </button>
                <button className="btn btn-secondary" onClick={() => setStep("confirm")}>Authorize with 0G Wallet →</button>
              </div>
            </div>
          )}

          {/* ── Step: Confirm ── */}
          {step === "confirm" && (
            <div>
              <h2 style={{ fontSize: "1.2rem", marginBottom: 20 }}>Authorize with 0G Wallet</h2>
              <div className="glass" style={{ padding: 20, marginBottom: 20 }}>
                <p className="eyebrow" style={{ marginBottom: 12, fontSize: "0.7rem" }}>0G integration readiness</p>
                <div className="job-detail-list">
                  <ReadinessRow label="0G Chain" ready={zeroGStatus?.chain.configured} missing={zeroGStatus?.chain.missing} />
                  <ReadinessRow label="0G Storage" ready={zeroGStatus?.storage.configured} missing={zeroGStatus?.storage.missing} />
                  <ReadinessRow label="0G Compute" ready={zeroGStatus?.compute.configured} missing={zeroGStatus?.compute.missing} />
                  <ReadinessRow label="Contracts" ready={zeroGStatus?.contracts.configured} missing={zeroGStatus?.contracts.missing} />
                </div>
                {zeroGStatus?.compute.providerAddress && (
                  <p className="font-mono" style={{ color: "var(--text-3)", fontSize: "0.72rem", marginTop: 12, wordBreak: "break-all" }}>
                    Provider: {zeroGStatus.compute.providerAddress}
                  </p>
                )}
              </div>

              {!isConnected ? (
                <div>
                  <div className="callout callout-warn" style={{ marginBottom: 20 }}>
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20" style={{ flexShrink: 0 }}>
                      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    Connect your wallet to authorize this agent run on 0G. This is the real path for payment, usage rights, and provenance.
                  </div>
                  <button className="btn btn-primary btn-lg" onClick={() => connect({ connector: injectedConnector, chainId: ogTestnet.id })}>
                    Connect Wallet
                  </button>
                </div>
              ) : (
                <div>
                  <div className="glass" style={{ padding: 24, marginBottom: 20 }}>
                    <div className="cost-row">
                      <span className="label">Wallet</span>
                      <span className="value font-mono" style={{ fontSize: "0.85rem" }}>{address}</span>
                    </div>
                    <div className="cost-row">
                      <span className="label">Balance</span>
                      <span className="value" style={{ color: hasSufficientBalance ? "var(--teal)" : "#f87171" }}>
                        {balance ? `${Number(formatUnits(balance.value, balance.decimals)).toFixed(4)} ${balance.symbol}` : "—"}
                        {!hasSufficientBalance && " (insufficient)"}
                      </span>
                    </div>
                    <div className="cost-row">
                      <span className="label">You&apos;ll pay</span>
                      <span className="value" style={{ color: "var(--teal)", fontSize: "1.1rem" }}>{totalOG} OG</span>
                    </div>
                    <div className="cost-row">
                      <span className="label">Contract</span>
                      <span className="value font-mono" style={{ fontSize: "0.75rem", color: "var(--text-3)" }}>
                        {contractAddress}
                      </span>
                    </div>
                    <div className="cost-row">
                      <span className="label">iNFT usage fee</span>
                      <span className="value" style={{ color: "var(--teal)", fontSize: "1.05rem" }}>
                        {formatEther(usageFeeValue)} OG
                      </span>
                    </div>
                  </div>

                  <div className="callout callout-info" style={{ marginBottom: 20 }}>
                    This sends a 0G usage authorization to the iNFT contract, then starts the AXL + KeeperHub workflow once the transaction confirms.
                  </div>

                  {error && (
                    <div className="callout callout-error" style={{ marginBottom: 16 }}>
                      {error.message}
                    </div>
                  )}

                  {apiError && (
                    <div className="callout callout-error" style={{ marginBottom: 16 }}>
                      API job creation failed: {apiError}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 12 }}>
                    <button className="btn btn-ghost" onClick={() => setStep("review")}>← Back</button>
                    <button
                      className="btn btn-violet btn-lg"
                      disabled={isPending || isConfirming || isSubmittingJob}
                      onClick={handleAuthorize}
                    >
                      {isSubmittingJob ? "Starting AXL workflow…" : isPending ? "Waiting for wallet…" : isConfirming ? "Confirming on 0G…" : `Authorize with 0G Wallet — ${totalOG} OG`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div style={{ position: "sticky", top: 80 }}>
          <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
            <p className="eyebrow" style={{ marginBottom: 12, fontSize: "0.7rem" }}>Onchain metadata</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <p style={{ fontSize: "0.72rem", color: "var(--text-3)", marginBottom: 4 }}>Token ID</p>
                <p className="font-mono" style={{ fontSize: "0.72rem", color: "var(--teal)" }}>
                  {tokenId}
                </p>
              </div>
              <div>
                <p style={{ fontSize: "0.72rem", color: "var(--text-3)", marginBottom: 4 }}>Contract address</p>
                <p className="font-mono" style={{ fontSize: "0.72rem", color: "var(--teal)", wordBreak: "break-all" }}>
                  {contractAddress}
                </p>
              </div>
              <div>
                <p style={{ fontSize: "0.72rem", color: "var(--text-3)", marginBottom: 4 }}>Intelligence reference</p>
                <p className="font-mono" style={{ fontSize: "0.72rem", color: "var(--teal)", wordBreak: "break-all" }}>
                  {displayIntelligenceRef}
                </p>
              </div>
              <div>
                <p style={{ fontSize: "0.72rem", color: "var(--text-3)", marginBottom: 4 }}>Owner</p>
                <p className="font-mono" style={{ fontSize: "0.72rem", color: "var(--teal)", wordBreak: "break-all" }}>
                  {token.owner.data ? String(token.owner.data) : "Loading..."}
                </p>
              </div>
              <div>
                <p style={{ fontSize: "0.72rem", color: "var(--text-3)", marginBottom: 4 }}>Metadata hash</p>
                <p className="font-mono" style={{ fontSize: "0.72rem", color: "var(--teal)", wordBreak: "break-all" }}>
                  {token.metadataHash.data ? String(token.metadataHash.data) : "Loading..."}
                </p>
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-3)", lineHeight: 1.5 }}>
                The hash is a fingerprint only. Readable metadata now comes from the token URI JSON.
              </div>
              <div>
                <p style={{ fontSize: "0.72rem", color: "var(--text-3)", marginBottom: 4 }}>Token URI</p>
                <p className="font-mono" style={{ fontSize: "0.72rem", color: "var(--teal)", wordBreak: "break-all" }}>
                  {onchainTokenURI || onchainMetadata?.[7] || "Loading..."}
                </p>
              </div>
              <div>
                <p style={{ fontSize: "0.72rem", color: "var(--text-3)", marginBottom: 4 }}>Explorer</p>
                <a
                  href={explorerContractUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-sm"
                  style={{ textAlign: "center", justifyContent: "center" }}
                >
                  View contract on 0G ↗
                </a>
              </div>
            </div>
          </div>

          <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
            <p className="eyebrow" style={{ marginBottom: 12, fontSize: "0.7rem" }}>Agent details</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Price", value: `${displayPrice} OG`, color: "var(--teal)" },
                { label: "Runtime", value: displayRuntime },
                { label: "Formats", value: displayFormats },
                { label: "Creator", value: displayCreator },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                  <span style={{ color: "var(--text-3)" }}>{label}</span>
                  <span style={{ color: color ?? "var(--text)", fontWeight: 500, textAlign: "right", maxWidth: 160 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {(displayIntelligenceRef !== "—" || displayStorageRef !== "—") && (
            <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
              <p className="eyebrow" style={{ marginBottom: 10, fontSize: "0.7rem" }}>0G References</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div>
                  <p style={{ fontSize: "0.72rem", color: "var(--text-3)", marginBottom: 2 }}>Intelligence</p>
                  <p className="font-mono" style={{ fontSize: "0.72rem", color: "var(--teal)", wordBreak: "break-all" }}>
                    {displayIntelligenceRef}
                  </p>
                </div>
                {displayStorageRef !== "—" && (
                  <div>
                    <p style={{ fontSize: "0.72rem", color: "var(--text-3)", marginBottom: 2 }}>Metadata</p>
                    <p className="font-mono" style={{ fontSize: "0.72rem", color: "var(--teal)", wordBreak: "break-all" }}>
                      {displayStorageRef}
                    </p>
                  </div>
                )}
                <a
                  href={explorerContractUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-sm"
                  style={{ marginTop: 8, textAlign: "center", justifyContent: "center" }}
                >
                  View contract on 0G ↗
                </a>
              </div>
            </div>
          )}

          <div className="glass" style={{ padding: 20 }}>
            <p className="eyebrow" style={{ marginBottom: 10, fontSize: "0.7rem" }}>Agent swarm</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {["Planner", "Analyzer", "Critic", "Reporter"].map((m) => (
                <div key={m} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.82rem" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--text-3)" }} />
                  <span style={{ color: "var(--text-2)" }}>{m}</span>
                  <span style={{ marginLeft: "auto", fontSize: "0.7rem", color: "var(--text-3)" }}>via AXL</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
