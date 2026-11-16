"use client";

import { useRef, useState } from "react";
import type { Item } from "@/lib/types";
import AppIcon from "./AppIcon";
import { IconPlay } from "./Icons";

interface Props {
  item: Item;
  onOpen: (item: Item) => void;
}

export default function Cell({ item, onOpen }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [previewing, setPreviewing] = useState(false);

  return (
    <div className="cell">
      <div
        className={"stage" + (previewing ? " previewing" : "")}
        onMouseEnter={() => {
          setPreviewing(true);
          videoRef.current?.play().catch(() => {});
        }}
        onMouseLeave={() => {
          setPreviewing(false);
          const v = videoRef.current;
          if (v) {
            v.pause();
            v.currentTime = 0;
          }
        }}
        onClick={() => onOpen(item)}
      >
        <div className="phone">
          <div className="island"></div>
          <video ref={videoRef} src={item.video} muted loop playsInline preload="metadata"></video>
        </div>
        <div className="hoverplay">
          <IconPlay />
        </div>
      </div>
      <div className="cellfoot">
        <div className="cf-app">
          <AppIcon icon={item.icon} app={item.app} />
          {item.app}
        </div>
        <div className="cf-title">
          <span>{item.title}</span>
        </div>
      </div>
    </div>
  );
}
