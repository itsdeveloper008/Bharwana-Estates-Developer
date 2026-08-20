import { delay } from "@/lib/utils";
import { developers } from "@/lib/mock-data/developers";
import type { Developer } from "@/lib/types";

export async function getDevelopers(): Promise<Developer[]> {
  // TODO: replace with real backend call
  await delay(0);
  return developers;
}

export async function getDeveloperById(id: string): Promise<Developer | undefined> {
  // TODO: replace with real backend call
  await delay(0);
  return developers.find((developer) => developer.id === id);
}
