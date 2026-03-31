import { select } from "d3-selection";
import { geoPath } from "d3-geo";
import type { GeoPermissibleObjects } from "d3-geo";

export interface GeoFeature {
  properties: Record<string, string>;
  geometry:
    | { type: "Polygon"; coordinates: number[][][] }
    | { type: "MultiPolygon"; coordinates: number[][][][] }
    | null;
}

type LayerName = "sido" | "sigungu" | "dong";

interface LayerState {
  features: GeoFeature[];
  getColor: (value: number | undefined) => string;
  nameKey: string;
  valueMap: Map<string, number>;
}

/**
 * Naver Maps OverlayView를 상속한 D3 SVG 히트맵 오버레이.
 *
 * 구조:
 * - updateLayer(): D3 data join으로 path 생성/제거 + fill 갱신 (좌표 계산 없음)
 * - draw():        zoom/pan 마다 Naver가 호출 → path의 "d" 속성(좌표) 갱신
 *
 * updateLayer()에서는 path를 만들기만 하고 draw()에 좌표 계산을 위임한다.
 * 이로써 projection이 준비되기 전에 updateLayer()가 호출돼도 안전하다.
 */
export function createHeatmapOverlayClass(navermaps: typeof naver.maps) {
  return class HeatmapOverlay extends navermaps.OverlayView {
    private _svg: SVGSVGElement | null = null;
    private _layers: Record<LayerName, SVGGElement | null> = {
      sido: null,
      sigungu: null,
      dong: null,
    };
    private _rafId: number | null = null;
    private _onClickFeature: (
      feature: GeoFeature,
      layer: LayerName,
      clickedLatLng: naver.maps.LatLng,
    ) => void;

    constructor(
      onClickFeature: (
        feature: GeoFeature,
        layer: LayerName,
        clickedLatLng: naver.maps.LatLng,
      ) => void,
    ) {
      super();
      this._onClickFeature = onClickFeature;
      console.log("[HeatmapOverlay] constructor");
    }

    onAdd() {
      console.log("[HeatmapOverlay] onAdd");
      const pane = this.getPanes().overlayLayer;

      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.style.cssText =
        "position:absolute;top:0;left:0;width:fit-content;height:fit-content;overflow:visible;pointer-events:none";
      this._svg = svg;

      const layerOrder: LayerName[] = ["sido", "sigungu", "dong"];
      layerOrder.forEach((name) => {
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.dataset.layer = name;
        svg.appendChild(g);
        this._layers[name] = g;
      });

      pane.appendChild(svg);
      console.log("[HeatmapOverlay] SVG appended to overlayLayer pane", pane);
    }

    /**
     * Naver Maps가 zoom/pan 시 자동 호출.
     * 모든 레이어의 path "d" 속성을 현재 viewport 기준으로 재계산.
     */
    draw() {
      if (this._rafId !== null) cancelAnimationFrame(this._rafId);
      this._rafId = requestAnimationFrame(() => {
        this._rafId = null;
        if (!this._svg) return;

        const projection = this._makeProjection();
        if (!projection) {
          console.warn("[HeatmapOverlay] draw(): projection not available yet");
          return;
        }

        const pathGen = geoPath(projection as any);
        let updatedCount = 0;

        select(this._svg)
          .selectAll<SVGPathElement, GeoFeature>("path")
          .attr("d", (d) => {
            if (!d.geometry) return "";
            updatedCount++;

            return (
              pathGen({
                type: "Feature",
                properties: d.properties,
                geometry: d.geometry as GeoPermissibleObjects,
              } as any) ?? ""
            );
          });

        if (updatedCount > 0) {
          const firstD =
            select(this._svg!).select<SVGPathElement>("path").attr("d") ?? "";
          console.log(
            `[HeatmapOverlay] draw() 완료: ${updatedCount}개 path 갱신, 첫 path d(60): "${firstD.substring(0, 60)}"`,
          );
        } else {
          console.log("[HeatmapOverlay] draw() 완료: 0개 path 갱신");
        }
      });
    }

    onRemove() {
      console.log("[HeatmapOverlay] onRemove");
      if (this._rafId !== null) {
        cancelAnimationFrame(this._rafId);
        this._rafId = null;
      }
      this._svg?.parentNode?.removeChild(this._svg);
      this._svg = null;
      this._layers = { sido: null, sigungu: null, dong: null };
      this.onAdd();
    }

    /**
     * 데이터 바인딩: path 생성/제거 + fill 갱신.
     * 좌표("d" 속성)는 draw()에 위임 → projection 준비 여부와 무관하게 안전.
     */
    updateLayer(
      layer: LayerName,
      features: GeoFeature[],
      getColor: (value: number | undefined) => string,
      nameKey: string,
      valueMap: Map<string, number>,
    ) {
      const g = this._layers[layer];
      if (!g) {
        console.warn(
          "[HeatmapOverlay] updateLayer: <g> not found for layer:",
          layer,
          "- onAdd() 미실행 가능성",
        );
        return;
      }

      console.log(
        `[HeatmapOverlay] updateLayer: layer=${layer}, features=${features.length}`,
      );

      const key = (d: GeoFeature) =>
        d.properties?.["id"] ?? JSON.stringify(d.properties);

      const paths = select(g)
        .selectAll<SVGPathElement, GeoFeature>("path")
        .data(features, key);

      let startX: number;
      let startY: number;
      // enter: 새 폴리곤 생성 (좌표는 draw()가 설정)
      const entered = paths
        .enter()
        .append("path")
        .attr("stroke", "#fff")
        .attr("stroke-width", "1.5")
        .attr("stroke-opacity", "0.8")
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
          const clickedLatLng = projection.fromOffsetToCoord(pixel);
          event.currentTarget.style.cursor = "pointer";

          // 이동 거리가 짧을 때만(예: 5px 미만) 클릭 함수 실행
          if (diffX < 5 && diffY < 5) {
            this._onClickFeature(d, layer, clickedLatLng);
          }
        });
      // enter + update: fill 갱신
      paths
        .merge(entered)
        .attr("fill", (d) => {
          const regionName = (d.properties?.[nameKey] ?? "").split(" ")[0];
          const color = getColor(valueMap.get(regionName));

          return color;
        })
        .attr("fill-opacity", "0.4");

      // exit: 사라진 폴리곤 제거
      const exitCount = paths.exit().size();
      paths.exit().remove();

      console.log(
        `[HeatmapOverlay] updateLayer 완료: enter=${entered.size()}, exit=${exitCount}`,
      );

      // 새로 생성된 path에 좌표 반영 → draw() 호출
      this.draw();
    }

    clearLayer(layer: LayerName) {
      const g = this._layers[layer];
      if (!g) return;
      console.log(`[HeatmapOverlay] clearLayer: ${layer}`);
      select(g).selectAll("path").remove();
    }

    /** 위경도 → 현재 viewport 픽셀 변환 projection 생성 */
    private _makeProjection() {
      // OverlayView.getProjection(): 지도 초기화 후 사용 가능
      let proj: naver.maps.MapSystemProjection | null = null;
      try {
        proj = this.getProjection();
      } catch (e) {
        console.warn("[HeatmapOverlay] getProjection() 실패:", e);
      }

      // fallback: Map.getProjection()
      if (!proj) {
        const map = this.getMap() as naver.maps.Map | null;
        if (!map) return null;
        try {
          proj = map.getProjection();
        } catch (e) {
          console.warn("[HeatmapOverlay] map.getProjection() 실패:", e);
          return null;
        }
      }

      if (!proj) return null;

      const testPt = proj.fromCoordToOffset(new naver.maps.LatLng(37.5, 127.0));
      console.log(
        `[HeatmapOverlay] projection 테스트: 한국 중심(37.5, 127.0) → pixel (${testPt.x.toFixed(1)}, ${testPt.y.toFixed(1)})`,
      );

      const projection = proj;
      return {
        stream: (s: any) => ({
          point(lng: number, lat: number) {
            const pt = proj.fromCoordToOffset(new naver.maps.LatLng(lat, lng));

            s.point(pt.x.toFixed(1), pt.y.toFixed(1));
          },
          lineStart() {
            s.lineStart();
          },
          lineEnd() {
            s.lineEnd();
          },
          polygonStart() {
            s.polygonStart();
          },
          polygonEnd() {
            s.polygonEnd();
          },
          sphere() {},
        }),
      };
    }
  };
}
