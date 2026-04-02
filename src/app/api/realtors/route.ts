import { NextRequest, NextResponse } from "next/server";

// ── 타입 ──────────────────────────────────────────────────────────────────────
interface RawLocation {
  lat: number;
  lon: number;
  name: string;
  range: "dong" | "gu";
  data: [number, number, number, number];
}

export interface RealtorResponseItem {
  lat: number;
  lon: number;
  name: string;
  range: "dong" | "gu";
  index: 0 | 1 | 2 | 3;
  data: number[];
}

interface RawBuilding {
  id: string;
  lat: number;
  lon: number;
  name: string;
  content: string;
  score: number;
}

export interface BuildingResponseItem {
  id: string;
  lat: number;
  lon: number;
  name: string;
  index: 0 | 1 | 2 | 3;
  content: string;
}

// ── 더미 위치 데이터 ──────────────────────────────────────────────────────────
const LOCATIONS: RawLocation[] = [
  // 서울 구 단위
  {
    lat: 37.5172,
    lon: 127.0473,
    name: "강남구",
    range: "gu",
    data: [88, 92, 76, 95],
  },
  {
    lat: 37.4837,
    lon: 127.0324,
    name: "서초구",
    range: "gu",
    data: [80, 85, 70, 90],
  },
  {
    lat: 37.5145,
    lon: 127.1059,
    name: "송파구",
    range: "gu",
    data: [72, 68, 80, 74],
  },
  {
    lat: 37.5301,
    lon: 127.1238,
    name: "강동구",
    range: "gu",
    data: [55, 60, 48, 62],
  },
  {
    lat: 37.5384,
    lon: 127.0822,
    name: "광진구",
    range: "gu",
    data: [60, 55, 65, 58],
  },
  {
    lat: 37.5633,
    lon: 127.0371,
    name: "성동구",
    range: "gu",
    data: [70, 65, 72, 68],
  },
  {
    lat: 37.5744,
    lon: 127.0403,
    name: "동대문구",
    range: "gu",
    data: [45, 50, 42, 48],
  },
  {
    lat: 37.6063,
    lon: 127.0927,
    name: "중랑구",
    range: "gu",
    data: [30, 35, 28, 32],
  },
  {
    lat: 37.6542,
    lon: 127.0568,
    name: "노원구",
    range: "gu",
    data: [40, 38, 42, 36],
  },
  {
    lat: 37.6688,
    lon: 127.0471,
    name: "도봉구",
    range: "gu",
    data: [25, 30, 22, 28],
  },
  {
    lat: 37.6396,
    lon: 127.0256,
    name: "강북구",
    range: "gu",
    data: [20, 18, 24, 22],
  },
  {
    lat: 37.5894,
    lon: 127.0167,
    name: "성북구",
    range: "gu",
    data: [35, 38, 32, 40],
  },
  {
    lat: 37.5735,
    lon: 126.979,
    name: "종로구",
    range: "gu",
    data: [65, 70, 60, 68],
  },
  {
    lat: 37.5641,
    lon: 126.9979,
    name: "중구",
    range: "gu",
    data: [75, 78, 72, 80],
  },
  {
    lat: 37.5313,
    lon: 126.981,
    name: "용산구",
    range: "gu",
    data: [82, 80, 85, 78],
  },
  {
    lat: 37.5663,
    lon: 126.9011,
    name: "마포구",
    range: "gu",
    data: [68, 72, 65, 70],
  },
  {
    lat: 37.5792,
    lon: 126.9368,
    name: "서대문구",
    range: "gu",
    data: [42, 45, 38, 44],
  },
  {
    lat: 37.6024,
    lon: 126.929,
    name: "은평구",
    range: "gu",
    data: [28, 32, 25, 30],
  },
  {
    lat: 37.5509,
    lon: 126.8495,
    name: "강서구",
    range: "gu",
    data: [50, 48, 55, 52],
  },
  {
    lat: 37.5172,
    lon: 126.8665,
    name: "양천구",
    range: "gu",
    data: [45, 42, 48, 46],
  },
  {
    lat: 37.4954,
    lon: 126.8874,
    name: "구로구",
    range: "gu",
    data: [38, 40, 35, 42],
  },
  {
    lat: 37.4569,
    lon: 126.8954,
    name: "금천구",
    range: "gu",
    data: [22, 25, 20, 24],
  },
  {
    lat: 37.5264,
    lon: 126.8962,
    name: "영등포구",
    range: "gu",
    data: [62, 58, 65, 60],
  },
  {
    lat: 37.5124,
    lon: 126.9393,
    name: "동작구",
    range: "gu",
    data: [55, 52, 58, 56],
  },
  {
    lat: 37.4784,
    lon: 126.9516,
    name: "관악구",
    range: "gu",
    data: [32, 35, 28, 30],
  },

  // 서울 동 단위
  {
    lat: 37.5274,
    lon: 127.0277,
    name: "압구정동",
    range: "dong",
    data: [90, 95, 88, 92],
  },
  {
    lat: 37.5198,
    lon: 127.0457,
    name: "청담동",
    range: "dong",
    data: [85, 88, 82, 90],
  },
  {
    lat: 37.5008,
    lon: 127.0368,
    name: "역삼동",
    range: "dong",
    data: [78, 80, 75, 82],
  },
  {
    lat: 37.5116,
    lon: 127.028,
    name: "논현동",
    range: "dong",
    data: [70, 72, 68, 74],
  },
  {
    lat: 37.519,
    lon: 127.0189,
    name: "신사동",
    range: "dong",
    data: [75, 78, 72, 76],
  },
  {
    lat: 37.5043,
    lon: 127.0,
    name: "반포동",
    range: "dong",
    data: [80, 82, 78, 84],
  },
  {
    lat: 37.5087,
    lon: 127.0887,
    name: "잠실동",
    range: "dong",
    data: [68, 70, 65, 72],
  },
  {
    lat: 37.515,
    lon: 127.1064,
    name: "방이동",
    range: "dong",
    data: [55, 58, 52, 56],
  },
  {
    lat: 37.5219,
    lon: 126.9244,
    name: "여의도동",
    range: "dong",
    data: [72, 75, 70, 78],
  },
  {
    lat: 37.5571,
    lon: 126.9255,
    name: "홍대입구",
    range: "dong",
    data: [60, 62, 58, 64],
  },
  {
    lat: 37.5555,
    lon: 126.9369,
    name: "신촌동",
    range: "dong",
    data: [52, 55, 48, 54],
  },
  {
    lat: 37.5495,
    lon: 126.914,
    name: "합정동",
    range: "dong",
    data: [58, 60, 55, 62],
  },
  {
    lat: 37.534,
    lon: 126.9939,
    name: "이태원동",
    range: "dong",
    data: [65, 68, 62, 70],
  },
  {
    lat: 37.5343,
    lon: 127.0016,
    name: "한남동",
    range: "dong",
    data: [76, 78, 74, 80],
  },
  {
    lat: 37.5614,
    lon: 127.0286,
    name: "왕십리동",
    range: "dong",
    data: [48, 50, 45, 52],
  },
  {
    lat: 37.5403,
    lon: 127.0703,
    name: "건대입구",
    range: "dong",
    data: [55, 58, 52, 60],
  },
  {
    lat: 37.5759,
    lon: 126.9769,
    name: "경복궁동",
    range: "dong",
    data: [62, 65, 60, 68],
  },

  // 부산 구 단위
  {
    lat: 35.1631,
    lon: 129.1635,
    name: "해운대구",
    range: "gu",
    data: [78, 80, 75, 82],
  },
  {
    lat: 35.1458,
    lon: 129.1133,
    name: "수영구",
    range: "gu",
    data: [65, 68, 62, 70],
  },
  {
    lat: 35.135,
    lon: 129.0849,
    name: "남구",
    range: "gu",
    data: [50, 52, 48, 54],
  },
  {
    lat: 35.1597,
    lon: 129.0535,
    name: "부산진구",
    range: "gu",
    data: [60, 62, 58, 64],
  },
  {
    lat: 35.2052,
    lon: 129.0833,
    name: "동래구",
    range: "gu",
    data: [55, 58, 52, 56],
  },
  {
    lat: 35.1047,
    lon: 128.9757,
    name: "사하구",
    range: "gu",
    data: [30, 32, 28, 34],
  },
  {
    lat: 35.1979,
    lon: 128.9985,
    name: "북구",
    range: "gu",
    data: [35, 38, 32, 36],
  },
  {
    lat: 35.2445,
    lon: 129.2225,
    name: "기장군",
    range: "gu",
    data: [42, 45, 38, 44],
  },

  // 부산 동 단위
  {
    lat: 35.1586,
    lon: 129.1603,
    name: "해운대동",
    range: "dong",
    data: [80, 82, 78, 84],
  },
  {
    lat: 35.1572,
    lon: 129.057,
    name: "서면동",
    range: "dong",
    data: [68, 70, 65, 72],
  },
  {
    lat: 35.1693,
    lon: 129.1316,
    name: "센텀동",
    range: "dong",
    data: [72, 75, 70, 76],
  },
  {
    lat: 35.1663,
    lon: 129.0632,
    name: "범일동",
    range: "dong",
    data: [48, 50, 45, 52],
  },

  // 인천 구 단위
  {
    lat: 37.4469,
    lon: 126.7314,
    name: "남동구",
    range: "gu",
    data: [45, 48, 42, 46],
  },
  {
    lat: 37.4106,
    lon: 126.6785,
    name: "연수구",
    range: "gu",
    data: [55, 58, 52, 56],
  },
  {
    lat: 37.5072,
    lon: 126.7215,
    name: "부평구",
    range: "gu",
    data: [40, 42, 38, 44],
  },
  {
    lat: 37.5374,
    lon: 126.7379,
    name: "계양구",
    range: "gu",
    data: [32, 35, 28, 34],
  },
  {
    lat: 37.5454,
    lon: 126.6767,
    name: "서구",
    range: "gu",
    data: [38, 40, 35, 42],
  },
  {
    lat: 37.4731,
    lon: 126.622,
    name: "중구(인천)",
    range: "gu",
    data: [50, 52, 48, 54],
  },

  // 인천 동 단위
  {
    lat: 37.4511,
    lon: 126.7052,
    name: "구월동",
    range: "dong",
    data: [48, 50, 45, 52],
  },
  {
    lat: 37.3948,
    lon: 126.6482,
    name: "송도동",
    range: "dong",
    data: [62, 65, 60, 68],
  },
  {
    lat: 37.5392,
    lon: 126.6534,
    name: "청라동",
    range: "dong",
    data: [55, 58, 52, 56],
  },

  // 대전 구 단위
  {
    lat: 36.3624,
    lon: 127.3562,
    name: "유성구",
    range: "gu",
    data: [60, 62, 58, 64],
  },
  {
    lat: 36.355,
    lon: 127.3833,
    name: "서구(대전)",
    range: "gu",
    data: [55, 58, 52, 56],
  },
  {
    lat: 36.3254,
    lon: 127.4225,
    name: "중구(대전)",
    range: "gu",
    data: [42, 45, 38, 44],
  },
  {
    lat: 36.3126,
    lon: 127.4542,
    name: "동구(대전)",
    range: "gu",
    data: [30, 32, 28, 34],
  },
  {
    lat: 36.3463,
    lon: 127.4156,
    name: "대덕구",
    range: "gu",
    data: [35, 38, 32, 36],
  },

  // 대전 동 단위
  {
    lat: 36.3541,
    lon: 127.3783,
    name: "둔산동",
    range: "dong",
    data: [58, 60, 55, 62],
  },
  {
    lat: 36.3843,
    lon: 127.3334,
    name: "노은동",
    range: "dong",
    data: [45, 48, 42, 46],
  },
  {
    lat: 36.3618,
    lon: 127.344,
    name: "유성온천동",
    range: "dong",
    data: [52, 55, 48, 54],
  },

  // 대구 구 단위
  {
    lat: 35.8582,
    lon: 128.6308,
    name: "수성구",
    range: "gu",
    data: [70, 72, 68, 74],
  },
  {
    lat: 35.8299,
    lon: 128.5326,
    name: "달서구",
    range: "gu",
    data: [55, 58, 52, 56],
  },
  {
    lat: 35.8849,
    lon: 128.5822,
    name: "북구(대구)",
    range: "gu",
    data: [40, 42, 38, 44],
  },
  {
    lat: 35.8874,
    lon: 128.6383,
    name: "동구(대구)",
    range: "gu",
    data: [35, 38, 32, 36],
  },
  {
    lat: 35.8718,
    lon: 128.5598,
    name: "서구(대구)",
    range: "gu",
    data: [42, 45, 38, 44],
  },
  {
    lat: 35.8694,
    lon: 128.6062,
    name: "중구(대구)",
    range: "gu",
    data: [60, 62, 58, 64],
  },

  // 대구 동 단위
  {
    lat: 35.8557,
    lon: 128.6228,
    name: "범어동",
    range: "dong",
    data: [72, 75, 70, 76],
  },
  {
    lat: 35.8562,
    lon: 128.6342,
    name: "수성동",
    range: "dong",
    data: [68, 70, 65, 72],
  },
  {
    lat: 35.8736,
    lon: 128.5978,
    name: "동인동",
    range: "dong",
    data: [50, 52, 48, 54],
  },

  // 광주 구 단위
  {
    lat: 35.1396,
    lon: 126.7937,
    name: "광산구",
    range: "gu",
    data: [48, 50, 45, 52],
  },
  {
    lat: 35.1734,
    lon: 126.9127,
    name: "북구(광주)",
    range: "gu",
    data: [38, 40, 35, 42],
  },
  {
    lat: 35.1519,
    lon: 126.8911,
    name: "서구(광주)",
    range: "gu",
    data: [52, 55, 48, 54],
  },
  {
    lat: 35.1312,
    lon: 126.9031,
    name: "남구(광주)",
    range: "gu",
    data: [42, 45, 38, 44],
  },
  {
    lat: 35.1458,
    lon: 126.9237,
    name: "동구(광주)",
    range: "gu",
    data: [35, 38, 32, 36],
  },

  // 광주 동 단위
  {
    lat: 35.2215,
    lon: 126.8479,
    name: "첨단동",
    range: "dong",
    data: [55, 58, 52, 56],
  },
  {
    lat: 35.1543,
    lon: 126.8508,
    name: "상무동",
    range: "dong",
    data: [60, 62, 58, 64],
  },
  {
    lat: 35.1317,
    lon: 126.9063,
    name: "봉선동",
    range: "dong",
    data: [45, 48, 42, 46],
  },

  // 경기도 (gu 수준)
  {
    lat: 37.2636,
    lon: 127.0286,
    name: "수원 팔달구",
    range: "gu",
    data: [58, 60, 55, 62],
  },
  {
    lat: 37.3825,
    lon: 127.1218,
    name: "성남 분당구",
    range: "gu",
    data: [75, 78, 72, 80],
  },
  {
    lat: 37.6765,
    lon: 126.7758,
    name: "고양 일산동구",
    range: "gu",
    data: [50, 52, 48, 54],
  },
  {
    lat: 37.3214,
    lon: 127.095,
    name: "용인 수지구",
    range: "gu",
    data: [65, 68, 62, 70],
  },
  {
    lat: 37.3955,
    lon: 126.9463,
    name: "안양 만안구",
    range: "gu",
    data: [42, 45, 38, 44],
  },
  {
    lat: 37.5006,
    lon: 126.7648,
    name: "부천 원미구",
    range: "gu",
    data: [38, 40, 35, 42],
  },
  {
    lat: 37.3218,
    lon: 126.831,
    name: "안산 단원구",
    range: "gu",
    data: [32, 35, 28, 34],
  },
  {
    lat: 37.1997,
    lon: 126.8312,
    name: "화성시",
    range: "gu",
    data: [45, 48, 42, 46],
  },
  {
    lat: 37.7601,
    lon: 126.7801,
    name: "파주시",
    range: "gu",
    data: [28, 30, 25, 32],
  },
  {
    lat: 37.7382,
    lon: 127.0337,
    name: "의정부시",
    range: "gu",
    data: [35, 38, 32, 36],
  },

  // 울산 구 단위
  {
    lat: 35.5395,
    lon: 129.3314,
    name: "울산 남구",
    range: "gu",
    data: [55, 58, 52, 56],
  },
  {
    lat: 35.6011,
    lon: 129.3598,
    name: "울산 북구",
    range: "gu",
    data: [40, 42, 38, 44],
  },
  {
    lat: 35.5223,
    lon: 129.0052,
    name: "울주군",
    range: "gu",
    data: [30, 32, 28, 34],
  },

  // 세종
  {
    lat: 36.48,
    lon: 127.289,
    name: "세종시",
    range: "gu",
    data: [62, 65, 60, 68],
  },
];

// ── 건물 더미 데이터 ──────────────────────────────────────────────────────────
const BUILDINGS: RawBuilding[] = [
  {
    id: "bld-001",
    lat: 37.5274,
    lon: 127.0277,
    name: "압구정현대아파트",
    content: "경매 진행",
    score: 88,
  },
  {
    id: "bld-002",
    lat: 37.5198,
    lon: 127.0457,
    name: "청담 르엘",
    content: "보증사고",
    score: 72,
  },
  {
    id: "bld-003",
    lat: 37.5008,
    lon: 127.0368,
    name: "역삼 아이파크",
    content: "과거경매이력",
    score: 45,
  },
  {
    id: "bld-004",
    lat: 37.5116,
    lon: 127.028,
    name: "논현 센트럴",
    content: "경매 진행",
    score: 91,
  },
  {
    id: "bld-005",
    lat: 37.519,
    lon: 127.0189,
    name: "신사 갤러리아",
    content: "정상",
    score: 20,
  },
  {
    id: "bld-006",
    lat: 37.5043,
    lon: 127.0,
    name: "반포 자이",
    content: "보증사고",
    score: 65,
  },
  {
    id: "bld-007",
    lat: 37.5087,
    lon: 127.0887,
    name: "잠실 롯데캐슬",
    content: "과거경매이력",
    score: 55,
  },
  {
    id: "bld-008",
    lat: 37.515,
    lon: 127.1064,
    name: "방이동 올림픽훼밀리",
    content: "경매 진행",
    score: 80,
  },
  {
    id: "bld-009",
    lat: 37.5219,
    lon: 126.9244,
    name: "여의도 파크원",
    content: "정상",
    score: 15,
  },
  {
    id: "bld-010",
    lat: 37.5571,
    lon: 126.9255,
    name: "홍대 현대타운",
    content: "보증사고",
    score: 60,
  },
  {
    id: "bld-011",
    lat: 37.5343,
    lon: 127.0016,
    name: "한남 더힐",
    content: "경매 진행",
    score: 95,
  },
  {
    id: "bld-012",
    lat: 37.5614,
    lon: 127.0286,
    name: "왕십리 비발디",
    content: "과거경매이력",
    score: 40,
  },
  {
    id: "bld-013",
    lat: 37.5635,
    lon: 126.9997,
    name: "성동 SK뷰",
    content: "정상",
    score: 22,
  },
  {
    id: "bld-014",
    lat: 37.5172,
    lon: 126.8665,
    name: "목동 하이페리온",
    content: "보증사고",
    score: 70,
  },
  {
    id: "bld-015",
    lat: 37.5509,
    lon: 126.8495,
    name: "마곡 엠밸리",
    content: "정상",
    score: 18,
  },
];

// ── 유틸 ──────────────────────────────────────────────────────────────────────
function toIndex(data: number[]): 0 | 1 | 2 | 3 {
  const avg = data.reduce((a, b) => a + b, 0) / data.length;
  if (avg < 25) return 0;
  if (avg < 50) return 1;
  if (avg < 75) return 2;
  return 3;
}

// zoom 레벨별 필터 반경 (단위: 위경도 degree)
function getRadius(zoom: number): number {
  if (zoom >= 16) return 0.05;
  if (zoom >= 13) return 0.15;
  if (zoom >= 10) return 0.7;
  return 1.5;
}

// ── GET /api/realtors?lat=&lng=&zoom=&lv= ────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lat = parseFloat(searchParams.get("lat") ?? "37.5");
  const lng = parseFloat(searchParams.get("lng") ?? "127.0");
  const zoom = parseInt(searchParams.get("zoom") ?? "10", 10);
  const lv = parseInt(searchParams.get("lv") ?? String(zoom), 10);

  // lv >= 16: 건물 핀 데이터 반환
  if (lv >= 16) {
    const radius = getRadius(lv);
    const data: BuildingResponseItem[] = BUILDINGS.filter(
      (b) => Math.abs(b.lat - lat) <= radius && Math.abs(b.lon - lng) <= radius,
    ).map((b) => ({
      id: b.id,
      lat: b.lat,
      lon: b.lon,
      name: b.name,
      content: b.content,
      index: toIndex([b.score]),
    }));
    return NextResponse.json({ data });
  }

  const radius = getRadius(zoom);
  const rangeFilter: "dong" | "gu" = zoom >= 13 ? "dong" : "gu";

  const data: RealtorResponseItem[] = LOCATIONS.filter(
    (p) =>
      p.range === rangeFilter &&
      Math.abs(p.lat - lat) <= radius &&
      Math.abs(p.lon - lng) <= radius,
  ).map((p) => ({
    ...p,
    index: toIndex(p.data),
  }));

  return NextResponse.json({ data });
}
