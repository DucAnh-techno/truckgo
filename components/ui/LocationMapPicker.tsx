"use client";

import { useEffect, useRef } from "react";
import type { CircleMarker, Map, LeafletMouseEvent } from "leaflet";

interface LocationMapPickerProps {
  latitude: number | null;
  longitude: number | null;
  onPick: (latitude: number, longitude: number) => void;
}

const VIETNAM_CENTER: [number, number] = [16.0471, 108.2062];

export function LocationMapPicker({
  latitude,
  longitude,
  onPick,
}: LocationMapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markerRef = useRef<CircleMarker | null>(null);
  const onPickRef = useRef(onPick);

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  useEffect(() => {
    let isUnmounted = false;

    async function setupMap() {
      const container = mapContainerRef.current;
      if (!container || mapRef.current) {
        return;
      }

      const L = await import("leaflet");
      if (isUnmounted || !mapContainerRef.current || mapRef.current) {
        return;
      }

      // Hot reload can keep stale leaflet ids on the same DOM node.
      const reusedContainer = container as HTMLDivElement & {
        _leaflet_id?: number;
      };
      if (reusedContainer._leaflet_id) {
        delete reusedContainer._leaflet_id;
      }

      const hasPosition = latitude !== null && longitude !== null;
      const center = hasPosition ? ([latitude, longitude] as [number, number]) : VIETNAM_CENTER;

      const map = L.map(container, {
        center,
        zoom: hasPosition ? 14 : 6,
        scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      map.on("click", (event: LeafletMouseEvent) => {
        onPickRef.current(event.latlng.lat, event.latlng.lng);
      });

      if (hasPosition) {
        markerRef.current = L.circleMarker(center, {
          radius: 9,
          color: "#ea580c",
          fillColor: "#fb923c",
          fillOpacity: 0.9,
        }).addTo(map);
      }

      mapRef.current = map;
      setTimeout(() => {
        map.invalidateSize();
      }, 0);
    }

    void setupMap();

    return () => {
      isUnmounted = true;
      markerRef.current = null;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [latitude, longitude]);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    let cancelled = false;

    async function syncMarker() {
      const L = await import("leaflet");
      const map = mapRef.current;
      if (cancelled || !map) {
        return;
      }

      const hasPosition = latitude !== null && longitude !== null;

      if (!hasPosition) {
        if (markerRef.current) {
          markerRef.current.remove();
          markerRef.current = null;
        }
        map.setView(VIETNAM_CENTER, 6);
        return;
      }

      const nextPosition: [number, number] = [latitude, longitude];
      if (!markerRef.current) {
        markerRef.current = L.circleMarker(nextPosition, {
          radius: 9,
          color: "#ea580c",
          fillColor: "#fb923c",
          fillOpacity: 0.9,
        }).addTo(map);
      } else {
        markerRef.current.setLatLng(nextPosition);
      }

      map.setView(nextPosition, 14);
    }

    void syncMarker();

    return () => {
      cancelled = true;
    };
  }, [latitude, longitude]);

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200">
      <div ref={mapContainerRef} className="h-64 w-full" />
    </div>
  );
}
