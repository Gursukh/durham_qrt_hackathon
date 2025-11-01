"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import sampleData from "../sample.json";

// Minimal types for the feature objects in sample.json
export type Address = {
  name?: string;
  line1?: string;
  town?: string;
  county?: string;
  postcode?: string;
  country?: string;
};

export type Feature = {
  // add an id injected by the provider
  id: string;
  type: string;
  geometry: {
    type: string;
    coordinates: [number, number];
  };
  properties: {
    address?: Address;
    [key: string]: any;
  };
};

type LocationsContextValue = {
  locations: Feature[];
  setLocations: React.Dispatch<React.SetStateAction<Feature[]>>;
  selectedId: string | null;
  setSelectedId: React.Dispatch<React.SetStateAction<string | null>>;
};

const LocationsContext = createContext<LocationsContextValue | undefined>(undefined);

export function LocationsProvider({ children }: { children: React.ReactNode }) {
  const [locations, setLocations] = useState<Feature[]>(() => {
    // Default populate from sample.json at startup
    try {
      const raw = Array.isArray(sampleData) ? (sampleData as any[]) : [];
      // Inject stable ids (string of index) so we can reference locations easily
      return raw.map((feat, i) => ({ id: String(i), ...feat })) as Feature[];
    } catch (e) {
      console.error("Failed to load sample locations:", e);
      return [];
    }
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Keep this effect in case we want to support dynamic updates from local files in future
  useEffect(() => {
    // no-op for now; preserves client-side semantics
  }, []);

  return (
    <LocationsContext.Provider value={{ locations, setLocations, selectedId, setSelectedId }}>
      {children}
    </LocationsContext.Provider>
  );
}

export function useLocations() {
  const ctx = useContext(LocationsContext);
  if (!ctx) throw new Error("useLocations must be used within a LocationsProvider");
  return ctx;
}

export default LocationsContext;
