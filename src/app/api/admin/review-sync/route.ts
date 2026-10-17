import { reviewInfo, saveReview } from "@/src/server/candidateReview";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try { return Response.json({ sync: await reviewInfo() }); }
  catch { return Response.json({ error: "レビュー環境を確認してください。" }, { status: 409 }); }
}
export async function POST(request: Request) {
  try { return Response.json({ sync: await saveReview(request) }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "PRへの保存に失敗しました。" }, { status: 409 }); }
}
