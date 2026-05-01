import { NextResponse } from "next/server";
import { downloadBrowserFile } from "@kingsvarmo/zero-g";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEFAULT_ZERO_G_RPC_URL = "https://evmrpc-testnet.0g.ai";
const DEFAULT_ZERO_G_STORAGE_ENDPOINT = "https://indexer-storage-testnet-turbo.0g.ai";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const uri = url.searchParams.get("uri");
    const parsed = uri ? parse0GUri(uri) : null;

    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid 0G URI. Expected 0g://label/0x... optionally with ?key=0x..." },
        { status: 400 },
      );
    }

    const result = await downloadBrowserFile(
      parsed.rootHash,
      {
        rpcUrl: process.env.ZERO_G_RPC_URL || DEFAULT_ZERO_G_RPC_URL,
        indexerRpc: process.env.ZERO_G_STORAGE_ENDPOINT || DEFAULT_ZERO_G_STORAGE_ENDPOINT,
      },
      undefined,
      parsed.symmetricKey ? { symmetricKey: parsed.symmetricKey } : undefined,
    );
    const text = await result.blob.text();

    return NextResponse.json({
      text,
      rootHash: parsed.rootHash,
      filename: result.filename,
      size: result.size,
    });
  } catch (caught) {
    console.error("[GET /api/0g/storage/download]", caught);
    return NextResponse.json(
      {
        error: caught instanceof Error ? caught.message : "0G storage download failed.",
      },
      { status: 500 },
    );
  }
}

function parse0GUri(uri: string): { rootHash: string; symmetricKey?: string } | null {
  const match = uri.match(/^0g:\/\/[^/]+\/(0x[0-9a-fA-F]{64})(?:\?key=(0x[0-9a-fA-F]+))?$/);
  if (!match) {
    return null;
  }

  return match[2]
    ? { rootHash: match[1]!, symmetricKey: match[2] }
    : { rootHash: match[1]! };
}
