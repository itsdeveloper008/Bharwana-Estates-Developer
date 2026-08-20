import { delay } from "@/lib/utils";
import { transactions } from "@/lib/mock-data/transactions";
import type { Transaction } from "@/lib/types";

export async function getTransactions(): Promise<Transaction[]> {
  // TODO: replace with real backend call
  await delay(0);
  return transactions;
}
