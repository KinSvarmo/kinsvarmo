import { NextResponse } from "next/server";
import { getZeroGIntegrationStatus } from "@kingsvarmo/zero-g";

export async function GET() {
  return NextResponse.json({
    zeroG: getZeroGIntegrationStatus(),
  });
}
