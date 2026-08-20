// Frontend-only mock admin credentials. Plain text is intentional for this phase.
// TODO: replace with real backend auth (hashed passwords, NextAuth / server session)

export interface AdminCredential {
  email: string;
  password: string;
  fullName: string;
  role: "ADMIN";
  avatarUrl?: string;
}

export const adminCredentials: AdminCredential[] = [
  {
    email: "admin@bharwana.example",
    password: "admin123",
    fullName: "Ayesha Bharwana",
    role: "ADMIN",
    avatarUrl:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80",
  },
  {
    email: "ops@bharwana.example",
    password: "ops1234",
    fullName: "Imran Bharwana",
    role: "ADMIN",
    avatarUrl:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
  },
  {
    email: "desk@bharwana.example",
    password: "desk123",
    fullName: "Nadia Qureshi",
    role: "ADMIN",
    avatarUrl:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80",
  },
];

export type AdminSession = Omit<AdminCredential, "password">;

export function authenticateAdmin(email: string, password: string): AdminSession | null {
  // TODO: replace with real backend call
  const match = adminCredentials.find(
    (admin) =>
      admin.email.toLowerCase() === email.trim().toLowerCase() && admin.password === password,
  );
  if (!match) return null;
  return {
    email: match.email,
    fullName: match.fullName,
    role: match.role,
    avatarUrl: match.avatarUrl,
  };
}
