import { cache } from "react";
import Image from "next/image";
import { BUILDINGS, toIndex, type BuildingResponseItem } from "@/app/api/realtors/_data";

function findBuilding(bld_id: string): BuildingResponseItem | null {
  const raw = BUILDINGS.find((b) => b.id === bld_id);
  if (!raw) return null;
  return {
    id: raw.id,
    lat: raw.lat,
    lon: raw.lon,
    name: raw.name,
    content: raw.content,
    index: toIndex([raw.score]),
  };
}

export const getBuilding = cache(findBuilding);

export default async function BuildingDetail({ bld_id }: { bld_id: string }) {
  const building = getBuilding(bld_id);

  if (!building) {
    return <p>건물 정보를 찾을 수 없습니다.</p>;
  }

  return (
    <div>
      <Image
        src="/og-image.png"
        alt={building.name}
        width={400}
        height={300}
        loading="lazy"
      />
      <h1>{building.name}</h1>
      <p>{building.content}</p>
      <p>
        위치: {building.lat}, {building.lon}
      </p>
    </div>
  );
}
