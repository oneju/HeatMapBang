export interface RawBuilding {
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

export function toIndex(data: number[]): 0 | 1 | 2 | 3 {
  const avg = data.reduce((a, b) => a + b, 0) / data.length;
  if (avg < 25) return 0;
  if (avg < 50) return 1;
  if (avg < 75) return 2;
  return 3;
}

export const BUILDINGS: RawBuilding[] = [
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
