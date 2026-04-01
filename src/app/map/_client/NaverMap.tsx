"use client";

import { useRef, useCallback, useState, useEffect, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import MapControl, { NaverMapInstance } from "./MapControl";
import SearchArea from "./SearchArea";
import {
  NaverMap as Map,
  Container,
  useNavermaps,
  NavermapsProvider,
  preloadNavermaps,
} from "react-naver-maps";
import { regionValueMap, buildColorScale, REGION_NAME_KEY } from "./regionData";
import { createHeatmapOverlayClass, GeoFeature } from "./HeatmapOverlay";

// dynamic import가 완료되는 즉시 Naver 스크립트 로딩 시작 (직렬 → 병렬)
preloadNavermaps({
  ncpKeyId: process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID!,
  submodules: ["geocoder"],
});

function NaverMapInner() {
  const mapRef = useRef<naver.maps.Map | null>(null);
  const overlayRef = useRef<InstanceType<
    ReturnType<typeof createHeatmapOverlayClass>
  > | null>(null);
  const [mapInstance, setMapInstance] = useState<NaverMapInstance | null>(null);
  const [mapParams, setMapParams] = useState<{
    box: string;
    layer: string;
  } | null>(null);
  const navermaps = useNavermaps();

  const getLayer = (zoom: number): string | null => {
    if (zoom >= 13) return "dong";
    if (zoom >= 10) return "sigungu";
    if (zoom >= 7) return "sido";
    return null;
  };

  // ── 경계 데이터 fetch ──────────────────────────────────────────────────────
  const { data: features, isFetching } = useQuery({
    queryKey: [
      "boundaries",
      mapParams?.layer === "sido" ? "" : mapParams?.box,
      mapParams?.layer,
    ],
    queryFn: async ({ signal }) => {
      const { box, layer } = mapParams!;
      const res = await fetch(`/api/boundaries?box=${box}&layer=${layer}`, {
        signal,
      });
      const json = await res.json();
      console.log(json, "---json");
      return (json?.response?.result?.featureCollection?.features ??
        []) as GeoFeature[];
    },
    enabled: !!mapParams,
    staleTime: Infinity, // 같은 box+layer는 재요청하지 않음
  });

  // ── D3 overlay에 데이터 반영 ────────────────────────────────────────────────
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!features || !mapParams || !overlay) return;

    const { layer } = mapParams;
    if (layer !== "sido") {
      overlay.onRemove();
      return;
    }
    const nameKey = REGION_NAME_KEY[layer].toLocaleLowerCase();
    const valueMap = regionValueMap(features.map((f) => f.properties));
    const visibleValues = features
      .map((f) => valueMap.get(f.properties?.[nameKey] ?? ""))
      .filter((v): v is number => v != null);
    const getColor = buildColorScale(visibleValues);

    overlay.updateLayer(
      layer as "sido" | "sigungu" | "dong",
      features,
      getColor,
      nameKey,
      valueMap,
    );
  }, [features, mapParams]);

  // ── 언마운트 cleanup ────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      console.log("[NaverMap] unmount, removing overlay");
      overlayRef.current?.setMap(null);
    };
  }, []);

  // ── 지도 이동/줌 시 mapParams 업데이트 ────────────────────────────────────
  const updateMapParams = useCallback((map: naver.maps.Map) => {
    const zoom = map.getZoom();
    const layer = getLayer(zoom);

    if (!layer) {
      overlayRef.current?.clearLayer("sido");
      overlayRef.current?.clearLayer("sigungu");
      overlayRef.current?.clearLayer("dong");
      setMapParams(null);
      return;
    }

    const bounds = map.getBounds() as naver.maps.LatLngBounds | null;
    if (!bounds) return;
    const sw = bounds.getSW();
    const ne = bounds.getNE();
    const lngPad = (ne.lng() - sw.lng()) * 0.05;
    const latPad = (ne.lat() - sw.lat()) * 0.05;
    const box = `${sw.lng() - lngPad},${sw.lat() - latPad},${ne.lng() + lngPad},${ne.lat() + latPad}`;

    setMapParams({ box, layer });
  }, []);

  const handleInit = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    setMapInstance(map as unknown as NaverMapInstance);

    // 폴리곤 클릭 시 해당 지역 중심으로 zoom
    const onClickFeature = (
      feature: GeoFeature,
      layer: string,
      clickedLatLng?: object,
    ) => {
      const geom = feature.geometry;
      if (!geom) return;

      const zoomTarget = layer === "sido" ? 11 : layer === "sigungu" ? 14 : 14;

      // MultiPolygon/Polygon 모두 첫 번째 ring의 bbox 중심으로 계산
      const firstRing =
        geom.type === "Polygon" ? geom.coordinates[0] : geom.coordinates[0][0];

      const lats = firstRing.map(([, lat]) => lat);
      const lngs = firstRing.map(([lng]) => lng);
      const center = new naver.maps.LatLng(
        (Math.min(...lats) + Math.max(...lats)) / 2,
        (Math.min(...lngs) + Math.max(...lngs)) / 2,
      );

      map.morph(clickedLatLng || center, zoomTarget);
    };

    const HeatmapOverlay = createHeatmapOverlayClass(navermaps);
    const overlay = new HeatmapOverlay(onClickFeature);
    overlay.setMap(map);
    overlayRef.current = overlay;

    updateMapParams(map);
  }, [navermaps, updateMapParams]);

  const handleIdle = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    updateMapParams(map);
  }, [updateMapParams]);

  return (
    <>
      {mapInstance && <SearchArea map={mapInstance} />}
      <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
        <Container className="MainMap">
          <Map
            ref={mapRef}
            defaultMapTypeId={navermaps.MapTypeId.NORMAL}
            defaultCenter={{
              lat: 37.5408565822362,
              lng: 127.0205653048893,
            }}
            defaultZoom={7}
            scaleControl={false}
            logoControl={false}
            mapDataControl={false}
            mapTypeControl={false}
            zoomControl={false}
            zoomControlOptions={{
              style: navermaps.ZoomControlStyle.SMALL,
              position: navermaps.Position.LEFT_TOP,
            }}
            maxZoom={19}
            minZoom={8}
            background="#e8e4d9"
            onInit={handleInit}
            onIdle={handleIdle}
          >
            {mapInstance && <MapControl map={mapInstance} />}
          </Map>
        </Container>
        {isFetching && (
          <div
            style={{
              position: "absolute",
              top: 16,
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(0,0,0,0.6)",
              color: "#fff",
              padding: "6px 14px",
              borderRadius: 20,
              fontSize: 13,
              pointerEvents: "none",
              zIndex: 10,
            }}
          >
            로딩 중...
          </div>
        )}
      </div>
    </>
  );
}

export default function NaverMap() {
  const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID!;

  return (
    <NavermapsProvider ncpKeyId={clientId} submodules={["geocoder"]}>
      <Suspense fallback={null}>
        <NaverMapInner />
      </Suspense>
    </NavermapsProvider>
  );
}
