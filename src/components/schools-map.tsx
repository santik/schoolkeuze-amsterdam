"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import * as React from "react";
import { useTranslations } from "next-intl";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { Link } from "@/i18n/navigation";

type SchoolMarker = {
  id: string;
  name: string;
  lat: number | null;
  lon: number | null;
  levels?: string[];
};

const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const SelectedIcon = L.icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  iconRetinaUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const FavoriteIcon = L.icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png",
  iconRetinaUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const UserIcon = L.divIcon({
  html: '<div style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:9999px;background:#2563eb;color:#fff;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.25);">🧍</div>',
  className: "",
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

type Props = {
  schools: SchoolMarker[];
  selectedId: string | null;
  favoriteIds: string[];
  onSelect: (id: string) => void;
  userLocation: { lat: number; lon: number } | null;
};

export default function SchoolsMap({
  schools,
  selectedId,
  favoriteIds,
  onSelect,
  userLocation,
}: Props) {
  const t = useTranslations("SchoolsMap");
  const markerRefs = React.useRef<Record<string, L.Marker | null>>({});
  const [pinnedId, setPinnedId] = React.useState<string | null>(null);
  const favoriteSet = React.useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const center: [number, number] = userLocation
    ? [userLocation.lat, userLocation.lon]
    : [52.3702, 4.8952];

  const markers = React.useMemo(
    () => schools.filter((s) => s.lat != null && s.lon != null),
    [schools]
  );
  const activePopupId = pinnedId;

  React.useEffect(() => {
    for (const s of markers) {
      const marker = markerRefs.current[s.id];
      if (!marker) continue;
      if (activePopupId === s.id) {
        marker.openPopup();
      } else {
        marker.closePopup();
      }
    }
  }, [activePopupId, markers]);

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
              icon={UserIcon}
            >
              <Popup>{t("yourLocation")}</Popup>
            </Marker>
          ) : null}

          {markers.map((s) => (
            <Marker
              key={s.id}
              ref={(el) => {
                markerRefs.current[s.id] = el;
              }}
              position={[s.lat!, s.lon!]}
              icon={
                selectedId === s.id
                  ? SelectedIcon
                  : favoriteSet.has(s.id)
                    ? FavoriteIcon
                    : DefaultIcon
              }
              eventHandlers={{
                click: () => {
                  setPinnedId(s.id);
                  onSelect(s.id);
                },
                popupclose: () => {
                  setPinnedId((prev) => (prev === s.id ? null : prev));
                },
              }}
            >
              <Popup
                autoClose={false}
                closeOnClick={false}
                closeButton
                autoPan={pinnedId === s.id}
                offset={[0, -30]}
                className="map-popup-pinned"
              >
                <div className="text-sm font-semibold text-indigo-950">{s.name}</div>
                <div className="mt-1 text-xs text-indigo-700">
                  {(s.levels ?? []).join(" / ") || "—"}
                </div>
                {pinnedId === s.id ? (
                  <Link
                    href={`/schools/${s.id}`}
                    className="mt-2 inline-flex h-8 items-center justify-center rounded-full border border-violet-300 bg-violet-50 px-3 text-xs font-semibold text-violet-900 hover:bg-violet-100"
                  >
                    Info
                  </Link>
                ) : null}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
