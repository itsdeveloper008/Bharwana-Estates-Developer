import { fromAreaSqft } from "@/lib/area-units";

/** Square feet per square meter (international). */
export const SQFT_PER_SQM = 10.76391041671;

export type LatLngPoint = { lat: number; lng: number };

/**
 * Geodesic polygon area in m² (spherical excess).
 * Needs 3+ points; ring is closed automatically.
 */
export function polygonAreaSqMeters(points: LatLngPoint[]): number {
  if (points.length < 3) return 0;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6_378_137;
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const p1 = points[i]!;
    const p2 = points[(i + 1) % points.length]!;
    sum +=
      toRad(p2.lng - p1.lng) *
      (2 + Math.sin(toRad(p1.lat)) + Math.sin(toRad(p2.lat)));
  }
  return Math.abs((sum * R * R) / 2);
}

export function polygonAreaSqft(points: LatLngPoint[]): number {
  return polygonAreaSqMeters(points) * SQFT_PER_SQM;
}

/** Compact readout: m² + marla + kanal using project unit scales. */
export function formatBoundaryAreaSummary(points: LatLngPoint[]): string | null {
  if (points.length < 3) return null;
  const sqm = polygonAreaSqMeters(points);
  if (!Number.isFinite(sqm) || sqm <= 0) return null;
  const sqft = sqm * SQFT_PER_SQM;
  const marla = fromAreaSqft(sqft, "marla");
  const kanal = fromAreaSqft(sqft, "kanal");
  const nice = (n: number, digits: number) =>
    Number.isInteger(n) || Math.abs(n - Math.round(n)) < 0.05
      ? String(Math.round(n))
      : n.toFixed(digits).replace(/\.?0+$/, "");
  return `${nice(sqm, 1)} m² · ${nice(marla, 2)} Marla · ${nice(kanal, 3)} Kanal`;
}
