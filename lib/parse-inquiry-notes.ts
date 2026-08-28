export interface ParsedInquiryNotes {
  fullName: string | null;
  phone: string | null;
  email: string | null;
  visitDate: string | null;
  message: string | null;
  isDirectReveal: boolean;
  raw: string;
}

/** Parses inquiry `notes` strings produced by the buyer inquiry modal. */
export function parseInquiryNotes(notes: string): ParsedInquiryNotes {
  const raw = notes.trim();

  const directMatch = raw.match(
    /^Direct contact revealed to (.+?) · (.+?)\. Outside Bharwana mediation\.$/,
  );
  if (directMatch) {
    return {
      fullName: directMatch[1] ?? null,
      phone: directMatch[2] ?? null,
      email: null,
      visitDate: null,
      message: "Buyer requested direct seller contact via Bharwana.",
      isDirectReveal: true,
      raw,
    };
  }

  const parts = raw.split(" · ");
  if (parts.length >= 4) {
    const fullName = parts[0] ?? null;
    const phone = parts[1] ?? null;
    let visitDate: string | null = null;
    let email: string | null = null;
    let messageStart = 2;

    if (parts[2]?.startsWith("visit ")) {
      visitDate = parts[2].replace(/^visit /, "") || null;
      email = parts[3] ?? null;
      messageStart = 4;
    } else {
      email = parts[2] ?? null;
      messageStart = 3;
    }

    const message = parts.slice(messageStart).join(" · ").trim() || null;

    if (fullName || phone || email || message) {
      return {
        fullName,
        phone,
        email,
        visitDate,
        message,
        isDirectReveal: false,
        raw,
      };
    }
  }

  return {
    fullName: null,
    phone: null,
    email: null,
    visitDate: null,
    message: raw || null,
    isDirectReveal: false,
    raw,
  };
}
