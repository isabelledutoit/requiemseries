import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getSession, effectiveRole } from "@/lib/auth/roles";
import { env } from "@/lib/env";
import { MAX_IMAGE_BYTES, ALLOWED_IMAGE_TYPES } from "@/lib/blob";

export const runtime = "nodejs";

// Direct browser -> Blob upload token endpoint. Authorization happens in
// onBeforeGenerateToken (server-trusted), never from the client payload.
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      token: env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async (pathname) => {
        const session = await getSession();
        if (!session || effectiveRole(session) !== "admin") {
          throw new Error("Not authorized.");
        }
        if (!pathname.startsWith("portfolio/")) {
          throw new Error("Invalid upload path.");
        }
        return {
          allowedContentTypes: ALLOWED_IMAGE_TYPES,
          addRandomSuffix: true,
          maximumSizeInBytes: MAX_IMAGE_BYTES,
        };
      },
      // Completion webhook doesn't fire on localhost; the client persists the
      // row via a server action after upload() resolves.
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(json);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed." },
      { status: 400 },
    );
  }
}
