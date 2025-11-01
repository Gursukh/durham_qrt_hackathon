"use client";

import { FullscreenMap } from "./FullScreenMap";
import { useLocations } from "./LocationsContext";
import type { Feature } from "./LocationsContext";

export default function Home() {
  const { locations, selectedId } = useLocations();

  return (
    <div className="w-screen h-screen bg-background relative ">
      <FullscreenMap />

      <div id="locations_box" className="absolute top-8 right-8 max-h-[80vh] w-72 overflow-auto p-2 rounded shadow panel">
        {/* debug: show selectedId for troubleshooting */}
        <div className="px-2 text-xs text-gray-400">selectedId: {String(selectedId)}</div>

        {selectedId === null ? (
          <div className="flex flex-col gap-2 px-2 pb-2">
            {locations.map((loc) => (
              <LocationListItem key={loc.id} loc={loc} />
            ))}
          </div>
        ) : (
          <DetailsModal />
        )}
      </div>
    </div>
  );
}

function LocationListItem({ loc }: { loc: Feature }) {
  const { selectedId, setSelectedId } = useLocations();
  const isSelected = selectedId === loc.id;

  return (
    <button
      type="button"
      onClick={() => setSelectedId(loc.id)}
      className={`text-left w-full cursor-pointer rounded p-2 border ${isSelected ? "bg-sky-100 border-sky-300" : "bg-white border-gray-100"}`}
    >
      <div className="text-sm text-black font-medium">{loc.name ?? "Location"}</div>
      <div className="text-xs text-gray-600">{loc.line1}</div>
      <div className="text-xs text-gray-500">{loc.town} {loc.country}</div>
    </button>
  );
}

function DetailsModal() {
  const { locations, selectedId, setSelectedId } = useLocations();
  const loc = locations.find((l) => l.id === selectedId);

  if (!loc) return null;

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setSelectedId(null)}
          className="text-sm text-sky-600 hover:underline"
        >
          ← Back
        </button>
        <div className="text-xs text-gray-500">Details</div>
      </div>

      <div className="pt-1">
        <div className="text-base font-semibold text-black">{loc.name ?? "Location"}</div>
        <div className="text-sm text-gray-700">{loc.line1}</div>
        <div className="text-sm text-gray-600">{loc.town} {loc.country}</div>
      </div>

      <div className="pt-2">
        <div className="text-xs text-gray-500">Coordinates</div>
        <div className="text-sm text-gray-700">{(loc.latitude ?? "") + (loc.latitude != null && loc.longitude != null ? `, ${loc.longitude}` : "")}</div>
      </div>
    </div>
  );
}
