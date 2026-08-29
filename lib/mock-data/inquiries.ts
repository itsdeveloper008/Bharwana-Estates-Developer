import type { Inquiry } from "@/lib/types";

/** Inquiries load from Firestore in production — no seeded test leads for QA. */
export const inquiries: Inquiry[] = [];
