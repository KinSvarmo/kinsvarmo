import { NextResponse } from "next/server";
import { listInferenceProviders } from "@kingsvarmo/zero-g";

export async function GET() {
  try {
    const providers = await listInferenceProviders();
    return NextResponse.json({ providers });
  } catch (err: unknown) {
    console.error("[GET /api/0g/providers]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
