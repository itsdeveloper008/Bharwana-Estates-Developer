import { randomUUID } from "node:crypto";
import { getStorage } from "firebase-admin/storage";
import { NextResponse } from "next/server";
import { requireAdminModule } from "@/lib/admin/require-super-admin";
import { getFirebaseAdminApp, readAdminProjectId } from "@/lib/firebase/admin";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;

function storageBucketName(): string {
  return (
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() ||
    `${readAdminProjectId()}.firebasestorage.app`
  );
}

export async function POST(request: Request) {
  try {
    const authz = await requireAdminModule(request, "team");
    if (!authz.ok) {
      return NextResponse.json({ error: authz.error }, { status: authz.status });
    }

    const form = await request.formData();
    const memberId = String(form.get("memberId") ?? "").trim();
    const file = form.get("file");

    if (!memberId || memberId.length > 128 || !/^[\w.-]+$/.test(memberId)) {
      return NextResponse.json({ error: "Invalid team member id." }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Photo file is required." }, { status: 400 });
    }
    if (file.size <= 0 || file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Photo must be under 10MB." }, { status: 400 });
    }

    const contentType = file.type || "image/webp";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const token = randomUUID();
    const objectPath = `team/${memberId}-${Date.now()}.webp`;
    const bucket = getStorage(getFirebaseAdminApp()).bucket(storageBucketName());
    const object = bucket.file(objectPath);

    await object.save(buffer, {
      resumable: false,
      metadata: {
        contentType: contentType.startsWith("image/") ? contentType : "image/webp",
        metadata: {
          firebaseStorageDownloadTokens: token,
          uploadedBy: authz.caller.uid,
        },
      },
    });

    const encoded = encodeURIComponent(objectPath);
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encoded}?alt=media&token=${token}`;
    return NextResponse.json({ url, path: objectPath });
  } catch (error) {
    console.error("[api/admin/team/photo]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not upload team photo.",
      },
      { status: 500 },
    );
  }
}
