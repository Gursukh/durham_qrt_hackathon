// NOTE: @googlemaps/js-api-loader v2 removed the Loader class. Use setOptions() + importLibrary().
// See the updated FullscreenMapV2 below.
import { useEffect, useRef } from "react";
import { renderToString } from "react-dom/server";
import { useLocations } from "./LocationsContext";
import officies from "../officies.json"

const DEFAULT_CENTER = { lat: 51.507351, lng: -0.127758 }; // London

// Example local style; replace with your cloud map style via mapId if preferred
const DARK_STYLE = [
    { elementType: "geometry", stylers: [{ color: "#083878" }] },
    { elementType: "geometry.stroke", stylers: [{ color: "#79D1F7" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#bdd1f2" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#444444" }] },
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "on" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#666666" }] },
    { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "on" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#bbd0f2" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#00000000" }] },
    // added stroke for water labels
];


// Small React components used to build InfoWindow content. We render them to HTML
// strings with renderToString so the Google Maps InfoWindow can accept them.
function StartTooltip({ count, name }: { count: number; name: string }) {
    return (
        <div className="text-black flex flex-col text-xl">
            <div className="font-bold ">{name}</div>
            <div className="flex justify-center items-center gap-2">

                <div className="mr font-bold">{count}</div>
                <svg fill="#000000" width="32px" height="32px" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M16 15.503A5.041 5.041 0 1 0 16 5.42a5.041 5.041 0 0 0 0 10.083zm0 2.215c-6.703 0-11 3.699-11 5.5v3.363h22v-3.363c0-2.178-4.068-5.5-11-5.5z" /></svg>
            </div>
        </div>
    );
}

function PolylineTooltip({ start, selected }: { start: any; selected: any }) {
    const startName = start.name || "";
    const selectedName = selected.event_location || "";
    const travelTimeStringHoursMins = (selected.attendee_travel_hours[start.name] != null)
        ? `${Math.floor(selected.attendee_travel_hours[start.name] ?? 0)}h ${Math.floor((selected.attendee_travel_hours[start.name] ?? 0) * 60) % 60}m`
        : "N/A";
    const isZurichGeneva = (startName === "Zurich" && selectedName === "Geneva") || (startName === "Geneva" && selectedName === "Zurich");
    return (
        <>
            <div className="flex justify-center items-center gap-4 text-black">
                <div className="font-semibold text-sm ">{startName}</div>
                {isZurichGeneva ? (
                    // simple train icon for Zurich -> Geneva special case
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="6" width="20" height="10" rx="2" ry="2" fill="#000" />
                        <circle cx="7" cy="18" r="1.5" fill="#000" />
                        <circle cx="17" cy="18" r="1.5" fill="#000" />
                        <rect x="5" y="8" width="6" height="4" fill="#fff" />
                    </svg>
                ) : (
                    <svg fill="#000000" version="1.1"
                        width="32px" height="32px" viewBox="0 0 371.656 371.656">
                        <g>
                            <g>
                                <g>
                                    <path d="M37.833,212.348c-0.01,0.006-0.021,0.01-0.032,0.017c-4.027,2.093-5.776,6.929-4.015,11.114
                c1.766,4.199,6.465,6.33,10.787,4.892l121.85-40.541l-22.784,37.207c-1.655,2.703-1.305,6.178,0.856,8.497
                c2.161,2.318,5.603,2.912,8.417,1.449l23.894-12.416c0.686-0.356,1.309-0.823,1.844-1.383l70.785-73.941l87.358-45.582
                c33.085-17.835,29.252-31.545,27.29-35.321c-1.521-2.928-4.922-6.854-12.479-8.93c-7.665-2.106-18.021-1.938-31.653,0.514
                c-4.551,0.818-7.063,0.749-9.723,0.676c-9.351-0.256-15.694,0.371-47.188,16.736L90.788,164.851l-66.8-34.668
                c-2.519-1.307-5.516-1.306-8.035,0.004l-11.256,5.85c-2.317,1.204-3.972,3.383-4.51,5.938c-0.538,2.556,0.098,5.218,1.732,7.253
                l46.364,57.749L37.833,212.348z"/>
                                    <path d="M355.052,282.501H28.948c-9.17,0-16.604,7.436-16.604,16.604s7.434,16.604,16.604,16.604h326.104
                c9.17,0,16.604-7.434,16.604-16.604C371.655,289.934,364.222,282.501,355.052,282.501z"/>
                                </g>
                            </g>
                        </g>
                    </svg>
                )}
                <div className="font-semibold text-sm ">{selectedName}</div>
            </div>
            <div className="flex text-black gap-2 mt-2">
                <div className="font-bold">{"Travel Hours"}</div>
                <div className="font-bold">{travelTimeStringHoursMins}</div>
            </div>
        </>
    );
}

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
    // separate refs so starting-location pins stay visually fixed while
    // regular location markers can change opacity when a selection is made
    const startMarkersRef = useRef<google.maps.Marker[]>([]);
    const locationMarkersRef = useRef<google.maps.Marker[]>([]);
    // markers used to show intermediate airport hops (circle + code)
    const hopMarkersRef = useRef<google.maps.Marker[]>([]);
    const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
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

            // clear previous markers (both kinds)
            startMarkersRef.current.forEach((m) => m.setMap(null));
            startMarkersRef.current = [];
            locationMarkersRef.current.forEach((m) => m.setMap(null));
            locationMarkersRef.current = [];

            const map = new Map(mapEl.current, {
                center,
                zoom,
                minZoom: 3,
                ...(mapId ? { mapId } : { styles: DARK_STYLE }),
                disableDefaultUI: true,
                restriction: {
                    latLngBounds: {
                        north: 85,
                        south: -85,
                        west: -180,
                        east: 180,
                    }
                },
            });
            mapRef.current = map;

            // Add markers from locations context (if any)
            const bounds = new google.maps.LatLngBounds();

            // Add blue pins for startingLocations (if any)
            if (Array.isArray(startingLocations) && startingLocations.length > 0) {
                // create one reusable InfoWindow for hover tooltips
                infoWindowRef.current = new google.maps.InfoWindow({
                    // keep it small and simple; content will be set per-marker on hover
                    headerDisabled: true,
                    maxWidth: 500,
                });
                startingLocations.forEach((start) => {
                    const [lat, lng] = start.coordinates;
                    const position = { lat, lng };

                    // Use a blue-dot icon for starting locations. This is a commonly used
                    // Google-hosted icon and keeps the marker visually distinct.
                    const icon = {
                        url: "https://cdn-icons-png.flaticon.com/512/7022/7022927.png",
                        scaledSize: new google.maps.Size(32, 32),
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
                    // attach attendee count so tooltip can show correct number
                    (marker as any).__numAttendees = (start as any).numAttendees ?? 0;

                    // show a small tooltip on hover with a person icon and number of attendees
                    marker.addListener("mouseover", () => {
                        const count = (marker as any).__numAttendees || 0;
                        const name = (marker as any).__startName || "";
                        const content = renderToString(<StartTooltip count={count} name={name} />);
                        if (infoWindowRef.current) {
                            infoWindowRef.current.setContent(content);
                            infoWindowRef.current.open({ anchor: marker, map });
                        }
                    });

                    marker.addListener("mouseout", () => {
                        if (infoWindowRef.current) infoWindowRef.current.close();
                    });

                    // optional: clicking a start pin recenters map
                    // marker.addListener("click", () => {
                    //     if (mapRef.current) mapRef.current.panTo(position as google.maps.LatLngLiteral);
                    // });

                    bounds.extend(position as google.maps.LatLngLiteral);
                    startMarkersRef.current.push(marker);
                });
            }

            if (Array.isArray(locations) && locations.length > 0) {
                locations.forEach((feat) => {
                    // new Feature shape exposes latitude/longitude at top-level

                    const office = (officies as any)[feat.event_location];


                    const lat = office.lat;
                    const lng = office.long;
                    if (lat == null || lng == null) return; // skip if missing
                    const position = { lat, lng };
                    const marker = new google.maps.Marker({ position, map, opacity: 0.75 });
                    // attach loc id for later reference
                    (marker as any).__locId = feat.id;

                    // click selects the location
                    marker.addListener("click", () => {
                        setSelectedId(feat.id);
                    });

                    bounds.extend(position as google.maps.LatLngLiteral);
                    locationMarkersRef.current.push(marker);
                });
            }

            // Fit map to markers if more than one
            const totalMarkers = startMarkersRef.current.length + locationMarkersRef.current.length;
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
            startMarkersRef.current.forEach((m) => m.setMap(null));
            startMarkersRef.current = [];
            locationMarkersRef.current.forEach((m) => m.setMap(null));
            locationMarkersRef.current = [];
            // cleanup hop markers
            hopMarkersRef.current.forEach((m) => m.setMap(null));
            hopMarkersRef.current = [];
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

        // API key for Routes REST calls (used below when available)
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

        // update marker opacities and optionally pan the map when selection changes
        locationMarkersRef.current.forEach((marker: google.maps.Marker) => {
            const id = (marker as any).__locId as string | undefined;
            const isSelected = id != null && selectedId === id;
            // set opacity (use any to avoid TS issues with marker.setOpacity)
            try {
                if (typeof (marker as any).setOpacity === "function") {
                    (marker as any).setOpacity(isSelected ? 1 : 0.75);
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
        // clear any existing hop markers
        hopMarkersRef.current.forEach((m) => m.setMap(null));
        hopMarkersRef.current = [];

        if (selectedId) {
            // find the selected location from locations context
            const selected = Array.isArray(locations) ? locations.find((l) => l.id === selectedId) : undefined;
            const office = (officies as any)[selected.event_location];
            if (selected && office.lat != null && office.long != null && Array.isArray(startingLocations)) {
                const bounds = new google.maps.LatLngBounds();

                const selectedPos = { lat: office.lat, lng: office.long } as google.maps.LatLngLiteral;

                // helper: compute a smooth arc between two lat/lng points.
                // Uses a quadratic Bezier interpolation in lat/lng space with a perpendicular
                // control point. Longitudes are wrapped so the arc always follows the
                // shorter longitudinal direction (handles dateline crossing).
                const computeArcPoints = (
                    a: google.maps.LatLngLiteral,
                    b: google.maps.LatLngLiteral,
                    numPoints = 60,
                    offsetFactor = 0.2
                ) => {
                    const points: google.maps.LatLngLiteral[] = [];

                    // handle longitude wrapping to ensure shortest lon delta
                    let rawDx = b.lng - a.lng;
                    if (rawDx > 180) rawDx -= 360;
                    if (rawDx < -180) rawDx += 360;
                    const dx = rawDx;
                    const dy = b.lat - a.lat;

                    // midpoint in continuous lon space
                    const mx = a.lng + dx / 2;
                    const my = (a.lat + b.lat) / 2;

                    // perpendicular vector (rotated 90deg)
                    let px = -dy;
                    let py = dx;
                    const plen = Math.sqrt(px * px + py * py) || 1;
                    px /= plen;
                    py /= plen;

                    // ensure the bulge is always "north" (higher latitude)
                    // use the absolute offset magnitude and flip perpendicular if needed
                    const sign = Math.sign(offsetFactor) || 1;
                    const absOffset = Math.abs(offsetFactor);
                    // if py*sign is negative, flipping px/py makes controlY > my
                    if (py * sign <= 0) {
                        px = -px;
                        py = -py;
                    }

                    // distance in degree-space (approx) and control point offset
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const controlX = mx + px * dist * absOffset;
                    const controlY = my + py * dist * absOffset;

                    // bLng wrapped so interpolation goes the short way across the dateline
                    const bLngWrapped = a.lng + dx;

                    const normalizeLng = (lng: number) => {
                        // normalize to [-180,180]
                        let v = ((lng + 180) % 360 + 360) % 360 - 180;
                        return v;
                    };

                    for (let i = 0; i <= numPoints; i++) {
                        const t = i / numPoints;
                        const u = 1 - t;
                        // Quadratic Bezier: B(t) = u^2*A + 2*u*t*Control + t^2*B
                        const lat = u * u * a.lat + 2 * u * t * controlY + t * t * b.lat;
                        const lngRaw = u * u * a.lng + 2 * u * t * controlX + t * t * bLngWrapped;
                        const lng = normalizeLng(lngRaw);
                        points.push({ lat, lng });
                    }
                    return points;
                };

                // decode an encoded polyline (Google Encoded Polyline Algorithm Format)
                const decodePolyline = (encoded: string) => {
                    const points: google.maps.LatLngLiteral[] = [];
                    let index = 0, len = encoded.length;
                    let lat = 0, lng = 0;

                    while (index < len) {
                        let b, shift = 0, result = 0;
                        do {
                            b = encoded.charCodeAt(index++) - 63;
                            result |= (b & 0x1f) << shift;
                            shift += 5;
                        } while (b >= 0x20);
                        const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
                        lat += dlat;

                        shift = 0;
                        result = 0;
                        do {
                            b = encoded.charCodeAt(index++) - 63;
                            result |= (b & 0x1f) << shift;
                            shift += 5;
                        } while (b >= 0x20);
                        const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
                        lng += dlng;

                        points.push({ lat: lat / 1e5, lng: lng / 1e5 });
                    }
                    return points;
                };

                // call Google Routes ComputeRoutes REST endpoint to get an encoded polyline for a segment.
                // Falls back to the arc generator on any failure.
                const computeRoutePolyline = async (o: google.maps.LatLngLiteral, d: google.maps.LatLngLiteral) => {
                    try {
                        if (!apiKey) return null;
                        const url = `https://routes.googleapis.com/directions/v2:computeRoutes?key=${apiKey}`;
                        const body = {
                            origin: { location: { latLng: { latitude: o.lat, longitude: o.lng } } },
                            destination: { location: { latLng: { latitude: d.lat, longitude: d.lng } } },
                            travelMode: "DRIVE",
                            routingPreference: "TRAFFIC_AWARE",
                            computeAlternativeRoutes: false,
                        };

                        const resp = await fetch(url, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Accept": "application/json",
                                // Request specific response fields per API requirement
                                "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline",
                            },
                            body: JSON.stringify(body),
                        });
                        if (!resp.ok) return null;
                        const data = await resp.json();
                        // routes[0].polyline.encodedPolyline is typical
                        const enc = data?.routes?.[0]?.polyline?.encodedPolyline || data?.routes?.[0]?.overviewPolyline?.encodedPolyline;
                        const distanceMeters = data?.routes?.[0]?.distanceMeters ?? data?.routes?.[0]?.legs?.[0]?.distanceMeters;
                        const durationSeconds = data?.routes?.[0]?.duration ?? data?.routes?.[0]?.legs?.[0]?.duration;
                        if (typeof enc === "string" && enc.length > 0) {
                            return { points: decodePolyline(enc), distanceMeters, durationSeconds };
                        }
                        return null;
                    } catch (e) {
                        return null;
                    }
                };
                // compute great-circle/haversine length of a polyline (meters)
                const haversineMeters = (p1: google.maps.LatLngLiteral, p2: google.maps.LatLngLiteral) => {
                    const R = 6371000; // earth radius in meters
                    const toRad = (d: number) => (d * Math.PI) / 180;
                    const lat1 = toRad(p1.lat);
                    const lat2 = toRad(p2.lat);
                    let dLon = toRad(p2.lng - p1.lng);
                    // normalize dLon to [-PI, PI]
                    if (dLon > Math.PI) dLon -= 2 * Math.PI;
                    if (dLon < -Math.PI) dLon += 2 * Math.PI;
                    const dLat = lat2 - lat1;
                    const aVal = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
                    const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
                    return R * c;
                };

                const pathLengthMeters = (pts: google.maps.LatLngLiteral[]) => {
                    let sum = 0;
                    for (let i = 1; i < pts.length; i++) {
                        sum += haversineMeters(pts[i - 1], pts[i]);
                    }
                    return sum;
                };

                startingLocations.forEach((start) => {
                    const [lat, lng] = start.coordinates;
                    if (lat == null || lng == null) return;
                    const startPos = { lat, lng } as google.maps.LatLngLiteral;

                    // special-case: if the start is Zurich and the selected event is Geneva,
                    // draw a straight line and show a train icon in the tooltip
                    const isZurichGeneva = ((start.name === "Zurich") && (selected.event_location === "Geneva")) ||
                        ((start.name === "Geneva") && (selected.event_location === "Zurich"));

                    // If the selected location provides attendee_routes for this start location,
                    // build the polyline as a series of hops between the airports. Each route
                    // element is expected to be [airportCode, long, lat]. Fall back to the
                    // original arc/straight logic when routes are not available.
                    let path: google.maps.LatLngLiteral[] = [];
                    try {
                        const routesForStart = (selected as any)?.attendee_routes?.[start.name];
                        if (Array.isArray(routesForStart) && routesForStart.length > 0) {
                            // Map each hop to LatLngLiteral (route element shape: {airport_code, latitude, longitude})
                            const hopPoints: google.maps.LatLngLiteral[] = [];
                            const hopInfos: { lat: number; lng: number; code?: string }[] = [];

                            routesForStart.forEach((hop: any) => {
                                const hopLat = parseFloat(hop["latitude"]);
                                const hopLng = parseFloat(hop["longitude"]);
                                const code = hop["airport_code"] || hop["airportCode"] || hop["code"] || "";
                                if (!isNaN(hopLat) && !isNaN(hopLng)) {
                                    hopPoints.push({ lat: hopLat, lng: hopLng });
                                    hopInfos.push({ lat: hopLat, lng: hopLng, code });
                                }
                            });

                            // Ensure route includes start and selected endpoints
                            if (hopPoints.length === 0) {
                                path = [startPos, selectedPos];
                            } else {
                                // Prepend start if first hop isn't the start position
                                const firstHop = hopPoints[0];
                                const lastHop = hopPoints[hopPoints.length - 1];
                                const near = (a: google.maps.LatLngLiteral, b: google.maps.LatLngLiteral) => {
                                    return Math.abs(a.lat - b.lat) < 1e-4 && Math.abs(a.lng - b.lng) < 1e-4;
                                };
                                // if (!near(startPos, firstHop)) {
                                //     hopPoints.unshift(startPos);
                                // }
                                // if (!near(lastHop, selectedPos)) {
                                //     hopPoints.push(selectedPos);
                                // }

                                // Build segments between consecutive hop points and concatenate.
                                // For the very first segment (start -> firstHop) prefer the Google
                                // Routes ComputeRoutes API to obtain a realistic driving route polyline.
                                const segments: google.maps.LatLngLiteral[] = [];

                                // async helper to build the full series of segments with an optional
                                // computed first segment from the Routes API. We'll synchronously
                                // push a fallback arc first and then replace it if ComputeRoutes succeeds.
                                let firstSegmentReplaced = false;

                                // If there is at least one hop, attempt to compute a route for the first leg
                                if (hopPoints.length >= 2) {
                                    const firstHopPoint = hopPoints[0];
                                    // start -> firstHop via ComputeRoutes (REST). Use an IIFE so we
                                    // can await without blocking the main forEach.
                                    (async () => {
                                        const computed = await computeRoutePolyline(startPos, firstHopPoint);
                                        if (computed && computed.points && computed.points.length > 0) {
                                            try {
                                                // find where we inserted fallback points and replace them
                                                // with the computed route. We'll rebuild segments array
                                                // defensively by recomputing remaining arcs and inserting computed first leg.
                                                const rebuilt: google.maps.LatLngLiteral[] = [];
                                                // push computed first leg
                                                rebuilt.push(...computed.points);
                                                // for remaining hop->hop legs, use arc generator
                                                for (let j = 0; j < hopPoints.length - 1; j++) {
                                                    const a = hopPoints[j];
                                                    const b = hopPoints[j + 1];
                                                    const seg = computeArcPoints(a, b, 80, 0.25);
                                                    if (j === 0) {
                                                        // skip potential duplicate at join: if computed ends at same
                                                        // coordinate as seg[0], drop seg[0]
                                                        if (seg.length > 0) {
                                                            // compare last of computed vs first of seg
                                                            const lastComp = computed.points[computed.points.length - 1];
                                                            const firstSeg = seg[0];
                                                            const near = (p1: any, p2: any) => Math.abs(p1.lat - p2.lat) < 1e-4 && Math.abs(p1.lng - p2.lng) < 1e-4;
                                                            if (near(lastComp, firstSeg)) {
                                                                rebuilt.push(...seg.slice(1));
                                                            } else {
                                                                rebuilt.push(...seg);
                                                            }
                                                        }
                                                    } else {
                                                        // avoid duplicate vertex at joins
                                                        rebuilt.push(...seg.slice(1));
                                                    }
                                                }
                                                // Replace segments content
                                                segments.length = 0;
                                                segments.push(...rebuilt);
                                                firstSegmentReplaced = true;

                                                // Create a separate route polyline (driving route) and attach a car+distance tooltip
                                                try {
                                                    const routePolyline = new google.maps.Polyline({
                                                        path: computed.points,
                                                        geodesic: false,
                                                        strokeColor: "#a43ef7",
                                                        strokeOpacity: 0.95,
                                                        strokeWeight: 4.0,
                                                        zIndex: 900,
                                                        map: mapRef.current!,
                                                    });

                                                    // small InfoWindow for car + distance
                                                    const routeInfoWindow = new google.maps.InfoWindow({ maxWidth: 300, headerDisabled: true });

                                                    const showRouteTooltip = (evt: google.maps.MapMouseEvent | undefined) => {
                                                        if (!evt || !evt.latLng) return;
                                                        const meters = computed.distanceMeters ?? null;
                                                        const kmStr = meters != null ? `${(meters / 1000).toFixed(1)} km` : "N/A";
                                                        const co2EmissionsKg = meters != null ? (meters / 1000) * 0.192 : null; // avg car CO2 g/km
                                                        const carSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-car-front" viewBox="0 0 16 16">
  <path d="M4 9a1 1 0 1 1-2 0 1 1 0 0 1 2 0m10 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0M6 8a1 1 0 0 0 0 2h4a1 1 0 1 0 0-2zM4.862 4.276 3.906 6.19a.51.51 0 0 0 .497.731c.91-.073 2.35-.17 3.597-.17s2.688.097 3.597.17a.51.51 0 0 0 .497-.731l-.956-1.913A.5.5 0 0 0 10.691 4H5.309a.5.5 0 0 0-.447.276"/>
  <path d="M2.52 3.515A2.5 2.5 0 0 1 4.82 2h6.362c1 0 1.904.596 2.298 1.515l.792 1.848c.075.175.21.319.38.404.5.25.855.715.965 1.262l.335 1.679q.05.242.049.49v.413c0 .814-.39 1.543-1 1.997V13.5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-1.338c-1.292.048-2.745.088-4 .088s-2.708-.04-4-.088V13.5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-1.892c-.61-.454-1-1.183-1-1.997v-.413a2.5 2.5 0 0 1 .049-.49l.335-1.68c.11-.546.465-1.012.964-1.261a.8.8 0 0 0 .381-.404l.792-1.848ZM4.82 3a1.5 1.5 0 0 0-1.379.91l-.792 1.847a1.8 1.8 0 0 1-.853.904.8.8 0 0 0-.43.564L1.03 8.904a1.5 1.5 0 0 0-.03.294v.413c0 .796.62 1.448 1.408 1.484 1.555.07 3.786.155 5.592.155s4.037-.084 5.592-.155A1.48 1.48 0 0 0 15 9.611v-.413q0-.148-.03-.294l-.335-1.68a.8.8 0 0 0-.43-.563 1.8 1.8 0 0 1-.853-.904l-.792-1.848A1.5 1.5 0 0 0 11.18 3z"/>
</svg>`;
                                                        const content = `<div style='display:flex;align-items:center;gap:8px;color:#000'>${carSvg}<div style='font-weight:700'>${kmStr}</div><br /><div style='font-weight:700;color:#a43ef7'>${co2EmissionsKg != null ? `${co2EmissionsKg.toFixed(1)} kg CO2` : "N/A"}</div></div>`;
                                                        routeInfoWindow.setContent(content);
                                                        routeInfoWindow.setPosition(evt.latLng);
                                                        routeInfoWindow.open({ map: mapRef.current });
                                                    };

                                                    const hideRouteTooltip = () => routeInfoWindow.close();

                                                    routePolyline.addListener("mouseover", (evt: google.maps.MapMouseEvent) => showRouteTooltip(evt));
                                                    routePolyline.addListener("mousemove", (evt: google.maps.MapMouseEvent) => showRouteTooltip(evt));
                                                    routePolyline.addListener("mouseout", () => hideRouteTooltip());

                                                    polylinesRef.current.push(routePolyline);
                                                } catch (e) {
                                                    // ignore route polyline creation errors
                                                }
                                            } catch (e) {
                                                // ignore and keep fallback arcs
                                            }
                                        }
                                    })();
                                }

                                // Build fallback arc-based segments synchronously so UI shows something
                                for (let i = 0; i < hopPoints.length - 1; i++) {
                                    const a = hopPoints[i];
                                    const b = hopPoints[i + 1];
                                    const seg = computeArcPoints(a, b, 80, 0.25);
                                    if (i === 0) {
                                        segments.push(...seg);
                                    } else {
                                        segments.push(...seg.slice(1));
                                    }
                                }

                                // Use segments if we have them; otherwise fallback to direct start->selected
                                path = segments.length > 0 ? segments : [startPos, selectedPos];

                                // Create visual markers (circle + code) for intermediate hops (exclude start & selected)
                                const createAirportIcon = (code: string, size = 36) => {
                                    const safeCode = (code || "").toString();
                                    const svg = `<?xml version='1.0' encoding='UTF-8'?>\n<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'>\n  <circle cx='${size / 2}' cy='${size / 2}' r='${Math.floor(size / 2) - 3}' fill='#ffffff' stroke='#a43ef7' stroke-width='3'/>\n  <text x='${size / 2}' y='${Math.floor(size / 2 + 5)}' font-family='Arial, Helvetica, sans-serif' font-weight='700' font-size='12' text-anchor='middle' fill='#111'>${safeCode}</text>\n</svg>`;
                                    return {
                                        url: 'data:image/svg+xml;utf8,' + encodeURIComponent(svg),
                                        scaledSize: new google.maps.Size(size, size),
                                        anchor: new google.maps.Point(size / 2, size / 2),
                                    } as google.maps.Icon;
                                };

                                // add markers only for intermediate hops (exclude start & selected positions)
                                const intermediates = hopInfos.filter((info) => {
                                    const p = { lat: info.lat, lng: info.lng } as google.maps.LatLngLiteral;
                                    return !near(p, startPos) && !near(p, selectedPos);
                                });

                                if (intermediates.length > 0) {
                                    intermediates.forEach((info) => {
                                        const pos = { lat: info.lat, lng: info.lng } as google.maps.LatLngLiteral;
                                        const code = (info.code || "").toString().toUpperCase().slice(0, 5);
                                        const icon = createAirportIcon(code, 34);
                                        try {
                                            const hopMarker = new google.maps.Marker({
                                                position: pos,
                                                map: mapRef.current!,
                                                icon,
                                                clickable: false,
                                                zIndex: 1000,
                                            });
                                            hopMarkersRef.current.push(hopMarker);
                                        } catch (e) {
                                            // ignore marker creation failures
                                        }
                                    });
                                }
                            }
                        } else {
                            path = isZurichGeneva
                                ? [startPos, selectedPos]
                                : computeArcPoints(startPos, selectedPos, 80, 0.25);
                        }
                    } catch (e) {
                        // on any error fall back to previous behavior
                        path = isZurichGeneva
                            ? [startPos, selectedPos]
                            : computeArcPoints(startPos, selectedPos, 80, 0.25);
                    }

                    const polyline = new google.maps.Polyline({
                        path,
                        // When drawing multiple hops, allow geodesic segments between hops
                        geodesic: false,
                        strokeColor: "#a43ef7",
                        strokeOpacity: 0.9,
                        strokeWeight: 5.0,
                        map: mapRef.current!,
                    });

                    // Attach a hover tooltip to the polyline showing start info, attendee count and total cost
                    // Ensure an InfoWindow exists to reuse for hover tooltips
                    if (!infoWindowRef.current) {
                        infoWindowRef.current = new google.maps.InfoWindow({ maxWidth: 560, headerDisabled: true });
                    }

                    // prepare values for tooltip
                    const showTooltip = (evt: google.maps.MapMouseEvent | google.maps.IconMouseEvent | undefined) => {
                        if (!evt || !evt.latLng || !infoWindowRef.current) return;
                        const content = renderToString(
                            <PolylineTooltip start={start} selected={selected} />
                        );
                        infoWindowRef.current.setContent(content);
                        infoWindowRef.current.setPosition(evt.latLng);
                        infoWindowRef.current.open({ map: mapRef.current });
                    };

                    const hideTooltip = () => {
                        if (infoWindowRef.current) infoWindowRef.current.close();
                    };

                    polyline.addListener("mouseover", (evt: google.maps.MapMouseEvent) => showTooltip(evt));
                    polyline.addListener("mousemove", (evt: google.maps.MapMouseEvent) => showTooltip(evt));
                    polyline.addListener("mouseout", () => hideTooltip());

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
            hopMarkersRef.current.forEach((m) => m.setMap(null));
            hopMarkersRef.current = [];
        };
    }, [selectedId, locations, startingLocations]);

    return (
        <div className="fixed inset-0">
            <div ref={mapEl} className="h-full w-full" style={{ height: "100dvh", width: "100vw" }} />
        </div>
    );
}

