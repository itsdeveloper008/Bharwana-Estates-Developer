import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

/**
 * On-demand ISR for public SEO pages after publish/edit/unpublish.
 * Call with `Authorization: Bearer $REVALIDATE_SECRET` and optional JSON `{ "paths": ["/"] }`.
 */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "REVALIDATE_SECRET not configured" }, { status: 503 });
  }
  const auth = request.headers.get("authorization") || "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let paths: string[] = ["/", "/properties", "/sitemap.xml"];
  try {
    const body = (await request.json()) as { paths?: string[] };
    if (Array.isArray(body.paths) && body.paths.length > 0) {
      paths = body.paths.filter((p) => typeof p === "string" && p.startsWith("/"));
    }
  } catch {
    // empty body → default paths
  }

  for (const path of paths) {
    revalidatePath(path);
  }
  revalidatePath("/sitemap.xml");
  return NextResponse.json({ ok: true, revalidated: paths });
}
