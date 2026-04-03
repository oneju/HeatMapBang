"use client";
import dynamic from "next/dynamic";

const NaverMap = dynamic(() => import("./NaverMap"), { ssr: false });

export default function NaverMapLoader() {
  return <NaverMap />;
}
