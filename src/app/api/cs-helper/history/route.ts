import { getCsHistory } from "@/lib/cs-helper/cs-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(getCsHistory());
}
