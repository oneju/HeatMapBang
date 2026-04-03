"use client";
import { useSearchParams } from "next/navigation";
import React, { useState } from "react";

const ToggleButton = () => {
  const [is_open, set_is_open] = useState<boolean>(true);
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [prevId, setPrevId] = useState(id);
  if (prevId !== id) {
    setPrevId(id);
    if (id) set_is_open(true);
  }

  return (
    <>
      <button
        className={is_open ? "side_toggle_btn" : "side_toggle_btn off"}
        onClick={() => {
          set_is_open((prev) => !prev);
        }}
      >
        {is_open ? "접기" : "열기"}
      </button>
    </>
  );
};

export default ToggleButton;
