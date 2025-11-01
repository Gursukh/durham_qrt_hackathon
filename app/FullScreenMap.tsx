// NOTE: @googlemaps/js-api-loader v2 removed the Loader class. Use setOptions() + importLibrary().
// See the updated FullscreenMapV2 below.
import { useEffect, useRef } from "react";
import { useLocations } from "./LocationsContext";

/**
 * Minimal, production‑ready Google Maps component for React.
 * - Loads JS API with @googlemaps/js-api-loader
 * - Renders a styled map
 * - Adds markers
 * - Plots one or many routes with DirectionsService/Renderer
 * - Includes Places Autocomplete for origin/destination
 *
 * Setup
 *   npm i @googlemaps/js-api-loader
 *   # put your key in env (Vite or Next):
 *   VITE_GOOGLE_MAPS_API_KEY=xxxx
 *   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=xxxx
 *
 * Key hygiene
 *   - Restrict key by HTTP referrer and API scope (Maps JavaScript API, Places API, Directions API).
 */

const DEFAULT_CENTER = { lat: 51.507351, lng: -0.127758 }; // London

// Example local style; replace with your cloud map style via mapId if preferred
const DARK_STYLE = [
    { elementType: "geometry", stylers: [{ color: "#192063" }] },
    { elementType: "geometry.stroke", stylers: [{ color: "#888888" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#e0e0e0" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#1f1f1f" }] },
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#666666" }] },
    { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#0d072c" }] }
];


// --- Simple full‑screen map component (no Loader) ---
export function FullscreenMap({
    center = DEFAULT_CENTER,
    zoom = 3,
    mapId,
}: {
    center?: google.maps.LatLngLiteral;
    zoom?: number;
    mapId?: string;
}) {
    const mapEl = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<google.maps.Map | null>(null);
    const markersRef = useRef<google.maps.Marker[]>([]);
    const { locations, selectedId, setSelectedId } = useLocations();

    // Create map and markers when component mounts or locations change
    useEffect(() => {
        let aborted = false;
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

        (async () => {
            const { setOptions, importLibrary } = await import("@googlemaps/js-api-loader");
            setOptions({ key: apiKey, v: "weekly" });

            const { Map } = (await importLibrary("maps")) as google.maps.MapsLibrary;

            if (aborted || !mapEl.current) return;

            // clear previous markers
            markersRef.current.forEach((m) => m.setMap(null));
            markersRef.current = [];

            const map = new Map(mapEl.current, {
                center,
                zoom,
                minZoom: 3,
                ...(mapId ? { mapId } : { styles: DARK_STYLE }),
                disableDefaultUI: true,
            });
            mapRef.current = map;

            // Add markers from locations context (if any)
            if (Array.isArray(locations) && locations.length > 0) {
                const bounds = new google.maps.LatLngBounds();
                locations.forEach((feat) => {
                    const coords = feat.geometry?.coordinates;
                    // sample.json uses [lat, lng]
                    const position = { lat: coords[0], lng: coords[1] };
                    const marker = new google.maps.Marker({ position, map, opacity: 0.5 });
                    // attach loc id for later reference
                    (marker as any).__locId = feat.id;

                    // click selects the location
                    marker.addListener("click", () => {
                        setSelectedId(feat.id);
                    });

                    bounds.extend(position as google.maps.LatLngLiteral);
                    markersRef.current.push(marker);
                });

                // Fit map to markers if more than one
                if (locations.length > 1) {
                    map.fitBounds(bounds);
                } else {
                    // center on single marker
                    const centerLatLng = bounds.getCenter();
                    if (centerLatLng) map.setCenter(centerLatLng.toJSON());
                    map.setZoom(6);
                }
            }
        })();

        return () => {
            aborted = true;
            // cleanup markers
            markersRef.current.forEach((m) => m.setMap(null));
            markersRef.current = [];
            if (mapRef.current) {
                // nothing special to do for map
                mapRef.current = null;
            }
        };
    }, [center.lat, center.lng, zoom, mapId, locations, setSelectedId]);

    // Update marker opacities and optionally pan the map when selection changes
    useEffect(() => {
        if (!markersRef.current) return;

        markersRef.current.forEach((marker) => {
            const id = (marker as any).__locId as string | undefined;
            const isSelected = id != null && selectedId === id;
            // set opacity (use any to avoid TS issues with marker.setOpacity)
            try {
                if (typeof (marker as any).setOpacity === "function") {
                    (marker as any).setOpacity(isSelected ? 1 : 0.5);
                } else {
                    // fallback: set icon with scaled opacity via CSS is hard here; ignore
                }
            } catch (e) {
                // ignore
            }
            if (isSelected && mapRef.current) {
                const pos = marker.getPosition();
                if (pos) mapRef.current.panTo(pos);
            }
        });
    }, [selectedId]);

    return (
        <div className="fixed inset-0">
            <div ref={mapEl} className="h-full w-full" style={{ height: "100dvh", width: "100vw" }} />
        </div>
    );
}

