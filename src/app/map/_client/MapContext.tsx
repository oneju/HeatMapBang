"use client";
import { createContext, useContext, useState } from "react";

// setter context: useState setter는 항상 stable → NaverMapInner가 구독해도 리렌더 없음
const MapSetterContext = createContext<(m: naver.maps.Map | null) => void>(
  () => {},
);

// reader context: map 값이 바뀔 때만 리렌더 → page/header 전용
const MapReaderContext = createContext<naver.maps.Map | null>(null);

export function MapProvider({ children }: { children: React.ReactNode }) {
  const [map, setMap] = useState<naver.maps.Map | null>(null);
  return (
    <MapSetterContext.Provider value={setMap}>
      <MapReaderContext.Provider value={map}>
        {children}
      </MapReaderContext.Provider>
    </MapSetterContext.Provider>
  );
}

/** NaverMapInner 전용: map 상태 변화로 리렌더되지 않음 */
export const useSetMap = () => useContext(MapSetterContext);

/** page / header 전용: map 인스턴스를 읽음 */
export const useMapInstance = () => useContext(MapReaderContext);
