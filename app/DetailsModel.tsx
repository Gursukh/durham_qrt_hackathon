
import { FullscreenMap } from "./FullScreenMap";
import { useLocations } from "./LocationsContext";
import { useState, useEffect } from "react";
import officies from "../officies.json";
import { ordinalSuffix, parseDate, formatDateTimeNice, formatTimeOnly } from "./dateutils";
import { getImageSrcs } from "./lib/googeliamges";


export default function DetailsModal({ onClose, closing }: { onClose: () => void; closing?: boolean }) {
  const { locations, startingLocations, selectedId } = useLocations();
  const loc = locations.find((l) => l.id === selectedId);

  // compute office safely (loc may be undefined) and declare hooks unconditionally
  const office = loc ? (officies as any)[loc.event_location] : undefined;

  const [images, setImages] = useState<string[]>([]);
  const [imgError, setImgError] = useState<string | null>(null);
  // track which images have finished loading so we can fade them in
  const [loadedMap  , setLoadedMap] = useState<Record<number, boolean>>({});

  useEffect(() => {
    let cancelled = false;

    async function loadImages() {
      setImgError(null);
      setImages([]);

      if (!office?.line1) return;

      const key = process.env.NEXT_PUBLIC_KEY_2;
      const cx = "909fe32cfda964a00";

      if (!key || !cx) {
        setImgError("Google API key or CSE cx missing (set NEXT_PUBLIC_GOOGLE_API_KEY and NEXT_PUBLIC_GOOGLE_CSE_CX)");
        return;
      }

      try {
        const srcs = await getImageSrcs(`${loc.event_location.length > 3 ? office.town : loc.event_location + " Airport"} `, { key, cx, num: 5 });
        if (!cancelled) setImages(srcs);
        // Filter out instagram urls
        setImages((prev) => prev.filter((src) => !src.includes("instagram.com")));
      } catch (err: any) {
        if (!cancelled) setImgError(err?.message ?? "Failed to load images");
      }
    }

    loadImages();
    return () => {
      cancelled = true;
    };
  }, [office?.line1]);

  // If no selected location, return nothing (hooks already called above)
  if (!loc) return null;

  const _rawStart = loc?.event_dates?.start ?? loc?.start ?? null;
  const _rawEnd = loc?.event_dates?.end ?? loc?.end ?? null;
  const ds = parseDate(_rawStart);
  const de = parseDate(_rawEnd);
  const ss = parseDate(loc?.event_span?.start ?? null);
  // If no selected location, render nothing. We return after hooks have been called
  // to preserve the rules of hooks.
  if (!loc) return null;
  const se = parseDate(loc?.event_span?.end ?? null);

  return (
    <div className="flex flex-col gap-2 p ">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onClose}
          className="absolute text-md text-sky-600 hover:underline bg-white rounded-full px-2 py-1 mt-2 flex items-center"
        >
          {"< Back"}
        </button>
        <div className=" right-6 top-7 flex-1 text-center text-4xl text-white font-bold text-shadow-xs whitespace-nowrap">{loc.event_location}</div>
      </div>
      
      {(
        <div className="h-[200px] w-full flex gap-4 overflow-x-scroll rounded-xl overflow-hidden">
          {images.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`${office.line1} ${i + 1}`}
              loading="lazy"
              onLoad={() => setLoadedMap((p) => ({ ...p, [i]: true }))}
              onError={() => setLoadedMap((p) => ({ ...p, [i]: true }))}
              className={`w-auto h-full object-cover rounded-xl transition-opacity duration-700 ease-out transform ${loadedMap[i] ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
            />
          ))}
        </div>
      )}
      <div className="bg-white rounded-xl p-4 py-2">
        <div className="pt-1">
          <div className="text-base font-semibold text-black border-b border-gray-300 mb-2">{"Address"}</div>
          <div className="text-sm text-gray-700">{office.line1}</div>
          <div className="text-sm text-gray-700">{`${office.postcode ?? ""}${((office.postcode?? "") && ",")} ${office.town ?? ""}`}</div>
        </div>
      </div>


      <div className="bg-white rounded-xl p-4 py-2">
        <div className="pt-1">
          <div className="text-base font-semibold text-black border-b border-gray-300 mb-2">{"Schedule"}</div>
          <div className="text-sm grid grid-cols-[auto_auto]">
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
          <div className="text-base font-semibold text-black mb-2 border-b border-gray-300">{"Carbon Dioxide Emissions"}</div>

          {startingLocations && startingLocations.map((startLoc, idx) => {
            // find matching starting location info from loc.starting_locations by name
            const travelHours = loc.attendee_travel_hours[startLoc.name];

            return (
              <div key={idx} className="mb-4 last:mb-0">
                <div className="flex justify-between">
                <div className="font-bold text-gray-800">{`${startLoc.name}`}</div>
                  <div className="text-sm text-gray-600">
                    {loc.attendee_co2[startLoc.name] != null
                      ? `${loc.attendee_co2[startLoc.name].per_attendee * 1000} kg CO₂`
                      : "N/A"}
                  </div>
                </div>
              </div>
            );
          })}

          <div className="flex justify-between">

          <div className="text-2xl w-fit font-bold text-black">Total</div>
          <div className="text-2xl w-fit  text-gray-700">{loc.total_co2 != null ? loc.total_co2.toFixed(2) * 1000 + " kg CO₂" : "N/A"}</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 py-2">
        <div className="pt-1">
          <div className="text-base font-semibold text-black mb-2 border-b border-gray-300">{"Travelers"}</div>
          {startingLocations && startingLocations.map((startLoc, idx) => {
            // find matching starting location info from loc.starting_locations by name
            const travelHours = loc.attendee_travel_hours[startLoc.name];

            return (
              <div key={idx} className="mb-4 last:mb-0">
                <div className="font-bold text-gray-800">{`${startLoc.name}`}</div>
                <div className="flex justify-between">
                  <div className="text-sm text-gray-800">{`${startLoc.numAttendees} attendees`}</div>
                  <div className="text-sm text-gray-600">
                    Travel Time : {travelHours != null ? Math.floor(travelHours) + " hrs " + Math.round((travelHours % 1) * 60) + " mins" : "N/A"}
                  </div>
                </div>
              </div>
            );
          })}
          <div className="text-sm text-gray-600">Average Travel Time: {loc.average_travel_hours != null ? Math.floor(loc.average_travel_hours) + " hrs " + Math.round((loc.average_travel_hours % 1) * 60) + " mins" : "N/A"}</div>
        </div>
      </div>
    </div>
  );
}
