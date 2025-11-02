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
    const isZurichGeneva = (startName === "Zurich" && selectedName === "Geneva" ) || (startName === "Geneva" && selectedName === "Zurich");
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
                    }},
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
                    console.log(office);

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

                    // compute arc (always bulging north) unless this is the special-case
                    const path = isZurichGeneva
                        ? [startPos, selectedPos]
                        : computeArcPoints(startPos, selectedPos, 80, 0.25);

                    const polyline = new google.maps.Polyline({
                        path,
                        // keep as straight segment for Zurich->Geneva special case
                        geodesic: false,
                        strokeColor: "#a43ef7",
                        strokeOpacity: 0.9,
                        strokeWeight: 5.0,
                        map: mapRef.current!,
                    });
                    console.log(start.numAttendees)

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
        };
    }, [selectedId, locations, startingLocations]);

    return (
        <div className="fixed inset-0">
            <div ref={mapEl} className="h-full w-full" style={{ height: "100dvh", width: "100vw" }} />
        </div>
    );
}

