"use client";
import dynamic from "next/dynamic";
import "./style.scss";

const NaverMap = dynamic(() => import("./_client/NaverMap"), { ssr: false });

export default function MapPage() {
  return (
    <main style={{ width: "100%", height: "100vh", margin: 0, padding: 0 }}>
      <NaverMap />
    </main>
  );
}
