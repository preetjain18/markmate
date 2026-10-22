import { ATTEMPTS_FILE, POINTS_FILE, readJsonl, toCsv } from "@/lib/logging";

export const runtime = "nodejs";

/**
 * Faculty export: GET /api/export?type=points (default) or ?type=attempts, as CSV.
 * The attempts file contains students' answer text, so this is not public:
 * - in local development it is open;
 * - in production it needs EXPORT_TOKEN to be set, and the request must send it
 *   (header `x-export-token`, or `?token=`). Without that it answers 404.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (process.env.NODE_ENV === "production") {
    const expected = process.env.EXPORT_TOKEN?.trim();
    const given = req.headers.get("x-export-token") ?? url.searchParams.get("token");
    if (!expected || given !== expected) return new Response("Not found", { status: 404 });
  }
  const type = url.searchParams.get("type") === "attempts" ? "attempts" : "points";
  const rows = readJsonl(type === "attempts" ? ATTEMPTS_FILE : POINTS_FILE);
  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="markmate-${type}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
