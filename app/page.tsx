"use client";

import { FullscreenMap } from "./FullScreenMap";
import { useLocations } from "./LocationsContext";
import { useState, useEffect } from "react";
import officies from "../officies.json";

export default function Home() {
  const { locations, selectedId, setStartingLocations, setLocations, setSelectedId } = useLocations();
  const [showSetup, setShowSetup] = useState(false);

  // local UI state to orchestrate animations when opening/closing details
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [detailsClosing, setDetailsClosing] = useState(false);

  // modal input state
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState<string | null>(null);

  // when selectedId changes, show details panel; clearing selectedId hides it
  useEffect(() => {
    if (selectedId) {
      // appear
      setDetailsClosing(false);
      setDetailsVisible(true);
    } else {
      // if selection cleared externally, ensure states reset
      setDetailsVisible(false);
      setDetailsClosing(false);
    }
  }, [selectedId]);

  return (
    <div className="w-screen h-screen bg-background relative ">
      <FullscreenMap />

      {/* Setup meeting button top-left */}
      <div className="absolute top-8 left-8">
        <button
          onClick={() => {
            setError(null);
            setJsonText("");
            setShowSetup(true);
          }}
          className="px-3 py-2 rounded bg-sky-600 text-white text-sm shadow"
        >
          Setup meeting
        </button>
      </div>

      {/* Modal: paste JSON to load into context */}
      {showSetup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center text-black">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowSetup(false)} />
          <div className="relative w-[min(90vw,700px)] bg-white rounded shadow-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-lg font-semibold">Setup meeting JSON</div>
              <button className="text-sm text-gray-500" onClick={() => setShowSetup(false)}>✕</button>
            </div>

            <div className="mb-2">
              <div className="text-xs text-gray-600 mb-1">Paste an array of starting locations (or an object containing a startingLocations array)</div>
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                className="w-full h-40 border p-2 text-xs"
                placeholder='e.g. [{"name":"Office","coordinates":[51.5,-0.1],"numAttendees":3}]'
              />
              {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowSetup(false)}
                className="px-3 py-1 rounded border text-sm"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setError(null);
                  try {
                    const parsed = JSON.parse(jsonText);

                    // If input is already an array of starting locations, use it
                    if (Array.isArray(parsed)) {
                      const ok = parsed.every((it: any) => it && typeof it.name === "string" && Array.isArray(it.coordinates) && it.coordinates.length === 2);
                      if (!ok) {
                        setError("Each starting location must have a `name` (string) and `coordinates` ([lat, lng]).");
                        return;
                      }
                      const shaped = parsed.map((it: any) => ({
                        name: it.name,
                        coordinates: [Number(it.coordinates[0]), Number(it.coordinates[1])] as [number, number],
                        numAttendees: Number(it.numAttendees) || 0,
                      }));
                      setStartingLocations(shaped);
                      setShowSetup(false);
                      return;
                    }

                    // If object contains startingLocations/startLocations arrays, use them
                    if (parsed && Array.isArray(parsed.startingLocations || parsed.startLocations)) {
                      const arr = parsed.startingLocations || parsed.startLocations;
                      const ok = arr.every((it: any) => it && typeof it.name === "string" && Array.isArray(it.coordinates) && it.coordinates.length === 2);
                      if (!ok) {
                        setError("Each starting location must have a `name` (string) and `coordinates` ([lat, lng]).");
                        return;
                      }
                      const shaped = arr.map((it: any) => ({
                        name: it.name,
                        coordinates: [Number(it.coordinates[0]), Number(it.coordinates[1])] as [number, number],
                        numAttendees: Number(it.numAttendees) || 0,
                      }));
                      setStartingLocations(shaped);
                      setShowSetup(false);
                      return;
                    }

                    // If object contains attendees map, derive starting locations using officies.json
                    if (parsed && parsed.attendees && typeof parsed.attendees === "object") {
                      const attendeesByCity = parsed.attendees as Record<string, any>;
                      const cities = Object.keys(attendeesByCity);
                      const shaped = cities
                        .map((city) => {
                          const office = (officies as any)[city];
                          if (!office) return null; // skip cities without office coordinates
                          const num = Array.isArray(attendeesByCity[city]) ? attendeesByCity[city].length : Number(attendeesByCity[city]) || 0;
                          return {
                            name: city,
                            coordinates: [Number(office.lat), Number(office.long)] as [number, number],
                            numAttendees: num,
                          };
                        })
                        .filter(Boolean) as any[];

                      if (shaped.length === 0) {
                        setError("No valid cities with office coordinates were found in `attendees`. Check city names match officies.json keys.");
                        return;
                      }

                      // Set starting locations locally
                      setStartingLocations(shaped);

                      // Send payload to /api/round and load response into locations context
                      try {
                        const res = await fetch("/api/round", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(parsed),
                        });
                        if (!res.ok) {
                          const txt = await res.text();
                          setError(`Round API error: ${res.status} ${txt}`);
                          return;
                        }

                        const roundResp = await res.json();
                        if (!Array.isArray(roundResp)) {
                          setError("Round response was not an array of locations.");
                          return;
                        }

                        const newLocs = roundResp.map((feat: any, i: number) => ({ id: String(i), ...feat }));
                        setLocations(newLocs);
                        setShowSetup(false);
                        return;
                      } catch (err: any) {
                        setError(String(err?.message ?? err));
                        return;
                      }
                    }

                    setError("JSON must be an array, an object with a `startingLocations` array, or an object with an `attendees` map.");
                  } catch (e: any) {
                    setError(String(e?.message ?? e));
                  }
                }}
                className="px-3 py-1 rounded bg-sky-600 text-white text-sm"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* If no locations loaded yet, hide location box */}
      {locations.length === 0 ? null :
        <div
          id="locations_box"
          // animate off-screen left when detailsVisible is true
          style={{
            transform: detailsVisible && !detailsClosing ? "translateX(-120%)" : "translateX(0)",
            transition: "transform 320ms ease-in-out",
          }}
          className="absolute top-8 right-8 max-h-[80vh] w-1/5 overflow-auto p-2 pt-4 backdrop-blur-2xl rounded-xl shadow-lg flex flex-col items-center "
        >
          <p className="font-bold text-3xl text-shadow-xs mb-8">Suggested Locations</p>
          {locations.map((loc) => (
            <LocationListItem key={loc.event_location + loc.event_dates.start} loc={loc} />
          ))}
        </div>
      }

      {/* Details modal: slides in from right when a location is selected */}
      {/**
       * We keep the details panel mounted while animating out so we can play
       * a smooth reverse animation. When user presses Back we set
       * `detailsClosing` to true and after the animation completes we actually
       * clear the selectedId which unmounts the panel.
       */}
      <div
        className="fixed inset-0 z-60 pointer-events-none"
      // container used to position the right panel
      >

        <div
          // panel entry/exit animation: slide from right
          style={{
            transform: detailsVisible && !detailsClosing ? "translateX(0)" : "translateX(120%)",
            transition: "transform 320ms ease-in-out",
          }}
          className="absolute top-8 right-8 w-1/5 max-h-[80vh] overflow-auto p-2 pt-4 backdrop-blur-2xl rounded-xl shadow-lg pointer-events-auto"
        >
          <DetailsModal onClose={() => {
            // trigger closing animation then clear selection
            setDetailsClosing(true);
            setTimeout(() => {
              setDetailsClosing(false);
              setDetailsVisible(false);
              setSelectedId(null);
            }, 320);
          }} closing={detailsClosing} />
        </div>
      </div>
    </div>
  );
}

// --- Date helpers: parse and format consistently across components ---
function parseDate(s: any): Date | null {
  if (!s) return null;
  try {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  } catch (e) {
    return null;
  }
}

function ordinalSuffix(n: number) {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return `${n}st`;
  if (j === 2 && k !== 12) return `${n}nd`;
  if (j === 3 && k !== 13) return `${n}rd`;
  return `${n}th`;
}

/**
 * Format a Date as: "12th September 2205 4:05 PM"
 * If includeYear is false, the year is omitted: "12th September 4:05 PM"
 */
function formatDateTimeNice(d: Date, includeYear = true) {
  const day = ordinalSuffix(d.getDate());
  // Use English month long name to match example
  const month = d.toLocaleString("en-GB", { month: "long" });
  const year = d.getFullYear();
  const hour24 = d.getHours();
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hour24 >= 12 ? "PM" : "AM";
  return includeYear
    ? `${day} ${month} ${year} ${hour12}:${minutes} ${ampm}`
    : `${day} ${month} ${hour12}:${minutes} ${ampm}`;
}

function formatTimeOnly(d: Date) {
  const hour24 = d.getHours();
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hour24 >= 12 ? "PM" : "AM";
  return `${hour12}:${minutes} ${ampm}`;
}

function formatDateOnly(d: Date, includeYear = true) {
  const day = ordinalSuffix(d.getDate());
  const month = d.toLocaleString("en-GB", { month: "long" });
  return includeYear ? `${day} ${month} ${d.getFullYear()}` : `${day} ${month}`;
}

function LocationListItem({ loc }: { loc: any }) {
  const { selectedId, setSelectedId } = useLocations();
  const isSelected = selectedId === loc.id;

  // try to pick event start/end from common shapes
  const rawStart = loc?.event_dates?.start ?? loc?.start ?? loc?.event_span?.start ?? null;
  const rawEnd = loc?.event_dates?.end ?? loc?.end ?? loc?.event_span?.end ?? null;
  const startDate = parseDate(rawStart);
  const endDate = parseDate(rawEnd);

  const fmtDateTimeNoSeconds = (d: Date, includeYear: boolean) => formatDateTimeNice(d, includeYear);
  const fmtDateOnly = (d: Date, includeYear: boolean) => formatDateOnly(d, includeYear);
  const fmtTimeNoSeconds = (d: Date) => formatTimeOnly(d);

  const eventLine = (() => {
    // no dates
    if (!startDate && !endDate) return "N/A";
    // single side only
    if (startDate && !endDate) return fmtDateTimeNoSeconds(startDate, true);
    if (!startDate && endDate) return fmtDateTimeNoSeconds(endDate, true);

    // both exist
    if (startDate!.getTime() === endDate!.getTime()) {
      // identical timestamps -> show once without seconds; if both in same year omit year
      const sameYear = startDate!.getFullYear() === endDate!.getFullYear();
      return fmtDateTimeNoSeconds(startDate!, !sameYear ? true : false);
    }

    // same calendar day -> show date once and a time range (no seconds)
    if (
      startDate!.getFullYear() === endDate!.getFullYear() &&
      startDate!.getMonth() === endDate!.getMonth() &&
      startDate!.getDate() === endDate!.getDate()
    ) {
      // years equal -> show date without year once, otherwise show date with year
      const sameYear = startDate!.getFullYear() === endDate!.getFullYear();
      const dateStr = fmtDateOnly(startDate!, !sameYear ? true : false);
      return `${dateStr} ${fmtTimeNoSeconds(startDate!)} — ${fmtTimeNoSeconds(endDate!)}`;
    }

    // different days -> full datetimes without seconds; if years are same use DD/MM for dates
    const sameYear = startDate!.getFullYear() === endDate!.getFullYear();
    return `${fmtDateTimeNoSeconds(startDate!, !sameYear ? true : false)} — ${fmtDateTimeNoSeconds(endDate!, !sameYear ? true : false)}`;
  })();

  const office = (officies as any)[loc.event_location];

  return (
    <button
      type="button"
      onClick={() => setSelectedId(loc.id)}
      className={`text-left shadow-xs w-full cursor-pointer rounded-xl p-4 py-2 border ${isSelected ? "bg-sky-100 border-sky-300" : "bg-white border-gray-100"}`}
    >
      <div className="text-lg font-bold text-black">{loc.event_location}{" - QRT Office"}</div>
      <div className="text-xs text-gray-600">{(office.line1) + (office.postcode ? ", " + office.postcode : "")}</div>
      <div className="text-base text-gray-800  mt-1">{eventLine}</div>
      <div className="flex justify-between text-xs text-gray-500 mt-4">

        <div className="">{loc.total_co2 != null ? loc.total_co2.toFixed(2) + " kg" : "N/A"} {"CO₂"}</div>
        <div className="">
          {" | "}
        </div>
        <div className="">Avg. travel: {loc.average_travel_hours != null ? loc.average_travel_hours.toFixed(2) + " hrs" : "N/A"}</div>
        <div className="">
          {" | "}
        </div>
        {/* Event span (duration = end - start) */}
        <div className="">{
          (() => {
            const rawSpanStart = loc?.event_span?.start ?? loc?.span_start ?? null;
            const rawSpanEnd = loc?.event_span?.end ?? loc?.span_end ?? null;
            const spanStart = parseDate(rawSpanStart);
            const spanEnd = parseDate(rawSpanEnd);

            if (!spanStart || !spanEnd) return "Total Span: N/A";

            let diff = spanEnd.getTime() - spanStart.getTime();
            const negative = diff < 0;
            diff = Math.abs(diff);

            const days = Math.floor(diff / (24 * 60 * 60 * 1000));
            const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
            if (days > 0) return `Total Span: ${negative ? "-" : ""}${days}d ${hours}h`;
            if (hours > 0) return `Total Span: ${negative ? "-" : ""}${hours}h`;
            const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
            return `Total Span: ${negative ? "-" : ""}${mins}m`;
          })()
        }</div>
      </div>
    </button>
  );
}

function DetailsModal({ onClose, closing }: { onClose: () => void; closing?: boolean }) {
  const { locations, selectedId } = useLocations();
  const loc = locations.find((l) => l.id === selectedId);



  if (!loc) return null;

  const office = (officies as any)[loc.event_location];

  const _rawStart = loc?.event_dates?.start ?? loc?.start ?? null;
  const _rawEnd = loc?.event_dates?.end ?? loc?.end ?? null;
  const ds = parseDate(_rawStart);
  const de = parseDate(_rawEnd);
  const ss = parseDate(loc?.event_span?.start ?? null);
  const se = parseDate(loc?.event_span?.end ?? null);

  return (
    <div className="flex flex-col gap-2 p ">
      <div className="flex items-center justify-between mb-7">
        <button
          onClick={onClose}
          className="text-sm text-sky-600 hover:underline bg-white rounded-full px-2 py-1 flex items-center"
        >
          {"< Back"}
        </button>
        <div className=" flex-1 text-center text-xl text-white font-bold text-shadow-xs">{loc.event_location}</div>
      </div>

      <div className="bg-white rounded-xl p-4 py-2">
        <div className="pt-1">
          <div className="text-base font-semibold text-black mb-2">{"Address"}</div>
          <div className="text-sm text-gray-700">{office.line1}</div>
          <div className="text-sm text-gray-700">{`${office.postcode}, ${office.town}`}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 py-2">
        <div className="pt-1">
          <div className="text-base font-semibold text-black mb-2">{"Schedule"}</div>
          <div className="grid grid-cols-[auto_auto]">
            <div className="text-sm text-gray-700 font-bold">{"Event Start "} </div>
            <div className="ml-auto text-gray-600"> {ds ? formatDateTimeNice(ds, true) : (loc.event_dates?.start ?? "N/A")}</div>
            <div className="text-sm text-gray-700 font-bold">{"Event End "} </div>
            <div className=" mb-4 ml-auto text-gray-600"> {de ? formatDateTimeNice(de, true) : (loc.event_dates?.end ?? "N/A")}</div>
            <div className="text-sm text-gray-700 font-bold">{"Span Start "} </div>
            <div className="ml-auto text-gray-600"> {ss ? formatDateTimeNice(ss, true) : (loc.event_span?.start ?? "N/A")}</div>
            <div className="text-sm text-gray-700 font-bold">{"Span End "} </div>
            <div className="ml-auto text-gray-600"> {se ? formatDateTimeNice(se, true) : (loc.event_span?.end ?? "N/A")}</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 py-2">
        <div className="pt-1">
          <div className="text-base font-semibold text-black mb-2">{"Total Carbon Dioxide Emissions"}</div>

          <div className="text-2xl w-fit ml-auto text-gray-700">{loc.total_co2 != null ? loc.total_co2.toFixed(2) + " kg CO₂" : "N/A"}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 py-2">
        <div className="pt-1">
          <div className="text-base font-semibold text-black mb-2">{"Travelers"}</div>
          {/* {loc.} */}
        </div>
      </div>
    </div>
  );
}
