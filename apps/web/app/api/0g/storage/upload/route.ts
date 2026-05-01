import { NextResponse } from "next/server";
import { bytesToHex, generateAes256Key, uploadServerBytes } from "@kingsvarmo/zero-g";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEFAULT_ZERO_G_RPC_URL = "https://evmrpc-testnet.0g.ai";
const DEFAULT_ZERO_G_STORAGE_ENDPOINT = "https://indexer-storage-testnet-turbo.0g.ai";

export async function POST(request: Request) {
  try {
    const privateKey = process.env.ZERO_G_PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json(
        {
          error: "0G storage uploader is not configured.",
          hint: "Set ZERO_G_PRIVATE_KEY in the web deployment environment.",
        },
        { status: 500 },
      );
    }

    const form = await request.formData();
    const value = form.get("file");
    const label = normalizeLabel(String(form.get("label") ?? "file"));

    if (!(value instanceof File)) {
      return NextResponse.json({ error: "Expected multipart form field named file." }, { status: 400 });
    }

    const encryptionKey = generateAes256Key();
    const bytes = new Uint8Array(await value.arrayBuffer());
    const result = await uploadServerBytes({
      bytes,
      filename: value.name,
      contentType: value.type,
      privateKey,
      network: {
        rpcUrl: process.env.ZERO_G_RPC_URL || DEFAULT_ZERO_G_RPC_URL,
        indexerRpc: process.env.ZERO_G_STORAGE_ENDPOINT || DEFAULT_ZERO_G_STORAGE_ENDPOINT,
      },
      encryption: { type: "aes256", key: encryptionKey },
      resourceLabel: label,
    });
    const key = bytesToHex(encryptionKey);

    return NextResponse.json({
      uri: `0g://${label}/${result.rootHash}?key=${key}`,
      rootHash: result.rootHash,
      txHash: result.txHash,
      encrypted: true,
      label,
      filename: value.name,
      size: value.size,
    });
  } catch (caught) {
    console.error("[POST /api/0g/storage/upload]", caught);
    return NextResponse.json(
      {
        error: caught instanceof Error ? caught.message : "0G storage upload failed.",
      },
      { status: 500 },
    );
  }
}

function normalizeLabel(value: string): string {
  const normalized = value.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-");
  return normalized || "file";
}
