import { NextRequest, NextResponse } from "next/server";
import { BUILDINGS, toIndex, type BuildingResponseItem } from "../_data";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ bld_id: string }> },
) {
  const { bld_id } = await params;
  const raw = BUILDINGS.find((b) => b.id === bld_id);

  if (!raw) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: BuildingResponseItem = {
    id: raw.id,
    lat: raw.lat,
    lon: raw.lon,
    name: raw.name,
    content: raw.content,
    index: toIndex([raw.score]),
  };

  return NextResponse.json({ data });
}
