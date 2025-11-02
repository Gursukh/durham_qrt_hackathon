"use client";

import { FullscreenMap } from "./FullScreenMap";
import { useLocations } from "./LocationsContext";
import React, { useState, useEffect } from "react";
import officies from "../officies.json";
import DetailsModal from "./DetailsModel";
import { ordinalSuffix, parseDate, formatDateTimeNice, formatTimeOnly } from "./dateutils";

export default function Home() {
  const { locations, selectedId, setStartingLocations, setLocations, setSelectedId, setEventDuration, setAvailabilityWindow } = useLocations();
  const [showSetup, setShowSetup] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showSetupButton, setShowSetupButton] = useState(true);
  const [lastSetupJson, setLastSetupJson] = useState<any>(null);

  // local UI state to orchestrate animations when opening/closing details
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [detailsClosing, setDetailsClosing] = useState(false);

  // modal input state
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState<string | null>(null);
  // input mode: paste JSON or use form UI
  const [inputMode, setInputMode] = useState<"json" | "form">("json");
  // form state for manual input (name + optional attendee count). Coordinates are derived from `officies.json` when submitted.
  const [formLocations, setFormLocations] = useState<Array<{ name: string; numAttendees?: number }>>([
    { name: "", numAttendees: 0 },
  ]);
  const [formEventDuration, setFormEventDuration] = useState<{ days?: number; hours?: number; minutes?: number }>({});
  const [formAvailability, setFormAvailability] = useState<{ start?: string; end?: string }>({});
  const MAX_LOCATIONS = 13;

  // helper to format stored availability strings into a value acceptable by
  // <input type="datetime-local" /> which expects "YYYY-MM-DDTHH:MM" (no timezone)
  const availabilityToInput = (s?: string) => {
    if (!s) return "";
    try {
      const d = parseDate(s);
      if (!d) return "";
      // Convert to local YYYY-MM-DDTHH:MM
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const hour = String(d.getHours()).padStart(2, "0");
      const minute = String(d.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day}T${hour}:${minute}`;
    } catch (e) {
      return "";
    }
  };

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
      {showSetupButton && (
        <div className="absolute top-8 left-8">
          <button
            onClick={() => {
              setError(null);
              setJsonText("");
              setShowSetup(true);
            }}
            className="px-4 py-2 rounded-xl bg-sky-600 text-white text-2xl font-semibold"
          >
            Setup meeting
          </button>
        </div>
      )}

      {/* Modal: paste JSON to load into context */}
      {showSetup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center text-black backdrop-blur-md">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowSetup(false)} />
          <div className="relative w-[min(90vw,700px)] bg-white rounded-xl shadow-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-lg font-semibold">Setup meeting JSON</div>
              <button className="text-sm text-gray-500" onClick={() => setShowSetup(false)}>✕</button>
            </div>

            <div className="mb-2">
              <div className="flex gap-2 mb-2">
                <button
                  className={`px-3 py-1 rounded ${inputMode === "json" ? "bg-sky-600 text-white" : "border text-sm"}`}
                  onClick={() => setInputMode("json")}
                >
                  Paste JSON
                </button>
                <button
                  className={`px-3 py-1 rounded ${inputMode === "form" ? "bg-sky-600 text-white" : "border text-sm"}`}
                  onClick={() => setInputMode("form")}
                >
                  Fill form
                </button>
              </div>
              <div className="text-xs text-gray-600 mb-1">Paste an array of starting locations (or an object containing a startingLocations array)</div>
              {inputMode === "json" ? (
                <textarea
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  className="w-full h-40 border p-2 text-xs"
                  placeholder='e.g. [{"name":"Office","coordinates":[51.5,-0.1],"numAttendees":3}]'
                />
              ) : (
                <div className="w-full border p-2 text-xs space-y-2 bg-gray-50 rounded">
                  <div className="font-medium">Starting locations <span className="text-xs text-gray-500">({formLocations.length}/{MAX_LOCATIONS})</span></div>
                  <div className="grid grid-cols-2 gap-2">
                    {formLocations.map((loc, idx) => (
                      <div key={idx} className="p-2 border rounded bg-white flex items-center justify-between gap-2">
                        <select
                          className="flex-1 border px-2 py-1 text-xs"
                          value={loc.name ?? ""}
                          onChange={(e) => {
                            const copy = [...formLocations];
                            copy[idx] = { ...copy[idx], name: e.target.value };
                            setFormLocations(copy);
                          }}
                        >
                          <option value="">-- select office --</option>
                          {
                            // compute options that aren't already selected by other rows
                            Object.keys(officies)
                              .filter((k) => !formLocations.some((f, i2) => i2 !== idx && f.name === k))
                              .map((k) => (
                                <option key={k} value={k}>{k}</option>
                              ))
                          }
                        </select>
                        <input
                          className="w-20 border px-2 py-1 text-xs"
                          placeholder="#"
                          value={String(loc.numAttendees ?? 0)}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            const copy = [...formLocations];
                            copy[idx] = { ...copy[idx], numAttendees: isNaN(v) ? 0 : Math.max(0, Math.floor(v)) };
                            setFormLocations(copy);
                          }}
                        />
                        <button
                          className="px-2 py-1 text-xs border rounded"
                          onClick={() => {
                            const copy = [...formLocations];
                            copy.splice(idx, 1);
                            setFormLocations(copy.length ? copy : [{ name: "", numAttendees: 0 }]);
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  <div>
                    <button
                      className={`px-3 py-1 rounded ${formLocations.length >= MAX_LOCATIONS ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-xs'}`}
                      onClick={() => {
                        if (formLocations.length >= MAX_LOCATIONS) return;
                        setFormLocations([...formLocations, { name: "", numAttendees: 0 }]);
                      }}
                      disabled={formLocations.length >= MAX_LOCATIONS}
                    >
                      + Add location
                    </button>
                    <button
                      className="ml-2 px-3 py-1 rounded bg-gray-200 text-xs"
                      onClick={() => {
                        // populate with all offices from officies.json
                        const all = Object.keys(officies).map((k) => ({ name: k, numAttendees: 0 }));
                        // cap to MAX_LOCATIONS
                        const capped = all.slice(0, MAX_LOCATIONS);
                        setFormLocations(capped.length ? capped : [{ name: "", numAttendees: 0 }]);
                      }}
                    >
                      Use all offices
                    </button>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-xs font-medium">Event duration</div>
                      <div className="grid grid-cols-[2fr_1fr_1fr] w-full gap-2 mt-1">
                        <input className="border px-2 py-1 text-xs w-full" placeholder="days" value={String(formEventDuration.days ?? "")} onChange={(e) => setFormEventDuration({ ...formEventDuration, days: e.target.value === "" ? undefined : Number(e.target.value) })} />
                        <input className="border px-2 py-1 text-xs w-full" placeholder="hours" value={String(formEventDuration.hours ?? "")} onChange={(e) => setFormEventDuration({ ...formEventDuration, hours: e.target.value === "" ? undefined : Number(e.target.value) })} />
                        <input className="border px-2 py-1 text-xs w-full" placeholder="minutes" value={String(formEventDuration.minutes ?? "")} onChange={(e) => setFormEventDuration({ ...formEventDuration, minutes: e.target.value === "" ? undefined : Number(e.target.value) })} />
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-medium">Availability window</div>
                      <div className="flex flex-col mt-1 text-xs">
                        <input
                          type="datetime-local"
                          className="border px-2 py-1 mb-1"
                          placeholder="start"
                          value={availabilityToInput(formAvailability.start)}
                          onChange={(e) => setFormAvailability({ ...formAvailability, start: e.target.value })}
                        />
                        <input
                          type="datetime-local"
                          className="border px-2 py-1"
                          placeholder="end"
                          value={availabilityToInput(formAvailability.end)}
                          onChange={(e) => setFormAvailability({ ...formAvailability, end: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
                  setIsProcessing(true);
                  setSelectedId(null); // clear any existing selection
                  try {
                    // construct parsed input depending on selected mode
                    let parsed: any = null;
                    if (inputMode === "json") {
                      parsed = JSON.parse(jsonText);
                    } else {
                      // build object from form state; derive coordinates from officies.json where possible
                      // For availability window, convert datetime-local strings to full ISO timestamps
                      const avail = {
                        start: formAvailability.start ? new Date(formAvailability.start).toISOString() : undefined,
                        end: formAvailability.end ? new Date(formAvailability.end).toISOString() : undefined,
                      };

                      // Validate that the event duration fits inside the availability window
                      try {
                        if (avail.start && avail.end) {
                          const s = new Date(avail.start);
                          const e = new Date(avail.end);
                          const windowMs = e.getTime() - s.getTime();
                          if (isNaN(windowMs) || windowMs <= 0) {
                            setError("Availability window must have a valid start and end where end is after start.");
                            setIsProcessing(false);
                            return;
                          }

                          const days = Number(formEventDuration.days) || 0;
                          const hours = Number(formEventDuration.hours) || 0;
                          const minutes = Number(formEventDuration.minutes) || 0;
                          const durMs = ((days * 24 + hours) * 60 + minutes) * 60 * 1000;

                          if (durMs > 0 && durMs > windowMs) {
                            setError("Event duration is longer than the availability window. Shorten the duration or extend the availability window.");
                            setIsProcessing(false);
                            return;
                          }
                        }
                      } catch (err) {
                        // If anything goes wrong parsing dates, bail with an error
                        setError("Unable to validate availability window / event duration. Check date inputs.");
                        setIsProcessing(false);
                        return;
                      }

                      parsed = {
                        startingLocations: formLocations.map((it) => {
                          const office = (officies as any)[it.name];
                          const coords = office ? ([Number(office.lat), Number(office.long)] as [number, number]) : ([0, 0] as [number, number]);
                          return { name: it.name, coordinates: coords, numAttendees: Number(it.numAttendees) || 0 };
                        }),
                        event_duration: formEventDuration,
                        availability_window: avail,
                      };
                    }

                    // If input is already an array of starting locations, use it
                    if (Array.isArray(parsed)) {
                      const ok = parsed.every((it: any) => it && typeof it.name === "string" && Array.isArray(it.coordinates) && it.coordinates.length === 2);
                      if (!ok) {
                        setError("Each starting location must have a `name` (string) and `coordinates` ([lat, lng]).");
                        setIsProcessing(false);
                        return;
                      }
                      const shaped = parsed.map((it: any) => ({
                        name: it.name,
                        coordinates: [Number(it.coordinates[0]), Number(it.coordinates[1])] as [number, number],
                        numAttendees: Number(it.numAttendees) || 0,
                      }));
                      setStartingLocations(shaped);
                      // store what was submitted and show summary modal
                      setLastSetupJson(parsed);
                      setShowSetup(false);
                      setShowSummaryModal(true);
                      setShowSetupButton(false);
                      setIsProcessing(false);
                      return;
                    }

                    // If parsed is an object, capture optional event metadata (duration / availability window)
                    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                      // support snake_case and camelCase keys
                      const dur = parsed.event_duration || parsed.eventDuration || null;
                      const avail = parsed.availability_window || parsed.availabilityWindow || null;
                      if (dur && typeof setEventDuration === "function") {
                        try {
                          // coerce numeric fields where present
                          setEventDuration({ days: Number(dur.days) || 0, hours: Number(dur.hours) || 0, minutes: dur.minutes != null ? Number(dur.minutes) : undefined });
                        } catch (e) {
                          // ignore malformed duration
                        }
                      }
                      if (avail && typeof setAvailabilityWindow === "function") {
                        try {
                          setAvailabilityWindow({ start: String(avail.start), end: String(avail.end) });
                        } catch (e) {
                          // ignore malformed availability
                        }
                      }
                    }

                    // If object contains startingLocations/startLocations arrays, use them
                    if (parsed && Array.isArray(parsed.startingLocations || parsed.startLocations)) {
                      const arr = parsed.startingLocations || parsed.startLocations;
                      const ok = arr.every((it: any) => it && typeof it.name === "string" && Array.isArray(it.coordinates) && it.coordinates.length === 2);
                      if (!ok) {
                        setError("Each starting location must have a `name` (string) and `coordinates` ([lat, lng]).");
                        setIsProcessing(false);
                        return;
                      }
                      const shaped = arr.map((it: any) => ({
                        name: it.name,
                        coordinates: [Number(it.coordinates[0]), Number(it.coordinates[1])] as [number, number],
                        numAttendees: Number(it.numAttendees) || 0,
                      }));
                      // Always set starting locations locally
                      setStartingLocations(shaped);

                      // If this came from the form UI, POST the parsed payload to /api/round
                      if (inputMode === "form") {
                        try {
                          const res = await fetch("/api/round", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(parsed),
                          });
                          if (!res.ok) {
                            const txt = await res.text();
                            setError(`Round API error: ${res.status} ${txt}`);
                            setIsProcessing(false);
                            return;
                          }

                          const roundResp = await res.json();
                          if (!Array.isArray(roundResp)) {
                            setError("Round response was not an array of locations.");
                            setIsProcessing(false);
                            return;
                          }

                          const newLocs = roundResp.map((feat: any, i: number) => ({ id: String(i), ...feat }));
                          setLocations(newLocs);
                          // store original parsed input for summary modal
                          setLastSetupJson(parsed);
                          setShowSetup(false);
                          setShowSummaryModal(true);
                          setShowSetupButton(false);
                          setIsProcessing(false);
                          return;
                        } catch (err: any) {
                          setError(String(err?.message ?? err));
                          setIsProcessing(false);
                          return;
                        }
                      }

                      // Otherwise (not form mode) just show the summary modal locally
                      setLastSetupJson(parsed);
                      setShowSetup(false);
                      setShowSummaryModal(true);
                      setShowSetupButton(false);
                      setIsProcessing(false);
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
                        setIsProcessing(false);
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
                          setIsProcessing(false);
                          return;
                        }

                        const roundResp = await res.json();
                        if (!Array.isArray(roundResp)) {
                          setError("Round response was not an array of locations.");
                          setIsProcessing(false);
                          return;
                        }

                        const newLocs = roundResp.map((feat: any, i: number) => ({ id: String(i), ...feat }));
                        setLocations(newLocs);
                        // store original parsed input for summary modal
                        setLastSetupJson(parsed);
                        setShowSetup(false);
                        setShowSummaryModal(true);
                        setShowSetupButton(false);
                        setIsProcessing(false);
                        return;
                      } catch (err: any) {
                        setError(String(err?.message ?? err));
                        setIsProcessing(false);
                        return;
                      }
                    }

                    setError("JSON must be an array, an object with a `startingLocations` array, or an object with an `attendees` map.");
                    setIsProcessing(false);
                  } catch (e: any) {
                    setError(String(e?.message ?? e));
                    setIsProcessing(false);
                  }
                }}
                className="px-3 py-1 rounded bg-sky-600 text-white text-sm"
                disabled={isProcessing}
              >
                {isProcessing ? "Loading..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary modal that replaces the setup button after successful confirm */}
      {showSummaryModal && (
        <div className="absolute top-8 w-fit left-8 backdrop-blur-2xl rounded-xl shadow-sm  p-4">
          <div className="mx-auto text-center font-bold text-3xl text-shadow-xs mb-8">Meeting Setup</div>
          <div className="bg-white p-3 rounded-xl">
            {lastSetupJson == null ? (
              <div className="text-sm text-gray-600">No setup data available.</div>
            ) : Array.isArray(lastSetupJson) ? (
              <div className="text-sm text-gray-700">
                <div className="font-semibold mb-2">Starting locations</div>
                <ul className="list-disc list-inside text-xs space-y-1 max-h-44 overflow-auto">
                  {lastSetupJson.map((it: any, i: number) => (
                    <React.Fragment key={i}>
                      <span className="font-medium">{it.name || `Location ${i + 1}`}</span>
                      {it.numAttendees != null ? <span className="text-gray-500"> — {it.numAttendees} attendees</span> : null}
                      {Array.isArray(it.coordinates) ? (
                        <div className="text-gray-500 text-xs">{Number(it.coordinates[0]).toFixed(5)}, {Number(it.coordinates[1]).toFixed(5)}</div>
                      ) : null}
                    </React.Fragment>
                  ))}
                </ul>
              </div>
            ) : lastSetupJson.attendees && typeof lastSetupJson.attendees === "object" ? (
              <div className="text-sm text-gray-700">
                <div className="font-semibold mb-2 text-lg">Attendees by city</div>
                <ul className="grid grid-cols-2 text-md space-y-1 max-h-44 overflow-auto">
                  {Object.entries(lastSetupJson.attendees).map(([city, v]: any, i) => {
                    const count = Array.isArray(v) ? v.length : Number(v) || 0;
                    return (
                      <React.Fragment key={i}>
                        <span className="font-medium">{city}</span>
                        <span className="text-gray-500">{count} attendees</span>
                      </React.Fragment>
                    );
                  })}
                </ul>
              </div>
            ) : Array.isArray(lastSetupJson.startingLocations || lastSetupJson.startLocations) ? (
              <div className="text-sm text-gray-700">
                <div className="font-semibold mb-2">Starting locations</div>
                <ul className="list-disc list-inside text-base space-y-1 max-h-44 overflow-auto">
                  {(lastSetupJson.startingLocations || lastSetupJson.startLocations).map((it: any, i: number) => (
                    <li key={i}>
                      <span className="font-medium">{it.name || `Location ${i + 1}`}</span>
                      {it.numAttendees != null ? <span className="text-gray-500"> — {it.numAttendees} attendees</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="text-xs text-gray-600">{JSON.stringify(lastSetupJson).slice(0, 600)}</div>
            )}

            {/* Event metadata (if provided) */}
            {lastSetupJson && (lastSetupJson.event_duration || lastSetupJson.eventDuration) ? (
              <div className="mt-3 text-base text-gray-700">
                <div className="font-semibold">Event duration</div>
                <div className="text-base text-gray-600">{formatEventDuration(lastSetupJson.event_duration || lastSetupJson.eventDuration) ?? JSON.stringify(lastSetupJson.event_duration || lastSetupJson.eventDuration)}</div>
              </div>
            ) : null}

            {lastSetupJson && (lastSetupJson.availability_window || lastSetupJson.availabilityWindow) ? (
              <div className="mt-2 text-sm text-gray-700">
                <div className="font-semibold">Availability window</div>
                <div className="text-sm text-gray-600">{formatAvailabilityWindow(lastSetupJson.availability_window || lastSetupJson.availabilityWindow)}</div>
              </div>
            ) : null}

            <div className="flex gap-2 justify-end mt-4 text-black">
              <button
                className="px-3 py-1 rounded border text-sm"
                onClick={() => {
                  // re-open setup for editing
                  setShowSummaryModal(false);
                  setShowSetup(true);
                  setShowSetupButton(true);
                }}
              >
                Edit
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
          className="absolute top-8 right-8 w-1/5 max-h-[95vh] overflow-auto p-2 pt-4 backdrop-blur-2xl rounded-xl shadow-lg pointer-events-auto"
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



function formatDateOnly(d: Date, includeYear = true) {
  const day = ordinalSuffix(d.getDate());
  const month = d.toLocaleString("en-GB", { month: "long" });
  return includeYear ? `${day} ${month} ${d.getFullYear()}` : `${day} ${month}`;
}

// Format an event duration object into a human-readable string like
// "1 day 2 hours 30 mins". Accepts objects of shape { days, hours, minutes }
// or a string/number (returned/coerced accordingly). Returns null for null/undefined input.
function formatEventDuration(d: any): string | null {
  if (d == null) return null;
  if (typeof d === "string") return d;

  // If numeric, treat as minutes
  if (typeof d === "number") {
    const mins = Math.floor(d);
    if (mins === 0) return "0 mins";
    if (mins < 60) return `${mins} ${mins === 1 ? "min" : "mins"}`;
    const hours = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem ? `${hours} ${hours === 1 ? "hour" : "hours"} ${rem} ${rem === 1 ? "min" : "mins"}` : `${hours} ${hours === 1 ? "hour" : "hours"}`;
  }

  // Coerce numeric-like fields where present
  const days = Number(d.days) || 0;
  const hours = Number(d.hours) || 0;
  const minutes = d.minutes != null ? Math.floor(Number(d.minutes) || 0) : 0;

  const parts: string[] = [];
  if (days) parts.push(`${days} ${days === 1 ? "day" : "days"}`);
  if (hours) parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
  if (minutes) parts.push(`${minutes} ${minutes === 1 ? "min" : "mins"}`);

  if (parts.length === 0) return "0 mins";
  return parts.join(" ");
}

// Format availability window into: "From, DD:MM:YY HH:MM to DD:MM:YY HH:MM"
function formatAvailabilityWindow(avail: any): string | null {
  if (!avail) return null;
  // support strings or objects with start/end
  const maybe = typeof avail === "string" ? { start: avail, end: null } : avail;
  const start = parseDate(maybe.start);
  const end = parseDate(maybe.end);

  // If we couldn't parse either side, fall back to JSON
  if (!start && !end) return JSON.stringify(avail);

  const two = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${two(d.getDate())}/${two(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)} ${two(d.getHours())}:${two(d.getMinutes())}`;

  const s = start ? fmt(start) : "N/A";
  const e = end ? fmt(end) : "N/A";

  return `From, ${s} to ${e}`;
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
