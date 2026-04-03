import { Suspense } from "react";
import "./style.scss";
import NaverMapLoader from "./_client/NaverMapLoader";
import MapHeader from "./_client/MapHeader";
import { MapProvider } from "./_client/MapContext";
import ToggleButton from "./_client/ToggleButton";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <MapProvider>
      <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
        <Suspense>
          <NaverMapLoader />
        </Suspense>
        <MapHeader />
        <div className="side_toggle">
          <div className="side_toggle_content">{children}</div>
          <Suspense>
            <ToggleButton />
          </Suspense>
        </div>
      </div>
    </MapProvider>
  );
}
