import { ATTEMPTS_FILE, POINTS_FILE, readJsonl, toCsv } from "@/lib/logging";

export const runtime = "nodejs";

/** Faculty export: GET /api/export?type=points (default) or ?type=attempts, as CSV. */
export async function GET(req: Request) {
  const type = new URL(req.url).searchParams.get("type") === "attempts" ? "attempts" : "points";
  const rows = readJsonl(type === "attempts" ? ATTEMPTS_FILE : POINTS_FILE);
  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="markmate-${type}.csv"`,
    },
  });
}
