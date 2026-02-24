"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import * as React from "react";
import { useTranslations } from "next-intl";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

type SchoolMarker = {
  id: string;
  name: string;
  lat: number | null;
  lon: number | null;
};

const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

type Props = {
  schools: SchoolMarker[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  userLocation: { lat: number; lon: number } | null;
};

export default function SchoolsMap({
  schools,
  selectedId,
  onSelect,
  userLocation,
}: Props) {
  const t = useTranslations("SchoolsMap");

  const center: [number, number] = userLocation
    ? [userLocation.lat, userLocation.lon]
    : [52.3702, 4.8952];

  const markers = React.useMemo(
    () => schools.filter((s) => s.lat != null && s.lon != null),
    [schools]
  );

  return (
    <div className="overflow-hidden rounded-3xl border border-sky-200 bg-white/90 shadow-sm dark:border-sky-300/20 dark:bg-sky-500/10">
      <div className="border-b border-sky-200 px-4 py-3 text-sm font-bold text-sky-900 dark:border-sky-300/20 dark:text-sky-100">
        🗺️ {t("title")}
      </div>
      <div className="h-[420px] w-full">
        <MapContainer
          center={center}
          zoom={12}
          scrollWheelZoom
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {userLocation ? (
            <Marker
              position={[userLocation.lat, userLocation.lon]}
              icon={DefaultIcon}
            >
              <Popup>{t("yourLocation")}</Popup>
            </Marker>
          ) : null}

          {markers.map((s) => (
            <Marker
              key={s.id}
              position={[s.lat!, s.lon!]}
              icon={DefaultIcon}
              eventHandlers={{
                click: () => onSelect(s.id),
              }}
            >
              <Popup>
                <div className="text-sm font-semibold text-indigo-950">{s.name}</div>
                {selectedId === s.id ? (
                  <div className="mt-1 text-xs text-indigo-700">
                    {t("selected")}
                  </div>
                ) : null}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
