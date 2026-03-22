export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const token = process.env.TERMINAL_WS_TOKEN ?? "";

  return Response.json(
    {
      enabled: Boolean(token),
      token: token || null,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
