import type { Metadata } from "next";
import BuildingDetail, { getBuilding } from "./BuildingDetail";

type Props = {
  params: Promise<{ bld_id: string; rest?: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { bld_id } = await params;
  const building = await getBuilding(bld_id);

  if (!building) {
    return { title: "건물 정보 없음" };
  }
  console.log("buliding", building);

  return {
    title: `${building.name} | 힛맵뱅`,
    description: `${building.name} | ${building.content} | 위치: ${building.lat}, ${building.lon}`,
    alternates: {
      canonical: `/map/building/${bld_id}`,
    },
    openGraph: {
      title: building.name,
      images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    },
  };
}

export default async function Page({ params, searchParams }: Props) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  return <BuildingDetail bld_id={resolvedParams.bld_id} />;
}
