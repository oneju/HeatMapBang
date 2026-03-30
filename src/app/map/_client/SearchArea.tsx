"use client";
import { useCallback, useRef, useState } from "react";

import cx from "classnames";
import { NaverMapInstance } from "./MapControl";

interface NaverMarker {
  morph(latLng: unknown, zoom: number): void;
}
interface Props {
  map?: NaverMapInstance;
}
export default function SearchArea({ map }: Props) {
  const [keyword, setKeyword] = useState("");

  const myMarkerRef = useRef<NaverMarker | null>(null);
  const onClickAddr = useCallback(
    (addr: string) => {
      window.naver.maps.Service.geocode(
        { query: addr },
        function (status: any, response: any) {
          if (status === window.naver.maps.Service.Status.ERROR) {
            return alert("Something wrong!");
          }
          const result = response?.v2?.addresses[0];
          const { x, y } = result;

          const latLng = new window.naver.maps.LatLng(y, x);

          myMarkerRef.current = new window.naver.maps.Marker({
            map,
            position: latLng,
            icon: {
              content: `<div style="
              width: 16px; height: 16px;
              background: #1142bf;
              border: 3px solid #fff;
              border-radius: 50%;
              box-shadow: 0 0 0 3px rgba(37,99,235,0.4);
            "></div>`,
              anchor: new window.naver.maps.Point(8, 8),
            },
          });
          map?.morph(latLng, 16);
          // console.log(response, "----search response");
        },
      );
    },
    [map],
  );

  return (
    <>
      <div className={cx("input-group")}>
        <input
          placeholder={"주소를 입력하세요"}
          value={keyword}
          autoComplete="off"
          onChange={(e) => {
            const value = e.target.value;
            setKeyword(value);
          }}
          onKeyDown={(e) => {
            if (e.keyCode == 13) {
              if (keyword.length > 2) {
                onClickAddr(keyword);
              }
            }
          }}
        />
      </div>
    </>
  );
}
