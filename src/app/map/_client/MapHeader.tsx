"use client";
import { useMapInstance } from "./MapContext";
import SearchArea from "./SearchArea";
import { NaverMapInstance } from "./MapControl";

export default function MapHeader() {
  const map = useMapInstance();
  return (
    <header>
      <SearchArea map={map as unknown as NaverMapInstance} />
    </header>
  );
}
