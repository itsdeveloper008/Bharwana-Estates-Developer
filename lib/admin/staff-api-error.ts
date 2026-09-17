import { NextResponse } from "next/server";

/** Temporary: surface Firebase Admin error detail to the browser for diagnosis. */
export const EXPOSE_STAFF_API_ERROR_DETAILS = true;

export type SerializedAdminError = {
  message: string;
  code: string;
  name: string;
  stack?: string;
};

/** Full serializable snapshot for server logs (never put stack/key material in client responses by default). */
export function serializeAdminError(error: unknown): SerializedAdminError {
  if (error instanceof Error) {
    const code =
      "code" in error && typeof (error as { code?: unknown }).code === "string"
        ? String((error as { code: string }).code)
        : "";
    return {
      message: error.message || "Unknown error",
      code,
      name: error.name || "Error",
      stack: error.stack,
    };
  }
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    return {
      message: typeof record.message === "string" ? record.message : JSON.stringify(error),
      code: typeof record.code === "string" ? record.code : "",
      name: typeof record.name === "string" ? record.name : "object",
    };
  }
  return { message: String(error), code: "", name: typeof error };
}

export function logStaffApiError(route: string, error: unknown) {
  const serialized = serializeAdminError(error);
  console.error(`[${route}]`, error);
  console.error(`[${route}] serialized`, serialized);
  if (error && typeof error === "object") {
    try {
      console.error(`[${route}] keys`, Object.getOwnPropertyNames(error));
    } catch {
      /* ignore */
    }
  }
}

export function staffApiErrorResponse(
  route: string,
  error: unknown,
  status = 500,
  fallback = "Request failed.",
) {
  logStaffApiError(route, error);
  const serialized = serializeAdminError(error);

  if (serialized.code === "auth/email-already-exists") {
    return NextResponse.json({ error: "That email already has an account." }, { status: 409 });
  }
  if (serialized.code === "auth/invalid-password") {
    return NextResponse.json(
      { error: "Password does not meet Firebase requirements." },
      { status: 400 },
    );
  }
  if (serialized.code === "auth/invalid-email") {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  if (EXPOSE_STAFF_API_ERROR_DETAILS) {
    const detail = serialized.code
      ? `${serialized.code}: ${serialized.message}`
      : serialized.message;
    return NextResponse.json(
      {
        error: detail || fallback,
        code: serialized.code || undefined,
        detail,
      },
      { status },
    );
  }

  return NextResponse.json(
    {
      error: fallback,
      ...(serialized.code ? { code: serialized.code } : {}),
    },
    { status },
  );
}
