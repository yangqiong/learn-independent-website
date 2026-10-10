import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { syncAllCJ } from "@/lib/fulfillment";

// 定时调用（如每小时）：curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/cj-sync
export async function GET(req: Request) {
  if (!config.cronSecret || req.headers.get("authorization") !== `Bearer ${config.cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ results: await syncAllCJ() });
}
