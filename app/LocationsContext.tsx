"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import sampleData from "../sample.json";
import inputs from "../input.json"
import officies from "../officies.json"

// Types for the event-shaped sample.json
export type EventDates = {
  start: string;
  end: string;
};

export type EventSpan = {
  start: string;
  end: string;
};

export type EventSample = {
  event_location: string;
  event_dates: EventDates;
  event_span: EventSpan;
  name: string;
  line1?: string;
  town?: string;
  county?: string;
  postcode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  total_co2: number;
  average_travel_hours: number;
  median_travel_hours: number;
  max_travel_hours: number;
  min_travel_hours: number;
  attendee_travel_hours: Record<string, number>;
};

export type StartingLocation = {
  name: string;
  coordinates: [number, number];
  numAttendees: number;
};

type LocationsContextValue = {
  locations: any[];
  setLocations: React.Dispatch<React.SetStateAction<any[]>>;
  startingLocations: StartingLocation[] | null;
  setStartingLocations: React.Dispatch<React.SetStateAction<StartingLocation[] | null>>;
  selectedId: string | null;
  setSelectedId: React.Dispatch<React.SetStateAction<string | null>>;
};

const LocationsContext = createContext<LocationsContextValue | undefined>(undefined);

export function LocationsProvider({ children }: { children: React.ReactNode }) {
  // Keep old locations state for other parts of the app that expect feature-like lists.
  // This repo previously used an array of location features in `sample.json`. The new sample
  // format is event-shaped (EventSample). We still keep a locations array for compatibility.
  // Initialize `locations` from the event-shaped sample.json (an array of EventSample)
  const [locations, setLocations] = useState<any[]>([] as EventSample[]);
  // start with null to indicate no starting locations configured yet
  const [startingLocations, setStartingLocations] = useState<StartingLocation[] | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);

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
