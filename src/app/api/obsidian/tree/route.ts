import { buildTree } from "@/lib/parsers/obsidian-parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await buildTree());
  } catch {
    return Response.json({
      vaultPath: "",
      tree: [],
      totalFiles: 0,
      totalFolders: 0,
      tags: [],
      recentNotes: [],
    });
  }
}
