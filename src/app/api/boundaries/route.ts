import { NextRequest, NextResponse } from "next/server";

const LAYER_MAP: Record<string, string> = {
  sido: "LT_C_ADSIDO_INFO", // 시도 (zoom 7-9)
  sigungu: "LT_C_ADSIGG_INFO", // 시군구 (zoom 10-12)
  dong: "LT_C_ADEMD_INFO", // 읍면동 (zoom 13+)
};

const PAGE_SIZE = 10;

type VWorldResponse = {
  response?: {
    result?: {
      featureCollection?: {
        totalFeatures?: number;
        features?: unknown[];
      };
    };
  };
};

async function fetchBox(
  layerName: string,
  box: string,
  apiKey: string | undefined,
  referer: string,
): Promise<VWorldResponse> {
  const url =
    `https://api.vworld.kr/req/data` +
    `?service=data` +
    `&request=GetFeature` +
    `&data=${layerName}` +
    `&geomFilter=BOX(${box})` +
    `&format=json` +
    `&key=${apiKey}` +
    `&crs=EPSG:4326` +
    `&maxFeatures=${PAGE_SIZE}`;

  const res = await fetch(url, { headers: { Referer: referer } });
  const text = await res.text();
  return JSON.parse(text) as VWorldResponse;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const box = searchParams.get("box");
  const layer = searchParams.get("layer") ?? "dong";

  if (!box && layer !== "sido") {
    return NextResponse.json(
      { error: "box parameter required" },
      { status: 400 },
    );
  }

  const layerName = LAYER_MAP[layer] ?? LAYER_MAP.dong;
  const apiKey = process.env.VWORLD_API_KEY;

  const host = request.headers.get("host") ?? "localhost:3000";
  const referer = host.startsWith("localhost") ? `http://${host}` : `https://${host}`;

  try {
    let allFeatures: unknown[];
    let baseResponse: VWorldResponse;

    if (layer === "sido") {
      // VWorld 페이지네이션 미지원 → 남북 BOX 분할 병렬 요청 후 ID 중복 제거
      const [north, south] = await Promise.all([
        fetchBox(layerName, "124,36,132,39", apiKey, referer), // 북부
        fetchBox(layerName, "124,33,132,36", apiKey, referer), // 남부
      ]);
      baseResponse = north;

      const seen = new Set<string>();
      allFeatures = [
        ...(north?.response?.result?.featureCollection?.features ?? []),
        ...(south?.response?.result?.featureCollection?.features ?? []),
      ].filter((f) => {
        const id = (f as { id?: string }).id ?? JSON.stringify(f);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    } else {
      baseResponse = await fetchBox(layerName, box as string, apiKey, referer);
      allFeatures =
        baseResponse?.response?.result?.featureCollection?.features ?? [];
    }

    const fc = baseResponse.response?.result?.featureCollection;
    if (fc) fc.features = allFeatures;
    return NextResponse.json(baseResponse);
  } catch (err) {
    console.error("VWorld fetch error:", err);
    return NextResponse.json({ error: "fetch failed" }, { status: 502 });
  }
}
