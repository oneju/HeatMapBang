"use client";

import {
  useRef,
  useCallback,
  useState,
  useEffect,
  Suspense,
  useLayoutEffect,
} from "react";
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
import { createClusterOverlayClass, RealtorPoint, BuildingPin } from "./ClusterOverlay";

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
  const clusterOverlayRef = useRef<InstanceType<
    ReturnType<typeof createClusterOverlayClass>
  > | null>(null);
  const [mapInstance, setMapInstance] = useState<NaverMapInstance | null>(null);
  const [mapParams, setMapParams] = useState<{
    box: string;
    layer: string;
  } | null>(null);
  // 지도 중심 좌표 + zoom (소수점 2자리 반올림 → ~1km 단위 캐시)
  const [mapCenter, setMapCenter] = useState<{
    lat: number;
    lng: number;
    zoom: number;
  } | null>(null);
  const navermaps = useNavermaps();

  const getLayer = (zoom: number): string | null => {
    if (zoom >= 13) return "dong";
    if (zoom >= 11) return "sigungu";
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
        headers: { "Content-Type": "application/json" },
        next: { tags: ["get-polygon", box, layer] },
        credentials: "include",
        keepalive: false,
      });
      const json = await res.json();
      console.log(json, "---json");
      return (json?.response?.result?.featureCollection?.features ??
        []) as GeoFeature[];
    },
    enabled: !!mapParams && mapParams?.layer === "sido",
    staleTime: Infinity, // 같은 box+layer는 재요청하지 않음
  });

  // ── 중개사 데이터 fetch (프록시 서버) ────────────────────────────────────────
  const { data: realtorData } = useQuery({
    queryKey: ["realtors", mapCenter?.lat, mapCenter?.lng, mapCenter?.zoom],
    queryFn: async () => {
      const { lat, lng, zoom } = mapCenter!;
      const res = await fetch(
        `/api/realtors?lat=${lat}&lng=${lng}&zoom=${zoom}&lv=${zoom}`,
      );
      const json = await res.json();
      console.log(json, "--- realtors");
      return json.data as (RealtorPoint | BuildingPin)[];
    },
    enabled: !!mapCenter,
    staleTime: 0,
  });

  // ── D3 overlay에 데이터 반영 ────────────────────────────────────────────────
  useLayoutEffect(() => {
    const overlay = overlayRef.current;
    console.log(mapParams, "layer ----", !!overlay);
    if (!mapParams || !overlay) return;

    const { layer } = mapParams;

    if (!features || layer !== "sido") {
      console.log("sido ??????");
      overlay.clearLayer("sido");
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

  // ── realtorData → ClusterOverlay 반영 ──────────────────────────────────────
  useEffect(() => {
    if (!mapParams || !realtorData) return;
    const { layer } = mapParams;
    if (layer === "sido") {
      clusterOverlayRef.current?.clear();
      return;
    }
    if (layer !== "sido") clusterOverlayRef.current?.setPoints(realtorData);
  }, [realtorData]);

  // ── 언마운트 cleanup ────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      console.log("[NaverMap] unmount, removing overlay");
      overlayRef.current?.setMap(null);
      clusterOverlayRef.current?.setMap(null);
    };
  }, []);

  // ── 지도 이동/줌 시 mapParams + mapCenter 업데이트 ────────────────────────
  const updateMapParams = useCallback((map: naver.maps.Map) => {
    const zoom = map.getZoom();
    const layer = getLayer(zoom);

    console.log(zoom, "-----zooooooooo");

    if (!layer) {
      overlayRef.current?.clearLayer("sido");
      overlayRef.current?.clearLayer("sigungu");
      overlayRef.current?.clearLayer("dong");
      clusterOverlayRef.current?.clear();
      setMapParams(null);
      setMapCenter(null);
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

    // 소수점 2자리 반올림 → 약 1km 단위로 캐시 (너무 잦은 재요청 방지)
    const center = map.getCenter() as naver.maps.LatLng;
    setMapCenter({
      lat: Math.round(center.lat() * 100) / 100,
      lng: Math.round(center.lng() * 100) / 100,
      zoom,
    });
  }, []);

  const handleInit = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    setMapInstance(map as unknown as NaverMapInstance);

    // 폴리곤 클릭 시 해당 지역 중심으로 zoom
    const onClickFeature = (
      feature: GeoFeature | null,
      layer: string | null,
      clickedLatLng: naver.maps.LatLng,
    ) => {
      const zoom = map.getZoom();
      const zoomTarget = Math.min(zoom + (!!feature ? 4 : 3), 18);
      if (clickedLatLng) return map.morph(clickedLatLng, zoomTarget);
      if (!feature) return;
      const geom = feature.geometry;
      if (!geom) return;

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

    const ClusterOverlay = createClusterOverlayClass(navermaps);
    const clusterOverlay = new ClusterOverlay(onClickFeature);
    clusterOverlay.setMap(map);
    clusterOverlayRef.current = clusterOverlay;

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
