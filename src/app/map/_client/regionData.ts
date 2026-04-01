/**
 * 지역별 수치 데이터 모듈
 *
 * regionValueMap: 지역명 → 수치 매핑
 * 실제 API/DB로 교체할 때는 이 Map을 동적으로 채우면 됩니다.
 *
 * 예시) API에서 받아온 데이터로 교체:
 *   const res = await fetch("/api/region-stats");
 *   const data: { name: string; value: number }[] = await res.json();
 *   const map = new Map(data.map((d) => [d.name, d.value]));
 */

// ─── Mock 데이터 ──────────────────────────────────────────────────────────────
// 나중에 실제 API로 교체하세요
const MOCK_DATA: Record<string, number> = {};

export const regionValueMap = (
  arr: Record<string, unknown>[],
): Map<string, number> => {
  const data_set: Record<string, number> = {};
  arr.forEach((v) => {
    const keys = [...Object.keys(v)];
    const cd = keys.find((k) => k.includes("cd"));
    const nm = keys.find((k) => k.includes("kor_nm"));

    if (cd && nm) {
      data_set[String(v[nm])] = Number(v[cd]);
    }
  });

  return new Map(Object.entries(data_set));
};

// ─── 색상 단계 ────────────────────────────────────────────────────────────────
// 값이 없는 지역: 회색
// 값 있는 지역: 낮음(연함) → 높음(진함) 5단계
const STEPS = ["#D3D3D3", "#FDBA74", "#F97316", "#EA580C", "#D84315"] as const;
const NO_DATA_COLOR = "#D3D3D3";

/**
 * 현재 화면에 보이는 지역들의 값을 5분위로 나눠 색상 단계를 반환합니다.
 * values: 화면에 보이는 모든 지역의 값 배열
 */
export function buildColorScale(
  values: number[],
): (value: number | undefined) => string {
  if (values.length === 0) return () => NO_DATA_COLOR;

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  // 5분위 경계값
  const quantiles = STEPS.map(
    (_, i) => sorted[Math.floor((i / STEPS.length) * n)],
  );

  return (value: number | undefined) => {
    if (value == null) return NO_DATA_COLOR;

    const stepIndex = quantiles.findLastIndex((q) => value >= q);
    return STEPS[Math.max(0, stepIndex)] ?? STEPS[0];
  };
}

/** 레이어별 properties에서 지역명을 꺼내는 키 */
export const REGION_NAME_KEY: Record<string, string> = {
  sido: "CTP_KOR_NM",
  sigungu: "SIG_KOR_NM",
  dong: "EMD_KOR_NM",
};
