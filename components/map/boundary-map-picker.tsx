"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, MarkerF, PolygonF, PolylineF, useJsApiLoader } from "@react-google-maps/api";
import { MapPin, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatBoundaryAreaSummary,
  polygonAreaSqft,
  type LatLngPoint,
} from "@/lib/geo-area";
import {
  DEFAULT_MAP_VIEW,
  GOOGLE_MAPS_API_KEY,
  GOOGLE_MAPS_LIBRARIES,
  hasGoogleMapsKey,
} from "@/lib/map";
import { cn } from "@/lib/utils";

const GOLD = "#D4AF37";
const FOREST = "#0F2E1D";

export function BoundaryMapPicker({
  points,
  onChange,
  onAreaSqft,
  centerLatitude,
  centerLongitude,
  className,
}: {
  points: LatLngPoint[];
  onChange: (points: LatLngPoint[]) => void;
  /** Fired when polygon has 3+ points (or cleared). */
  onAreaSqft?: (sqft: number | null) => void;
  centerLatitude?: number;
  centerLongitude?: number;
  className?: string;
}) {
  const [center, setCenter] = useState({
    lat: centerLatitude || DEFAULT_MAP_VIEW.latitude,
    lng: centerLongitude || DEFAULT_MAP_VIEW.longitude,
  });
  const [zoom, setZoom] = useState(points.length ? 16 : 14);
  const skipClickRef = useRef(false);
  const onAreaSqftRef = useRef(onAreaSqft);
  onAreaSqftRef.current = onAreaSqft;

  const { isLoaded } = useJsApiLoader({
    id: "bharwana-google-maps",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  useEffect(() => {
    if (!Number.isFinite(centerLatitude) || !Number.isFinite(centerLongitude)) return;
    if (points.length > 0) return;
    setCenter({ lat: centerLatitude!, lng: centerLongitude! });
  }, [centerLatitude, centerLongitude, points.length]);

  useEffect(() => {
    if (points.length < 3) {
      onAreaSqftRef.current?.(null);
      return;
    }
    const sqft = polygonAreaSqft(points);
    onAreaSqftRef.current?.(Number.isFinite(sqft) && sqft > 0 ? sqft : null);
  }, [points]);

  const areaSummary = useMemo(() => formatBoundaryAreaSummary(points), [points]);

  const addPoint = useCallback(
    (lat: number, lng: number) => {
      onChange([...points, { lat, lng }]);
    },
    [onChange, points],
  );

  const movePoint = useCallback(
    (index: number, lat: number, lng: number) => {
      const next = points.map((point, i) => (i === index ? { lat, lng } : point));
      onChange(next);
    },
    [onChange, points],
  );

  const undoLast = useCallback(() => {
    if (points.length === 0) return;
    onChange(points.slice(0, -1));
  }, [onChange, points]);

  const clearAll = useCallback(() => {
    onChange([]);
  }, [onChange]);

  const path = useMemo(
    () => points.map((p) => ({ lat: p.lat, lng: p.lng })),
    [points],
  );

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-forest">Mark boundary</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Optional — click the map to drop points. Drag a marker to adjust. Area fills in once you have 3+
            points.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 border-forest/20 text-forest hover:border-gold/50 hover:bg-gold/10 hover:text-forest"
            onClick={undoLast}
            disabled={points.length === 0}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Undo last
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 border-forest/20 text-forest hover:border-gold/50 hover:bg-gold/10 hover:text-forest"
            onClick={clearAll}
            disabled={points.length === 0}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear all
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_18px_48px_-26px_rgba(15,46,29,0.32)] ring-1 ring-[#EDE6D8]/70">
        <div className="h-72">
          {!hasGoogleMapsKey() || !isLoaded ? (
            <div className="flex h-full items-center justify-center gap-2 bg-cream/50 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 text-gold" />
              Loading Google Map…
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={{ width: "100%", height: "100%" }}
              center={center}
              zoom={zoom}
              options={{
                mapTypeId: "satellite",
                mapTypeControl: true,
                streetViewControl: false,
                fullscreenControl: false,
                gestureHandling: "greedy",
              }}
              onClick={(event) => {
                if (skipClickRef.current) {
                  skipClickRef.current = false;
                  return;
                }
                const lat = event.latLng?.lat();
                const lng = event.latLng?.lng();
                if (lat == null || lng == null) return;
                addPoint(lat, lng);
                setCenter({ lat, lng });
                if (zoom < 16) setZoom(16);
              }}
            >
              {points.length >= 3 ? (
                <PolygonF
                  path={path}
                  options={{
                    fillColor: GOLD,
                    fillOpacity: 0.22,
                    strokeColor: GOLD,
                    strokeOpacity: 0.95,
                    strokeWeight: 2,
                    clickable: false,
                  }}
                />
              ) : points.length >= 2 ? (
                <PolylineF
                  path={path}
                  options={{
                    strokeColor: GOLD,
                    strokeOpacity: 0.95,
                    strokeWeight: 2,
                    clickable: false,
                  }}
                />
              ) : null}

              {points.map((point, index) => (
                <MarkerF
                  key={`boundary-${index}`}
                  position={{ lat: point.lat, lng: point.lng }}
                  draggable
                  label={{
                    text: String(index + 1),
                    color: FOREST,
                    fontWeight: "700",
                    fontSize: "11px",
                  }}
                  icon={
                    typeof google !== "undefined"
                      ? {
                          path: google.maps.SymbolPath.CIRCLE,
                          scale: 10,
                          fillColor: GOLD,
                          fillOpacity: 1,
                          strokeColor: FOREST,
                          strokeWeight: 2,
                        }
                      : undefined
                  }
                  onDragStart={() => {
                    skipClickRef.current = true;
                  }}
                  onDragEnd={(event) => {
                    skipClickRef.current = true;
                    const lat = event.latLng?.lat();
                    const lng = event.latLng?.lng();
                    if (lat == null || lng == null) return;
                    movePoint(index, lat, lng);
                    window.setTimeout(() => {
                      skipClickRef.current = false;
                    }, 0);
                  }}
                  onClick={() => {
                    skipClickRef.current = true;
                  }}
                />
              ))}
            </GoogleMap>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <p>
          {points.length === 0
            ? "No boundary points yet."
            : points.length < 3
              ? `${points.length} point${points.length === 1 ? "" : "s"} — add ${3 - points.length} more to close the shape.`
              : `${points.length} points · boundary closed.`}
        </p>
        {areaSummary ? (
          <p className="font-medium text-forest">
            Calculated area: <span className="text-gold-800">{areaSummary}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
