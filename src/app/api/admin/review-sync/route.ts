import { reviewInfo, retryReview } from "@/src/server/candidateReview";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try { return Response.json({ sync: await reviewInfo() }); }
  catch { return Response.json({ error: "レビュー環境を確認してください。" }, { status: 409 }); }
}
export async function POST(request: Request) {
  try { return Response.json({ sync: await retryReview(request) }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "再送に失敗しました。" }, { status: 409 }); }
}
