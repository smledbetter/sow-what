import { seedDAO } from "./seeds.ts";
import { parseCsv } from "../utils/csv.ts";

/** On first load, if no seeds exist, fetch and import the bundled CSV */
export async function bootstrapSeeds(): Promise<void> {
  const count = await seedDAO.count();
  if (count > 0) return;

  try {
    const response = await fetch("/seeds.csv");
    if (!response.ok) return;
    const text = await response.text();
    const { seeds } = parseCsv(text);
    if (seeds.length > 0) {
      await seedDAO.bulkAdd(seeds);
    }
  } catch {
    // Offline or file missing — silently skip, user can import manually
  }
}
