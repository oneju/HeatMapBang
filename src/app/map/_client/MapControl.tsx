"use client";

import { useRef, useState, useCallback } from "react";

interface NaverMarker {
  setMap(map: NaverMapInstance | null): void;
}

export interface NaverMapInstance {
  morph(latLng: unknown, zoom: number): void;
  getZoom(): number;
  setZoom(zoom: number, animate?: boolean): void;
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
          map: map as unknown as naver.maps.Map,
          position: latLng,
          icon: {
            content: `<style>
                  @keyframes marker-pulse {
                    0%, 90%, 100% { box-shadow: 0 0 0 0px rgba(255,0,0,0.4); }
                    25% { box-shadow: 0 0 0 3px rgba(255,0,0,0.4); }
                  }
                </style>
                <div style="
                  width: 16px; height: 16px;
                  background: #ff0000;
                  border: 3px solid #fff;
                  border-radius: 50%;
                  box-shadow: 0 0 0 1px rgba(255,0,0,0.4);
                  animation: marker-pulse 2s ease-in-out infinite;
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
    <div className="right-btn-group">
      <div className="switch btn">
        <button
          onClick={() => map.setZoom(Math.min(map.getZoom() + 1, 19), true)}
        >
          +
        </button>
        <button
          onClick={() => map.setZoom(Math.max(map.getZoom() - 1, 1), true)}
        >
          -
        </button>
      </div>
      <div className="switch btn">
        <button
          onClick={moveToMyLocation}
          disabled={locating}
          title="내 위치로 이동"
          style={{ cursor: locating ? "wait" : "pointer" }}
        >
          {locating ? "⏳" : "📍"}
        </button>
      </div>
    </div>
  );
}
