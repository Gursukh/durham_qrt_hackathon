"use client";

import { FullscreenMap } from "./FullScreenMap";
import { useLocations } from "./LocationsContext";

export default function Home() {
  const { locations } = useLocations();

  return (
    <div className="w-screen h-screen bg-background relative ">
      <FullscreenMap />

      <div id="locations_box" className="absolute top-8 right-8 max-h-[80vh] w-72 overflow-auto p-2 rounded shadow bg-white">
        <div className="flex flex-col gap-2 px-2 pb-2">
          {locations.map((loc) => (
            <LocationListItem key={loc.id} loc={loc} />
          ))}
        </div>
      </div>
    </div>
  );
}

function LocationListItem({ loc }: { loc: any }) {
  const { selectedId, setSelectedId } = useLocations();
  const addr = loc.properties?.address;
  const isSelected = selectedId === loc.id;

  return (
    <div
      onClick={() => setSelectedId(loc.id)}
      className={`cursor-pointer rounded p-2 border ${isSelected ? "bg-sky-100 border-sky-300" : "bg-white border-gray-100"}`}
    >
      <div className="text-sm text-black font-medium">{addr?.name ?? "Location"}</div>
      <div className="text-xs text-gray-600">{addr?.line1}</div>
      <div className="text-xs text-gray-500">{addr?.town} {addr?.country}</div>
    </div>
  );
}
