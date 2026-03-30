"use client";

import { useRef, useState, useCallback } from "react";

interface NaverMarker {
  setMap(map: NaverMapInstance | null): void;
}

export interface NaverMapInstance {
  morph(latLng: unknown, zoom: number): void;
}

interface Props {
  map: NaverMapInstance;
}

export default function MapControl({ map }: Props) {
  const myMarkerRef = useRef<NaverMarker | null>(null);
  const [locating, setLocating] = useState(false);

  const moveToMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert("이 브라우저는 위치 정보를 지원하지 않습니다.");
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const latLng = new window.naver.maps.LatLng(latitude, longitude);

        if (myMarkerRef.current) {
          myMarkerRef.current.setMap(null);
        }

        myMarkerRef.current = new window.naver.maps.Marker({
          map,
          position: latLng,
          icon: {
            content: `<div style="
              width: 16px; height: 16px;
              background: #ff0000;
              border: 3px solid #fff;
              border-radius: 50%;
              box-shadow: 0 0 0 3px rgba(37,99,235,0.4);
            "></div>`,
            anchor: new window.naver.maps.Point(8, 8),
          },
        });

        map?.morph(latLng, 16);
        setLocating(false);
      },
      () => {
        alert("위치 정보를 가져올 수 없습니다.");
        setLocating(false);
      },
    );
  }, [map]);

  return (
    <button
      onClick={moveToMyLocation}
      disabled={locating}
      style={{
        position: "absolute",
        bottom: 40,
        right: 16,
        zIndex: 100,
        width: 44,
        height: 44,
        borderRadius: "50%",
        background: "#fff",
        border: "1px solid #ddd",
        boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
        cursor: locating ? "wait" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 20,
      }}
      title="내 위치로 이동"
    >
      {locating ? "⏳" : "📍"}
    </button>
  );
}
