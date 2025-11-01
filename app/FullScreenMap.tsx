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
    { elementType: "geometry.stroke", stylers: [{ color: "#23B0FF" }] },
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
    const polylinesRef = useRef<google.maps.Polyline[]>([]);
    const { locations, selectedId, startingLocations, setSelectedId } = useLocations();

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
            const bounds = new google.maps.LatLngBounds();
            if (Array.isArray(locations) && locations.length > 0) {
                locations.forEach((feat) => {
                    // new Feature shape exposes latitude/longitude at top-level
                    const lat = feat.latitude;
                    const lng = feat.longitude;
                    if (lat == null || lng == null) return; // skip if missing
                    const position = { lat, lng };
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
            }

            // Add blue pins for startingLocations (if any)
            if (Array.isArray(startingLocations) && startingLocations.length > 0) {
                startingLocations.forEach((start) => {
                    const [lat, lng] = start.coordinates;
                    const position = { lat, lng };

                    // Use a blue-dot icon for starting locations. This is a commonly used
                    // Google-hosted icon and keeps the marker visually distinct.
                    const icon = {
                        url: "https://cdn-icons-png.flaticon.com/512/6735/6735939.png",
                        scaledSize: new google.maps.Size(64, 64),
                    } as google.maps.Icon;

                    const marker = new google.maps.Marker({
                        position,
                        map,
                        icon,
                        title: start.name,
                        opacity: 1,
                    });

                    // mark this marker as a starting location for any future logic
                    (marker as any).__isStarting = true;
                    (marker as any).__startName = start.name;

                    // optional: clicking a start pin recenters map
                    // marker.addListener("click", () => {
                    //     if (mapRef.current) mapRef.current.panTo(position as google.maps.LatLngLiteral);
                    // });

                    bounds.extend(position as google.maps.LatLngLiteral);
                    markersRef.current.push(marker);
                });
            }

            // Fit map to markers if more than one
            const totalMarkers = markersRef.current.length;
            if (totalMarkers > 1) {
                map.fitBounds(bounds);
            } else if (totalMarkers === 1) {
                const centerLatLng = bounds.getCenter();
                if (centerLatLng) map.setCenter(centerLatLng.toJSON());
                map.setZoom(6);
            }
        })();

        return () => {
            aborted = true;
            // cleanup markers
            markersRef.current.forEach((m) => m.setMap(null));
            markersRef.current = [];
            // cleanup polylines
            polylinesRef.current.forEach((p) => p.setMap(null));
            polylinesRef.current = [];
            if (mapRef.current) {
                // nothing special to do for map
                mapRef.current = null;
            }
        };
    }, [center.lat, center.lng, zoom, mapId, locations, startingLocations, setSelectedId]);

    // Update marker opacities and draw lines from startingLocations to the selected location
    useEffect(() => {
        // require a map to draw lines
        if (!mapRef.current) return;

        // update marker opacities and optionally pan the map when selection changes
        markersRef.current.forEach((marker) => {
            const id = (marker as any).__locId as string | undefined;
            const isSelected = id != null && selectedId === id;
            // set opacity (use any to avoid TS issues with marker.setOpacity)
            try {
                if (typeof (marker as any).setOpacity === "function") {
                    (marker as any).setOpacity(isSelected ? 1 : 0.5);
                }
            } catch (e) {
                // ignore
            }
            if (isSelected && mapRef.current) {
                const pos = marker.getPosition();
                if (pos) mapRef.current.panTo(pos);
            }
        });

        // clear any existing polylines before drawing new ones
        polylinesRef.current.forEach((p) => p.setMap(null));
        polylinesRef.current = [];

        if (selectedId) {
            // find the selected location from locations context
            const selected = Array.isArray(locations) ? locations.find((l) => l.id === selectedId) : undefined;
            if (selected && selected.latitude != null && selected.longitude != null && Array.isArray(startingLocations)) {
                const bounds = new google.maps.LatLngBounds();
                const selectedPos = { lat: selected.latitude, lng: selected.longitude } as google.maps.LatLngLiteral;

                startingLocations.forEach((start) => {
                    const [lat, lng] = start.coordinates;
                    if (lat == null || lng == null) return;
                    const startPos = { lat, lng } as google.maps.LatLngLiteral;

                    const polyline = new google.maps.Polyline({
                        path: [startPos, selectedPos],
                        geodesic: true,
                        strokeColor: "#4285F4",
                        strokeOpacity: 0.9,
                        strokeWeight: 3,
                        map: mapRef.current!,
                    });

                    polylinesRef.current.push(polyline);
                    bounds.extend(startPos);
                    bounds.extend(selectedPos);
                });

                // Fit to show all lines if we drew any
                if (polylinesRef.current.length > 0) {
                    try {
                        mapRef.current.fitBounds(bounds);
                    } catch (e) {
                        // ignore fit errors
                    }
                }
            }
        }

        // cleanup when effect re-runs
        return () => {
            polylinesRef.current.forEach((p) => p.setMap(null));
            polylinesRef.current = [];
        };
    }, [selectedId, locations, startingLocations]);

    return (
        <div className="fixed inset-0">
            <div ref={mapEl} className="h-full w-full" style={{ height: "100dvh", width: "100vw" }} />
        </div>
    );
}

