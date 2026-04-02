import { select } from "d3-selection";

export interface RealtorPoint {
  lat: number;
  lon: number;
  name: string;
  range: "dong" | "gu";
  index: 0 | 1 | 2 | 3;
  data: number[];
}

export interface BuildingPin {
  lat: number;
  lon: number;
  id: string;
  name: string;
  index: 0 | 1 | 2 | 3;
  content: string;
}

function isBuildingPin(p: RealtorPoint | BuildingPin): p is BuildingPin {
  return "id" in p;
}

const INDEX_LABEL: Record<0 | 1 | 2 | 3, string> = {
  0: "없음",
  1: "낮음",
  2: "중간",
  3: "높음",
};

const PIN_RECT_H = 47;
const PIN_MAX_W = 140;
const PIN_MIN_W = 98;
const PIN_PAD_X = 10;
const PIN_TRI_H = 7.5;
const PIN_TRI_CX = 4.5;

// index별 solid fill 색상
const COLORS: string[] = [
  "#D3D3D3", // 없음 - 회색
  "#FDBA74", // 낮음 - 초록
  "#F97316", // 중간 - 주황
  "#D84315", // 높음 - 빨강 (피그마 원본)
];

interface ClusterItem {
  cx: number;
  cy: number;
  count: number;
  name: string;
  index: 0 | 1 | 2 | 3;
  data: number[];
}

export function createClusterOverlayClass(navermaps: typeof naver.maps) {
  return class ClusterOverlay extends navermaps.OverlayView {
    private _svg: SVGSVGElement | null = null;
    private _clusterGroup: SVGGElement | null = null;
    private _pinGroup: SVGGElement | null = null;
    private _points: (RealtorPoint | BuildingPin)[] = [];
    private _rafId: number | null = null;

    private _onClickFeature: (
      feature: null,
      layer: null,
      clickedLatLng: naver.maps.LatLng,
    ) => void;

    constructor(
      onClickFeature: (
        feature: null,
        layer: null,
        clickedLatLng: naver.maps.LatLng,
      ) => void,
    ) {
      super();
      this._onClickFeature = onClickFeature;
      console.log("[ClusterOverlay] constructor");
    }

    onAdd() {
      console.log("[ClusterOverlay] onAdd");
      const pane = this.getPanes().overlayLayer;

      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.id = "CluterOverlay";
      svg.style.cssText =
        "position:absolute;top:0;left:0;width:fit-content;height:fit-content;overflow:visible;pointer-events:none";
      this._svg = svg;

      // 피그마 SVG 구조 그대로:
      // solid 원에 feGaussianBlur 필터 → 중심 불투명, 가장자리 자연스럽게 페이드
      //
      // filterUnits="userSpaceOnUse" + 충분히 큰 x/y/width/height:
      // r_max=60, stdDeviation=17.5 → blur 번짐 ~3×17.5=52px
      // 따라서 필터 박스는 원 중심 기준 -(60+60)~+(60+60) 정도면 충분
      const defs = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "defs",
      );
      for (let i = 0; i < COLORS.length; i++) {
        const filter = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "filter",
        );
        filter.id = "blur-" + i;
        filter.setAttribute("x", "-200");
        filter.setAttribute("y", "-200");
        filter.setAttribute("width", "400");
        filter.setAttribute("height", "400");
        filter.setAttribute("filterUnits", "userSpaceOnUse");
        filter.setAttribute("color-interpolation-filters", "sRGB");

        const feFlood = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "feFlood",
        );
        feFlood.setAttribute("flood-opacity", "0");
        feFlood.setAttribute("result", "BackgroundImageFix");

        const feBlend = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "feBlend",
        );
        feBlend.setAttribute("mode", "normal");
        feBlend.setAttribute("in", "SourceGraphic");
        feBlend.setAttribute("in2", "BackgroundImageFix");
        feBlend.setAttribute("result", "shape");

        const feBlur = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "feGaussianBlur",
        );
        feBlur.setAttribute("stdDeviation", "17.5");
        feBlur.setAttribute("result", "effect1_foregroundBlur");

        filter.appendChild(feFlood);
        filter.appendChild(feBlend);
        filter.appendChild(feBlur);
        defs.appendChild(filter);
      }
      svg.appendChild(defs);

      const clusterG = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "g",
      );
      clusterG.dataset.layer = "cluster";
      clusterG.id = "cluster";
      svg.appendChild(clusterG);
      this._clusterGroup = clusterG;

      const pinG = document.createElementNS("http://www.w3.org/2000/svg", "g");
      pinG.dataset.layer = "pin";
      pinG.id = "pin";
      svg.appendChild(pinG);
      this._pinGroup = pinG;

      pane.appendChild(svg);
    }

    draw() {
      if (this._rafId !== null) cancelAnimationFrame(this._rafId);
      this._rafId = requestAnimationFrame(() => {
        this._rafId = null;
        if (!this._svg || this._points.length === 0) return;

        const map = this.getMap() as naver.maps.Map | null;
        if (!map) return;

        let proj: naver.maps.MapSystemProjection | null = null;
        try {
          proj = this.getProjection();
        } catch {
          return;
        }
        if (!proj) return;

        const zoom = map.getZoom();

        if (zoom >= 16) {
          this._renderPins(proj);
          select(this._clusterGroup!).selectAll("*").remove();
        } else {
          this._renderClusters(proj, zoom);
          select(this._pinGroup!).selectAll("*").remove();
        }
      });
    }

    setPoints(points: (RealtorPoint | BuildingPin)[]) {
      console.log("[ClusterOverlay] setPoints: " + points.length + "개");
      this._points = points;
      this.draw();
    }

    clear() {
      console.log("[ClusterOverlay] clear");
      this._points = [];
      if (this._clusterGroup)
        select(this._clusterGroup).selectAll("*").remove();
      if (this._pinGroup) select(this._pinGroup).selectAll("*").remove();
    }

    onRemove() {
      console.log("[ClusterOverlay] onRemove");
      if (this._rafId !== null) {
        cancelAnimationFrame(this._rafId);
        this._rafId = null;
      }
      this._svg?.parentNode?.removeChild(this._svg);
      this._svg = null;
      this._clusterGroup = null;
      this._pinGroup = null;
      this.onAdd();
    }

    private _computeClusters(
      proj: naver.maps.MapSystemProjection,
      zoom: number,
    ): ClusterItem[] {
      const cellSize = Math.max(40, 120 - zoom * 5);
      const grid = new Map<
        string,
        { sumX: number; sumY: number; count: number; rep: RealtorPoint }
      >();

      for (const pt of this._points as RealtorPoint[]) {
        const pixel = proj.fromCoordToOffset(
          new naver.maps.LatLng(pt.lat, pt.lon),
        );
        const col = Math.floor(pixel.x / cellSize);
        const row = Math.floor(pixel.y / cellSize);
        const key = col + "," + row;
        const cell = grid.get(key) ?? { sumX: 0, sumY: 0, count: 0, rep: pt };
        cell.sumX += pixel.x;
        cell.sumY += pixel.y;
        cell.count++;
        grid.set(key, cell);
      }

      return Array.from(grid.values()).map((c) => ({
        cx: c.sumX / c.count,
        cy: c.sumY / c.count,
        count: c.count,
        name: c.rep.name,
        index: c.rep.index,
        data: c.rep.data,
      }));
    }

    private _renderClusters(
      proj: naver.maps.MapSystemProjection,
      zoom: number,
    ) {
      const clusters = this._computeClusters(proj, zoom);
      const g = this._clusterGroup!;
      select(g).selectAll("*").remove();

      const groups = select(g)
        .selectAll<SVGGElement, ClusterItem>("g")
        .data(clusters)
        .enter()
        .append("g")
        .attr("transform", (d) => "translate(" + d.cx + "," + d.cy + ")");

      let startX: number;
      let startY: number;
      // solid 원 + feGaussianBlur 필터
      groups
        .append("circle")
        .attr("r", (d) => Math.min(80 + Math.sqrt(d.count) * 3, 100))
        .attr("fill", (d) => COLORS[d.index])
        .attr("filter", (d) => "url(#blur-" + d.index + ")")
        .style("pointer-events", "all")
        .style("cursor", "pointer")
        .on("mousedown", (event) => {
          // 마우스가 눌린 시점의 좌표 저장
          startX = event.clientX;
          startY = event.clientY;
          event.currentTarget.style.cursor = "grabbing";
        })
        .on("mouseup", (event, d) => {
          // 마우스가 떼진 시점의 좌표 계산
          const diffX = Math.abs(event.clientX - startX);
          const diffY = Math.abs(event.clientY - startY);

          const projection = this.getProjection();
          const pixel = new naver.maps.Point(event.offsetX, event.offsetY);
          const clickedLatLng = projection.fromOffsetToCoord(
            pixel,
          ) as naver.maps.LatLng;
          event.currentTarget.style.cursor = "pointer";

          // 이동 거리가 짧을 때만(예: 5px 미만) 클릭 함수 실행
          if (diffX < 5 && diffY < 5) {
            this._onClickFeature(null, null, clickedLatLng);
          }
        });

      // 1row: name
      groups
        .append("text")
        .text((d) => d.name)
        .attr("text-anchor", "middle")
        .attr("pointer-events", "none")
        .attr("class", "cluter_name");

      // 2row: index 상태
      groups
        .append("text")
        .text((d) => INDEX_LABEL[d.index])
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .attr("pointer-events", "none")
        .attr("class", "cluter_status");
      console.log(zoom, "-------zooooooooooo");
      if (zoom > 14) return;
      // 3row: data[0] / data[1]
      groups
        .append("text")
        .text((d) => (d.data[0] ?? "-") + " · " + (d.data[1] ?? "-"))
        .attr("text-anchor", "middle")
        .attr("pointer-events", "none")
        .attr("class", "cluter_content");
    }

    private _renderPins(proj: naver.maps.MapSystemProjection) {
      const key = (d: RealtorPoint | BuildingPin) =>
        isBuildingPin(d) ? d.id : d.lat + "," + d.lon;

      const pins = select(this._pinGroup!)
        .selectAll<SVGGElement, RealtorPoint | BuildingPin>("g.pin")
        .data(this._points, key);

      pins.exit().remove();

      const entered = pins
        .enter()
        .append("g")
        .attr("class", "pin")
        .style("pointer-events", "all")
        .style("cursor", "pointer");

      entered.each(function (d) {
        const g = select(this);
        if (isBuildingPin(d)) {
          // 건물 카드 핀: 컬러 배경 + 이름 + 상태
          const rect = g.append("rect").attr("rx", 6).attr("fill", COLORS[d.index]);
          // 아래 삼각형 꼬리 — tip을 (0,0)에 맞춤
          g.append("path")
            .attr(
              "d",
              "M5.33185 7.5C4.94695 8.16667 3.9847 8.16667 3.59979 7.5L0.135695 1.5C-0.249205 0.833333 0.23192 -8.94676e-07 1.00172 -8.27378e-07L7.92992 -2.21695e-07C8.69972 -1.54397e-07 9.18085 0.833333 8.79595 1.5L5.33185 7.5Z",
            )
            .attr("fill", COLORS[d.index])
            .attr("transform", `translate(-${PIN_TRI_CX}, -${PIN_TRI_H})`);

          const textGroup = g.append("g");
          const nameEl = textGroup.append("text").text(d.name).attr("class", "pin_name");
          const contentEl = textGroup
            .append("text")
            .text(d.content)
            .attr("class", "pin_content")
            .attr("dy", "16");

          // 텍스트 너비 측정 후 rect 너비 결정
          const nameW = (nameEl.node() as SVGTextElement).getComputedTextLength();
          const contentW = (contentEl.node() as SVGTextElement).getComputedTextLength();
          const rawW = Math.max(nameW, contentW) + PIN_PAD_X * 2;
          const rectW = Math.min(Math.max(rawW, PIN_MIN_W), PIN_MAX_W);
          const maxTextW = rectW - PIN_PAD_X * 2;

          // name이 max 너비 초과 시 말줄임표
          if (nameW > maxTextW) {
            let s = d.name;
            while (s.length > 0) {
              s = s.slice(0, -1);
              nameEl.text(s + "…");
              if ((nameEl.node() as SVGTextElement).getComputedTextLength() <= maxTextW) break;
            }
          }

          rect
            .attr("x", -rectW / 2)
            .attr("y", -(PIN_TRI_H + PIN_RECT_H))
            .attr("width", rectW)
            .attr("height", PIN_RECT_H);

          // 텍스트 그룹: rect 내 상단 기준 배치
          textGroup.attr(
            "transform",
            `translate(${-rectW / 2 + PIN_PAD_X}, ${-(PIN_TRI_H + PIN_RECT_H) + 17})`,
          );
        } else {
          g.append("circle")
            .attr("r", 10)
            .attr("fill", COLORS[d.index])
            .attr("filter", "url(#blur-" + d.index + ")");
          g.append("title").text(d.name);
        }
      });

      pins.merge(entered).attr("transform", (d) => {
        const pixel = proj.fromCoordToOffset(
          new naver.maps.LatLng(d.lat, d.lon),
        );
        return "translate(" + pixel.x + "," + pixel.y + ")";
      });
    }
  };
}
