"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import MapControl, { NaverMapInstance } from "./MapControl";
import SearchArea from "./SearchArea";

declare global {
  interface Window {
    naver: any;
  }
}


export default function NaverMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const polygonsRef = useRef<any[]>([]);
  const currentLayerRef = useRef<string | null>(null);
  const [mapInstance, setMapInstance] = useState<NaverMapInstance | null>(null);

  const clearPolygons = useCallback(() => {
    polygonsRef.current.forEach((p) => p.setMap(null));
    polygonsRef.current = [];
  }, []);

  const getLayer = (zoom: number): string | null => {
    console.log(zoom, "----zooooooom");
    if (zoom >= 13) return "dong";
    if (zoom >= 10) return "sigungu";
    if (zoom >= 7) return "sido";
    return null;
  };

  const fetchAndDrawBoundaries = useCallback(
    async (map: any) => {
      const layer = getLayer(map.getZoom());

      if (!layer || layer !== currentLayerRef.current) {
        clearPolygons();
      }
      if (!layer) {
        currentLayerRef.current = null;
        return;
      }
      currentLayerRef.current = layer;

      const bounds = map.getBounds();
      const sw = bounds.getSW();
      const ne = bounds.getNE();

      const lngPad = (ne.lng() - sw.lng()) * 0.05;
      const latPad = (ne.lat() - sw.lat()) * 0.05;
      const box = `${sw.lng() - lngPad},${sw.lat() - latPad},${ne.lng() + lngPad},${ne.lat() + latPad}`;

      try {
        const res = await fetch(`/api/boundaries?box=${box}&layer=${layer}`);
        const json = await res.json();
        console.log(json);

        const features = json?.response?.result?.featureCollection?.features;
        if (!Array.isArray(features)) return;

        clearPolygons();

        const COLOR_RANGE = ["#D3D3D3", "#FDBA74", "#F97316", "#D84315"];
        const total = features.length;

        features.forEach((feature: any, index: number) => {
          const geom = feature.geometry;
          if (!geom) return;

          const colorIndex = Math.min(
            Math.floor((index / total) * COLOR_RANGE.length),
            COLOR_RANGE.length - 1,
          );
          const fillColor = COLOR_RANGE[colorIndex];

          const drawPolygon = (rings: number[][][]) => {
            const paths = rings.map((ring) =>
              ring.map(([lng, lat]) => new window.naver.maps.LatLng(lat, lng)),
            );

            const polygon = new window.naver.maps.Polygon({
              map,
              paths,
              fillColor,
              fillOpacity: 0.4,
              strokeColor: "#fff",
              strokeWeight: 1.5,
              strokeOpacity: 0.8,
            });

            polygonsRef.current.push(polygon);
          };

          if (geom.type === "Polygon") {
            drawPolygon(geom.coordinates);
          } else if (geom.type === "MultiPolygon") {
            (geom.coordinates as number[][][][]).forEach((poly) =>
              drawPolygon(poly),
            );
          }
        });
      } catch (err) {
        console.error("경계 데이터 로드 실패:", err);
      }
    },
    [clearPolygons],
  );

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;

    const initMap = () => {
      if (!mapRef.current || !window.naver) return;

      const map = new window.naver.maps.Map(mapRef.current, {
        center: new window.naver.maps.LatLng(36.5, 127.5),
        minZoom: 7, //지도의 최소 줌 레벨
        zoom: 7,
      });

      mapInstanceRef.current = map;
      setMapInstance(map);

      fetchAndDrawBoundaries(map);

      window.naver.maps.Event.addListener(map, "idle", () => {
        fetchAndDrawBoundaries(map);
      });
    };

    const script = document.createElement("script");
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}&submodules=geocoder`;
    script.async = true;
    script.onload = initMap;
    document.head.appendChild(script);

    return () => {
      clearPolygons();
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [fetchAndDrawBoundaries, clearPolygons]);

  return (
    <>
      {mapInstance && <SearchArea map={mapInstance} />}
      <div style={{ position: "relative", width: "100%", height: "100vh" }}>
        <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
        {mapInstance && <MapControl map={mapInstance} />}
      </div>
    </>
  );
}
