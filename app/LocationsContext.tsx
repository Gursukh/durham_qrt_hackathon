"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import sampleData from "../sample.json";
import inputs from "../input.json"
import officies from "../officies.json"

// Minimal types for the feature objects in sample.json
export type Address = {
  line1?: string;
  town?: string;
  county?: string;
  postcode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
};

export type Feature = {
  // add an id injected by the provider
  id: string;
  name: string;
  line1?: string;
  town?: string;
  county?: string;
  postcode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
};

export type StartingLocation = {
  name: string;
  coordinates: [number, number];
  numAttendees: number;
};

type LocationsContextValue = {
  locations: Feature[];
  setLocations: React.Dispatch<React.SetStateAction<Feature[]>>;
  startingLocations: StartingLocation[];
  setStartingLocations: React.Dispatch<React.SetStateAction<StartingLocation[]>>;
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

  const [startingLocations, setStartingLocations] = useState<StartingLocation[]>(() => {
    // ensure we can index attendees by arbitrary string keys
    const attendeesByCity = inputs.attendees as Record<string, any>;

    return Object.keys(attendeesByCity).map((city) => {
      const key = city as keyof typeof officies;
      const office = officies[key];
      return {
        name: city,
        coordinates: [office.lat, office.long] as [number, number],
        numAttendees: Array.isArray(attendeesByCity[city]) ? attendeesByCity[city].length : Number(attendeesByCity[city]) || 0,
      };
    });
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Keep this effect in case we want to support dynamic updates from local files in future
  useEffect(() => {
    let cities = Object.keys(inputs.attendees);


  }, []);

  return (
    <LocationsContext.Provider value={{ locations, setLocations, startingLocations, setStartingLocations, selectedId, setSelectedId }}>
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
