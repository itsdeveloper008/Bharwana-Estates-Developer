/**
 * Public contact form → POST /api/contact (rate-limited Admin SDK write + staff email).
 * Kept out of `@/lib/firestore/*` so the contact page does not pull in the Firebase SDK.
 */
export async function createContactMessage(input: {
  name?: string;
  email: string;
  message?: string;
  phone?: string;
  propertyId?: string;
}): Promise<void> {
  const response = await fetch("/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: input.name?.trim().slice(0, 120) || undefined,
      email: input.email.trim().slice(0, 254),
      message: input.message?.trim().slice(0, 2000) || undefined,
      phone: input.phone?.trim().slice(0, 20) || undefined,
      propertyId: input.propertyId?.trim().slice(0, 128) || undefined,
    }),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || "Could not send message.");
  }
}
