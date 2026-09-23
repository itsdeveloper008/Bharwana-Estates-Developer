/** Authenticated fetch helper for Admin panel → `/api/admin/*` routes. */
export async function adminApiFetch(
  getIdToken: () => Promise<string | null>,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const token = await getIdToken();
  if (!token) throw new Error("Not signed in.");
  return fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function adminApiJson<T = Record<string, unknown>>(
  getIdToken: () => Promise<string | null>,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await adminApiFetch(getIdToken, path, init);
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}
