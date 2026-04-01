import { NextRequest, NextResponse } from "next/server";

const LAYER_MAP: Record<string, string> = {
  sido: "LT_C_ADSIDO_INFO", // 시도 (zoom 7-9)
  sigungu: "LT_C_ADSIGG_INFO", // 시군구 (zoom 10-12)
  dong: "LT_C_ADEMD_INFO", // 읍면동 (zoom 13+)
};

const PAGE_SIZE = 10;

// 레이어별 좌표 정밀도: sido는 111m 단위면 충분, 세부 레이어는 정밀하게
const PRECISION: Record<string, number> = {
  sido: 1e3,
  sigungu: 1e4,
  dong: 1e5,
};

function roundPair(pair: number[], precision: number): number[] {
  return [
    Math.round(pair[0] * precision) / precision,
    Math.round(pair[1] * precision) / precision,
  ];
}

// 반올림 후 연속 중복 꼭짓점 제거
function dedupeRing(ring: number[][]): number[][] {
  return ring.filter((pt, i) => {
    if (i === 0) return true;
    const prev = ring[i - 1];
    return pt[0] !== prev[0] || pt[1] !== prev[1];
  });
}

// 코드/이름 관련 필드만 유지, 나머지 제거
function stripProperties(props: unknown): Record<string, unknown> {
  if (!props || typeof props !== "object") return {};
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props as Record<string, unknown>)) {
    const lower = k.toLowerCase();
    if (lower === "id" || lower.includes("cd") || lower.includes("nm")) {
      result[k] = v;
    }
  }
  return result;
}

function simplifyFeature(f: unknown, precision: number): unknown {
  if (!f || typeof f !== "object") return f;
  const feat = f as Record<string, unknown>;
  const geom = feat.geometry as { type?: string; coordinates?: unknown } | null;
  const properties = stripProperties(feat.properties);
  if (!geom) return { ...feat, properties };
  if (geom.type === "Polygon") {
    return {
      ...feat,
      properties,
      geometry: {
        ...geom,
        coordinates: (geom.coordinates as number[][][]).map((ring) =>
          dedupeRing(ring.map((p) => roundPair(p, precision))),
        ),
      },
    };
  }
  if (geom.type === "MultiPolygon") {
    return {
      ...feat,
      properties,
      geometry: {
        ...geom,
        coordinates: (geom.coordinates as number[][][][]).map((poly) =>
          poly.map((ring) =>
            dedupeRing(ring.map((p) => roundPair(p, precision))),
          ),
        ),
      },
    };
  }
  return { ...feat, properties };
}

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

const FETCH_TIMEOUT_MS = 5000;

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

  const res = await fetch(url, {
    headers: { Referer: referer },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
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
  const referer = host.startsWith("localhost")
    ? `http://${host}`
    : `https://${host}`;

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
    const precision = PRECISION[layer] ?? PRECISION.dong;
    const simplified = allFeatures.map((f) => simplifyFeature(f, precision));

    const fc = baseResponse.response?.result?.featureCollection;
    if (fc) fc.features = simplified;
    return NextResponse.json(baseResponse);
  } catch (err) {
    console.error("VWorld fetch error:", err);
    return NextResponse.json({ error: "fetch failed" }, { status: 502 });
  }
}
