import { NextResponse } from "next/server";
import { depositFunds, topUpDeposit, transferFundsToProvider, getLedgerInfo } from "@kingsvarmo/zero-g";

/**
 * POST /api/0g/account
 * Body: { action: "create" | "deposit" | "transfer", amount?: number, providerAddress?: string, amountNeuron?: string }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, amount, providerAddress, amountNeuron } = body;

    switch (action) {
      case "create":
        await depositFunds(amount ?? 3);
        return NextResponse.json({ ok: true, message: `Ledger created with ${amount ?? 3} OG` });

      case "deposit":
        await topUpDeposit(amount ?? 1);
        return NextResponse.json({ ok: true, message: `Deposited ${amount ?? 1} OG` });

      case "transfer":
        if (!providerAddress) {
          return NextResponse.json({ error: "providerAddress required" }, { status: 400 });
        }
        await transferFundsToProvider(providerAddress, BigInt(amountNeuron ?? "1000000000000000000"));
        return NextResponse.json({ ok: true, message: `Transferred to ${providerAddress}` });

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err: unknown) {
    console.error("[POST /api/0g/account]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const ledger = await getLedgerInfo();
    return NextResponse.json({ ledger: JSON.parse(JSON.stringify(ledger, (_, v) => typeof v === 'bigint' ? v.toString() : v)) });
  } catch (err: unknown) {
    console.error("[GET /api/0g/account]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
