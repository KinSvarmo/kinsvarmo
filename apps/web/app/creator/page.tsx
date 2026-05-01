"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount, useConnect } from "wagmi";
import { keccak256, toBytes } from "viem";
import { useMintINFT } from "@/hooks/useINFTRegistry";
import { use0GStorage } from "@/hooks/use0GStorage";
import { fetchJson } from "@/lib/api";
import { injectedConnector } from "@/lib/wagmi";
import type { AgentListing } from "@kingsvarmo/shared";

type Step = "basics" | "config" | "compute" | "dataset" | "review";
const STEP_ORDER: Step[] = ["basics", "config", "compute", "dataset", "review"];
const STEP_LABELS: Record<Step, string> = {
  basics: "Agent Info",
  config: "Pricing & Config",
  compute: "0G Compute",
  dataset: "Upload Intelligence",
  review: "Review & Mint",
};

function StepBar({ current }: { current: Step }) {
  const idx = STEP_ORDER.indexOf(current);
  return (
    <div className="stepper">
      {STEP_ORDER.map((s, i) => (
        <div key={s} style={{ display: "flex", alignItems: "center", flex: i < STEP_ORDER.length - 1 ? 1 : undefined }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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

const DOMAINS = ["Phytochemistry", "Genomics", "Materials Science", "Environmental Chemistry", "Medical Imaging", "Other"];
const FORMATS = ["csv", "json", "tsv", "txt", "fasta", "h5"];
const ACCEPTED_DATASET_EXTENSIONS = [".jsonl"];

function isJsonlFile(file: File): boolean {
  return ACCEPTED_DATASET_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));
}

export default function CreatorPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { mint, isPending: isMintPending, isConfirming, isSuccess, txHash, error: mintError } = useMintINFT();
  const { uploadFile, isUploading, uploadError } = use0GStorage();

  const [step, setStep] = useState<Step>("basics");
  const [datasetFile, setDatasetFile] = useState<File | null>(null);
  const [dragover, setDragover] = useState(false);
  const [datasetURI, setDatasetURI] = useState<string>("");
  const [metadataURI, setMetadataURI] = useState<string>("");
  const [isStoreFlowRunning, setIsStoreFlowRunning] = useState(false);
  const [isMintFlowRunning, setIsMintFlowRunning] = useState(false);
  const [isLocalPublishing, setIsLocalPublishing] = useState(false);
  const [localPublishError, setLocalPublishError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Form state
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    domain: "",
    creatorName: "",
    formats: [] as string[],
    priceIn0G: "0.25",
    runtimeSeconds: "90",
    previewOutput: "",
    // 0G Compute fields
    computeMode: "inference" as "inference" | "fine-tuned-lora",
    providerAddress: "",
    baseModel: "Qwen2.5-0.5B-Instruct",
    promptTemplate: "You are an expert scientific data analyzer. Summarize the provided data.",
  });

  const [providers, setProviders] = useState<any[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);

  const fetchProviders = async () => {
    setIsLoadingProviders(true);
    try {
      const res = await fetch("/api/0g/providers");
      const data = await res.json();
      if (data.providers) {
        setProviders(data.providers);
      }
    } catch (err) {
      console.error("Failed to fetch providers", err);
    } finally {
      setIsLoadingProviders(false);
    }
  };

  useEffect(() => {
    void fetchProviders();
  }, []);

  useEffect(() => {
    if (form.providerAddress || providers.length === 0) {
      return;
    }

    const provider = providers.find((candidate) => candidate.provider && !candidate.provider.endsWith("0000000000000000000000000000000000000000"));

    if (provider?.provider) {
      setForm((prev) => ({
        ...prev,
        providerAddress: provider.provider,
        baseModel: provider.model || prev.baseModel
      }));
    }
  }, [form.providerAddress, providers]);

  const set = (key: keyof typeof form, val: string | string[]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const toggleFormat = (f: string) =>
    set("formats", form.formats.includes(f) ? form.formats.filter((x) => x !== f) : [...form.formats, f]);

  const handleDatasetFile = (f: File) => {
    if (!isJsonlFile(f)) {
      return;
    }
    setDatasetFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragover(false);
    const f = e.dataTransfer.files[0];
    if (f) handleDatasetFile(f);
  };

  // Derive a deterministic metadata hash from form data
  const metadataHash = keccak256(
    toBytes(JSON.stringify({ name: form.name, domain: form.domain, description: form.description }))
  );

  const intelligenceReference = datasetURI
    ? `0g://intelligence/${metadataHash.slice(2, 18)}`
    : "";

  const buildMetadataPayload = (storageReference: string) =>
    JSON.stringify(
      {
        name: form.name,
        description: form.description,
        domain: form.domain,
        creatorName: form.creatorName,
        previewOutput: form.previewOutput,
        intelligenceReference,
        storageReference,
        datasetURI: storageReference,
        metadataHash,
        formats: form.formats,
        priceIn0G: form.priceIn0G,
        runtimeSeconds: form.runtimeSeconds,
        computeMode: form.computeMode,
        providerAddress: form.providerAddress,
        baseModel: form.baseModel,
        promptTemplate: form.promptTemplate,
      },
      null,
      2,
    );

  const canProceed: Record<Step, boolean> = {
    basics: Boolean(form.name && form.description && form.domain && form.creatorName),
    config: form.formats.length > 0 && Boolean(form.priceIn0G),
    compute: Boolean(form.providerAddress && form.baseModel),
    dataset: Boolean(datasetFile),
    review: isConnected,
  };

  const goBack = () => {
    const previous = STEP_ORDER[STEP_ORDER.indexOf(step) - 1];
    if (previous) setStep(previous);
  };

  const goForward = () => {
    const next = STEP_ORDER[STEP_ORDER.indexOf(step) + 1];
    if (next) setStep(next);
  };

  const handleUpload = async () => {
    if (isStoreFlowRunning || isUploading || isMintPending || isConfirming) return;
    if (!isConnected) { connect({ connector: injectedConnector, chainId: 16602 }); return; }
    if (!datasetFile) return;

    setIsStoreFlowRunning(true);
    try {
      const storageUri = await uploadFile(datasetFile, "intelligence");
      if (!storageUri) return;
      setDatasetURI(storageUri);

      const metadataFile = new File(
        [buildMetadataPayload(storageUri)],
        `${form.slug || form.name || "agent"}.metadata.json`,
        { type: "application/json" },
      );
      const uploadedMetadataURI = await uploadFile(metadataFile, "metadata");
      if (uploadedMetadataURI) {
        setMetadataURI(uploadedMetadataURI);
      }

      setStep("review");
    } finally {
      setIsStoreFlowRunning(false);
    }
  };

  const handleMint = async () => {
    if (isMintFlowRunning || isUploading || isMintPending || isConfirming) return;
    if (!isConnected) { connect({ connector: injectedConnector, chainId: 16602 }); return; }
    if (!datasetURI) return;

    setIsMintFlowRunning(true);
    try {
      await mint(address!, datasetURI, metadataHash, {
        name: form.name,
        description: form.description,
        domain: form.domain,
        creatorName: form.creatorName,
        previewOutput: form.previewOutput,
        intelligenceReference,
        storageReference: datasetURI,
        metadataURI,
      });
    } finally {
      setIsMintFlowRunning(false);
    }
  };

  const handleLocalPublish = async () => {
    if (isLocalPublishing || !canProceed.basics || !canProceed.config) {
      return;
    }

    setLocalPublishError(null);
    setIsLocalPublishing(true);

    try {
      const supportedFormats = form.formats.filter((format): format is "csv" | "json" =>
        format === "csv" || format === "json"
      );
      const response = await fetchJson<{ agent: AgentListing }>("/api/agents", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          creatorName: form.creatorName,
          creatorWallet: address ?? "local-demo-creator",
          description: form.description,
          longDescription: form.description,
          domain: form.domain,
          supportedFormats: supportedFormats.length > 0 ? supportedFormats : ["csv"],
          priceIn0G: form.priceIn0G,
          runtimeEstimateSeconds: Number(form.runtimeSeconds) || 90,
          previewOutput:
            form.previewOutput || "Deterministic local report with confidence and provenance.",
          expectedOutput: "A deterministic report with confidence, key findings, and structured JSON.",
          promptTemplate: form.promptTemplate,
          privacyNotes: "Local demo listing. Jobs are scoped to the running API process."
        })
      });

      router.push(`/agents/${response.agent.slug}`);
    } catch (caught) {
      setLocalPublishError(caught instanceof Error ? caught.message : "Could not publish the local agent");
    } finally {
      setIsLocalPublishing(false);
    }
  };

  const isPending = isStoreFlowRunning || isMintFlowRunning || isUploading || isMintPending || isLocalPublishing;

  if (isSuccess && txHash) {
    return (
      <div className="container" style={{ paddingTop: 80, paddingBottom: 80, maxWidth: 640, margin: "0 auto" }}>
        <div className="glass-lg" style={{ padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: 16 }}>🎉</div>
          <h1 style={{ fontSize: "1.8rem", marginBottom: 12 }}>iNFT Minted!</h1>
          <p style={{ color: "var(--text-2)", marginBottom: 24, lineHeight: 1.6 }}>
            Your scientific agent <strong>{form.name}</strong> has been published as an iNFT on 0G.
            Researchers can now discover and run your agent.
          </p>
          <div className="tx-panel" style={{ marginBottom: 24, textAlign: "left" }}>
            <div style={{ marginBottom: 6 }}>
              <span style={{ color: "var(--text-3)" }}>Tx hash: </span>
              <a href={`https://chainscan-galileo.0g.ai/tx/${txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--teal)" }}>
                {txHash.slice(0, 20)}…
              </a>
            </div>
            <div><span style={{ color: "var(--text-3)" }}>Intelligence ref: </span>{datasetURI}</div>
            <div><span style={{ color: "var(--text-3)" }}>Intelligence ref: </span>{intelligenceReference || "Generated after upload"}</div>
            {metadataURI && <div><span style={{ color: "var(--text-3)" }}>Metadata URI: </span>{metadataURI}</div>}
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Link href="/agents" className="btn btn-primary">View in Marketplace</Link>
            <Link href="/creator" className="btn btn-secondary">Mint Another</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <p className="eyebrow" style={{ marginBottom: 8 }}>Creator Studio</p>
        <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", marginBottom: 12 }}>
          Mint your scientific iNFT
        </h1>
        <p style={{ color: "var(--text-2)", maxWidth: 560, lineHeight: 1.6 }}>
          Publish your analysis workflow as a private ERC-7857 iNFT on 0G. Your intelligence stays encrypted —
          users pay to run it, you earn per execution.
        </p>
      </div>

      {/* Stepper */}
      <div style={{ marginBottom: 40 }}>
        <StepBar current={step} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 32, alignItems: "start" }}>

        {/* ── Main form ── */}
        <div>

          {/* Step 1: Basics */}
          {step === "basics" && (
            <div className="glass-lg" style={{ padding: 32 }}>
              <h2 style={{ fontSize: "1.1rem", marginBottom: 24 }}>Agent Information</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div className="field">
                  <label className="label">Agent Name *</label>
                  <input
                    className="input"
                    placeholder="e.g. Alkaloid Predictor v2"
                    value={form.name}
                    onChange={(e) => {
                      set("name", e.target.value);
                      set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
                    }}
                  />
                </div>

                <div className="field">
                  <label className="label">Slug</label>
                  <input className="input" value={form.slug} readOnly style={{ color: "var(--text-3)" }} />
                  <span className="input-hint">Auto-generated from name</span>
                </div>

                <div className="field">
                  <label className="label">Creator Name *</label>
                  <input
                    className="input"
                    placeholder="e.g. Dr. Mira Solenne"
                    value={form.creatorName}
                    onChange={(e) => set("creatorName", e.target.value)}
                  />
                </div>

                <div className="field">
                  <label className="label">Scientific Domain *</label>
                  <select
                    className="select"
                    value={form.domain}
                    onChange={(e) => set("domain", e.target.value)}
                  >
                    <option value="">Select domain…</option>
                    {DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div className="field">
                  <label className="label">Description *</label>
                  <textarea
                    className="textarea"
                    placeholder="Describe what your agent does, what datasets it accepts, and what insights it produces…"
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="field">
                  <label className="label">Expected report</label>
                  <input
                    className="input"
                    placeholder="e.g. Predicted alkaloid-like compound families with confidence notes."
                    value={form.previewOutput}
                    onChange={(e) => set("previewOutput", e.target.value)}
                  />
                  <span className="input-hint">A short description of the report users should expect after a run.</span>
                </div>

                <div className="callout callout-info">
                  Intelligence reference is auto-generated from the uploaded intelligence package after you store it on 0G.
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Pricing & Config */}
          {step === "config" && (
            <div className="glass-lg" style={{ padding: 32 }}>
              <h2 style={{ fontSize: "1.1rem", marginBottom: 24 }}>Pricing & Configuration</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div className="field">
                  <label className="label">Price per run (OG) *</label>
                  <input
                    className="input"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.priceIn0G}
                    onChange={(e) => set("priceIn0G", e.target.value)}
                  />
                  <span className="input-hint">
                    You receive ~{(parseFloat(form.priceIn0G || "0") * 0.9).toFixed(3)} OG after platform fee (10%)
                  </span>
                </div>

                <div className="field">
                  <label className="label">Estimated runtime (seconds)</label>
                  <input
                    className="input"
                    type="number"
                    min="10"
                    value={form.runtimeSeconds}
                    onChange={(e) => set("runtimeSeconds", e.target.value)}
                  />
                </div>

                <div className="field">
                  <label className="label">Supported input formats *</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                    {FORMATS.map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => toggleFormat(f)}
                        className={`badge ${form.formats.includes(f) ? "badge-teal" : "badge-muted"}`}
                        style={{ cursor: "pointer", padding: "6px 14px", fontSize: "0.82rem", border: "none" }}
                      >
                        .{f}
                      </button>
                    ))}
                  </div>
                  {form.formats.length === 0 && (
                    <span className="input-error">Select at least one format</span>
                  )}
                </div>

                <div className="glass" style={{ padding: 20, background: "var(--bg-raised)" }}>
                  <p className="eyebrow" style={{ marginBottom: 12, fontSize: "0.7rem" }}>Revenue estimate</p>
                  {[5, 20, 100].map((runs) => (
                    <div className="cost-row" key={runs} style={{ fontSize: "0.85rem" }}>
                      <span className="label">{runs} runs / month</span>
                      <span className="value" style={{ color: "var(--teal)" }}>
                        {(parseFloat(form.priceIn0G || "0") * runs * 0.9).toFixed(2)} OG
                      </span>
                    </div>
                  ))}
                </div>

                <div className="glass" style={{ padding: 20, background: "var(--bg-raised)" }}>
                  <p className="eyebrow" style={{ marginBottom: 10, fontSize: "0.7rem" }}>Local demo publish</p>
                  <p style={{ color: "var(--text-2)", fontSize: "0.84rem", lineHeight: 1.6, marginBottom: 14 }}>
                    Publish this agent to the in-memory API marketplace now. It will be executable through the same AXL + KeeperHub workflow as the seeded agents.
                  </p>
                  {localPublishError && (
                    <div className="callout callout-error" style={{ marginBottom: 12 }}>
                      {localPublishError}
                    </div>
                  )}
                  <button
                    className="btn btn-primary"
                    disabled={!canProceed.basics || !canProceed.config || isLocalPublishing}
                    onClick={handleLocalPublish}
                  >
                    {isLocalPublishing ? "Publishing..." : "Publish Local Agent"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step: Compute */}
          {step === "compute" && (
            <div className="glass-lg" style={{ padding: 32 }}>
              <h2 style={{ fontSize: "1.1rem", marginBottom: 24 }}>0G Compute Integration</h2>
              <p style={{ color: "var(--text-2)", marginBottom: 20, fontSize: "0.9rem" }}>
                Select an inference provider from the 0G network and configure your base model and prompt.
              </p>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div className="field">
                  <label className="label">Compute Mode</label>
                  <select
                    className="select"
                    value={form.computeMode}
                    onChange={(e) => set("computeMode", e.target.value as "inference" | "fine-tuned-lora")}
                  >
                    <option value="inference">Inference (Fastest)</option>
                    <option value="fine-tuned-lora" disabled>Fine-tuned LoRA (Coming Soon)</option>
                  </select>
                </div>

                <div className="field">
                  <label className="label">
                    Provider Address *
                    {providers.length === 0 && (
                      <button 
                        className="btn btn-ghost btn-sm" 
                        onClick={fetchProviders} 
                        disabled={isLoadingProviders}
                        style={{ marginLeft: 12, padding: "2px 8px", fontSize: "0.75rem" }}
                      >
                        {isLoadingProviders ? "Fetching..." : "Fetch live providers"}
                      </button>
                    )}
                  </label>
                  
                  {providers.length > 0 ? (
                    <select
                      className="select"
                      value={form.providerAddress}
                      onChange={(e) => set("providerAddress", e.target.value)}
                    >
                      <option value="">Select a provider...</option>
                      {providers.map((p) => (
                        <option key={p.provider} value={p.provider}>
                          {p.name || p.provider.slice(0, 10) + "..."} — {p.model}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="input"
                      placeholder="e.g. 0x..."
                      value={form.providerAddress}
                      onChange={(e) => set("providerAddress", e.target.value)}
                    />
                  )}
                  <span className="input-hint">The 0G compute provider that will run this agent</span>
                </div>

                <div className="field">
                  <label className="label">Base Model *</label>
                  <input
                    className="input"
                    placeholder="e.g. Qwen2.5-0.5B-Instruct"
                    value={form.baseModel}
                    onChange={(e) => set("baseModel", e.target.value)}
                  />
                </div>

                <div className="field">
                  <label className="label">System Prompt Template *</label>
                  <textarea
                    className="textarea"
                    placeholder="You are a scientific data analyzer..."
                    value={form.promptTemplate}
                    onChange={(e) => set("promptTemplate", e.target.value)}
                    rows={4}
                  />
                  <span className="input-hint">This prompt will be combined with the user's input data at runtime</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Upload Intelligence */}
          {step === "dataset" && (
            <div className="glass-lg" style={{ padding: 32 }}>
              <h2 style={{ fontSize: "1.1rem", marginBottom: 8 }}>Upload Agent Intelligence</h2>
              <p style={{ color: "var(--text-2)", fontSize: "0.88rem", marginBottom: 24, lineHeight: 1.6 }}>
                Your intelligence data will be <strong style={{ color: "var(--teal)" }}>encrypted using AES-256-GCM</strong> before
                being stored on 0G Storage. Only authorized executions via the iNFT contract can access it.
                Users never see your raw intelligence data.
              </p>

              <div
                className={`upload-zone ${dragover ? "dragover" : ""} ${datasetFile ? "has-file" : ""}`}
                onClick={() => fileInput.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
                onDragLeave={() => setDragover(false)}
                onDrop={handleDrop}
              >
                <div className="upload-icon">
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                {datasetFile ? (
                  <>
                    <p style={{ fontWeight: 600, color: "var(--teal)", marginBottom: 4 }}>✓ {datasetFile.name}</p>
                    <p style={{ fontSize: "0.82rem", color: "var(--text-3)" }}>
                      {(datasetFile.size / 1024).toFixed(1)} KB — click to replace
                    </p>
                  </>
                ) : (
                  <>
                    <p style={{ fontWeight: 600, marginBottom: 6 }}>Drop your intelligence data here</p>
                    <p style={{ fontSize: "0.82rem", color: "var(--text-3)" }}>
                      .jsonl only
                    </p>
                  </>
                )}
                <input
                  ref={fileInput}
                  type="file"
                  accept=".jsonl"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleDatasetFile(f);
                  }}
                />
              </div>

              <div className="callout callout-success" style={{ marginTop: 20 }}>
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20" style={{ flexShrink: 0, marginTop: 1 }}>
                  <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                </svg>
                <span>Your IP is protected. The intelligence data is encrypted client-side before upload. The decryption key is sealed to the iNFT and only accessible during authorized TEE execution.</span>
              </div>

              <div className="callout callout-info" style={{ marginTop: 16 }}>
                First store the intelligence on 0G Storage. After that succeeds, we’ll move to the mint step.
              </div>

              <div style={{ marginTop: 20, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button
                  className="btn btn-violet btn-lg"
                  disabled={!datasetFile || isUploading || isPending || isConfirming}
                  onClick={handleUpload}
                >
                  {isStoreFlowRunning || isUploading ? "Uploading intelligence to 0G Storage…" : "Store Intelligence on 0G"}
                </button>
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={() => setStep("review")}
                  disabled={!datasetURI}
                >
                  Go to mint step
                </button>
              </div>

              <div className="glass" style={{ padding: 16, marginTop: 16 }}>
                <p className="eyebrow" style={{ marginBottom: 10, fontSize: "0.7rem" }}>Storage flow</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.82rem", color: "var(--text-2)", flexWrap: "wrap" }}>
                  {["Your intelligence", "AES-256 encrypt", "0G Storage", "URI in iNFT"].map((step, i, arr) => (
                    <Fragment key={step}>
                      <span style={{ padding: "4px 10px", borderRadius: "var(--radius-sm)", background: "var(--surface)" }}>{step}</span>
                      {i < arr.length - 1 && <span style={{ color: "var(--teal)" }}>→</span>}
                    </Fragment>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review & Mint */}
          {step === "review" && (
            <div className="glass-lg" style={{ padding: 32 }}>
              <h2 style={{ fontSize: "1.1rem", marginBottom: 24 }}>Review & Mint iNFT</h2>

              {/* Summary */}
              <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 24 }}>
                  {[
                  { label: "Name", value: form.name },
                  { label: "Domain", value: form.domain },
                  { label: "Creator", value: form.creatorName },
                  { label: "Price", value: `${form.priceIn0G} OG / run`, color: "var(--teal)" },
                  { label: "Formats", value: form.formats.map((f) => `.${f}`).join(", ") },
                  { label: "Intelligence", value: datasetFile?.name ?? "—" },
                  { label: "Runtime", value: `~${Math.round(parseInt(form.runtimeSeconds) / 60)} min` },
                  { label: "Provider", value: form.providerAddress.slice(0, 16) + "..." },
                  { label: "Model", value: form.baseModel },
                ].map(({ label, value, color }) => (
                  <div className="cost-row" key={label} style={{ fontSize: "0.88rem" }}>
                    <span className="label">{label}</span>
                    <span style={{ color: color ?? "var(--text)", fontWeight: 500, maxWidth: 260, textAlign: "right" }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Metadata hash preview */}
              <div className="tx-panel" style={{ marginBottom: 20 }}>
                <div style={{ marginBottom: 4 }}><span style={{ color: "var(--text-3)" }}>Metadata hash (keccak256): </span>{metadataHash}</div>
                <div><span style={{ color: "var(--text-3)" }}>Intelligence URI: </span>{datasetURI || "Will be generated upon upload"}</div>
                <div><span style={{ color: "var(--text-3)" }}>Intelligence ref: </span>{intelligenceReference || "Will be generated upon upload"}</div>
                <div><span style={{ color: "var(--text-3)" }}>Metadata URI: </span>{metadataURI || "Will be generated upon upload"}</div>
              </div>

              <div className="callout callout-info" style={{ marginBottom: 20 }}>
                Your intelligence is already stored on 0G Storage. Minting will only record the encrypted URI on-chain.
              </div>

              {(mintError || uploadError) && (
                <div className="callout callout-error" style={{ marginBottom: 16 }}>{mintError?.message || uploadError}</div>
              )}

              {!isConnected ? (
                <div>
                  <div className="callout callout-warn" style={{ marginBottom: 16 }}>
                    Connect your wallet to mint this iNFT on 0G.
                  </div>
                  <button className="btn btn-primary btn-lg" onClick={() => connect({ connector: injectedConnector, chainId: 16602 })}>
                    Connect Wallet
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-3)", marginBottom: 16 }}>
                    Minting as: <span style={{ color: "var(--text)", fontFamily: "monospace" }}>{address}</span>
                  </div>
                  {!datasetURI && (
                    <div className="callout callout-warn" style={{ marginBottom: 16 }}>
                      Store the intelligence first before minting.
                    </div>
                  )}
                  <button
                    className="btn btn-violet btn-lg"
                  disabled={!datasetURI || !metadataURI || isPending || isConfirming}
                  onClick={handleMint}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  {isMintFlowRunning || isMintPending ? "Waiting for wallet…" : isConfirming ? "Confirming on 0G…" : "Mint iNFT →"}
                </button>
                </div>
              )}
            </div>
          )}

          {/* Nav buttons */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
            <button
              className="btn btn-ghost"
              disabled={step === "basics"}
              onClick={goBack}
            >
              ← Back
            </button>
            {step !== "review" && (
              <button
                className="btn btn-primary"
                disabled={!canProceed[step]}
                onClick={goForward}
              >
                Continue →
              </button>
            )}
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div style={{ position: "sticky", top: 80 }}>
          <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
            <p className="eyebrow" style={{ marginBottom: 14, fontSize: "0.7rem" }}>What gets minted</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { icon: "🔐", title: "Encrypted intelligence", desc: "Your intelligence data on 0G Storage" },
                { icon: "📜", title: "ERC-7857 iNFT", desc: "Ownership token on 0G Chain" },
                { icon: "💰", title: "Revenue logic", desc: "Pay-per-run in OG token" },
                { icon: "🛡️", title: "Access control", desc: "TEE-gated execution rights" },
              ].map(({ icon, title, desc }) => (
                <div key={title} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ fontSize: "1.1rem", marginTop: 1 }}>{icon}</span>
                  <div>
                    <p style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: 2 }}>{title}</p>
                    <p style={{ fontSize: "0.78rem", color: "var(--text-3)" }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="callout callout-info" style={{ fontSize: "0.8rem", lineHeight: 1.6 }}>
            <span>
              <strong>Testnet only.</strong> This mints on 0G Galileo testnet (chainId 16602).
              Mainnet deployment will follow after audit.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
