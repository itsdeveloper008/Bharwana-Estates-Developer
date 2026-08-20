import { delay } from "@/lib/utils";
import { users } from "@/lib/mock-data/users";
import type { User, UserRole } from "@/lib/types";

export async function getUsers(): Promise<User[]> {
  // TODO: replace with real backend call
  await delay(0);
  return users;
}

export async function getUserById(id: string): Promise<User | undefined> {
  // TODO: replace with real backend call
  await delay(0);
  return users.find((user) => user.id === id);
}

export async function getUsersByRole(role: UserRole): Promise<User[]> {
  // TODO: replace with real backend call
  await delay(0);
  return users.filter((user) => user.role === role);
}

export function findMockUser(identifier: string): User | undefined {
  // TODO: replace with real backend call
  const value = identifier.trim().toLowerCase();
  return users.find(
    (user) =>
      user.email.toLowerCase() === value ||
      user.phone.replace(/\s/g, "") === identifier.replace(/\s/g, ""),
  );
}
