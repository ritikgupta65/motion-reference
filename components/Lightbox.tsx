"use client";

import { useEffect, useRef, useState } from "react";
import type { Item } from "@/lib/types";
import { t2 } from "@/lib/utils";
import AppIcon from "./AppIcon";
import {
  IconEdit, IconFull, IconHeart, IconLink, IconLoop, IconMute,
  IconNext, IconPause, IconPlay, IconPrev, IconTrash, IconVol,
} from "./Icons";

const SPEEDS = [1, 0.5, 1.5, 2];

interface Props {
  open: boolean;
  /** increments on every openLightbox() call */
  token: number;
  item: Item | null;
  lbIndex: number;
  orderLength: number;
  liked: boolean;
  onClose: () => void;
  onStep: (d: number) => void;
  onLike: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
  toast: (m: string) => void;
}

export default function Lightbox({
  open, token, item, lbIndex, orderLength, liked,
  onClose, onStep, onLike, onCopy, onEdit, onDelete, toast,
}: Props) {
  const V = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [scrub, setScrub] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [si, setSi] = useState(0);
  const [looping, setLooping] = useState(false);

  /* openLightbox(): load + play the clip */
  useEffect(() => {
    const v = V.current;
    if (!token || !item || !v) return;
    v.src = item.video;
    v.currentTime = 0;
    v.loop = looping;
    v.playbackRate = SPEEDS[si];
    v.muted = false;
    v.volume = volume;
    setMuted(false);
    v.play().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  /* closeLightbox(): stop + unload the clip */
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      return;
    }
    if (!wasOpen.current) return;
    wasOpen.current = false;
    const v = V.current;
    if (v) {
      v.pause();
      v.removeAttribute("src");
      v.load();
    }
  }, [open]);

  const syncTimes = () => {
    const v = V.current;
    if (!v) return;
    setCur(v.currentTime);
    setDur(v.duration || 0);
  };
  const togglePlay = () => {
    const v = V.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  };
  const toggleMute = () => {
    const v = V.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (!v.muted && v.volume === 0) {
      v.volume = 1;
      setVolume(1);
    }
  };
  const changeVolume = (val: number) => {
    const v = V.current;
    if (!v) return;
    v.volume = val;
    v.muted = val === 0;
    setVolume(val);
    setMuted(v.muted);
  };
  const cycleSpeed = () => {
    const n = (si + 1) % SPEEDS.length;
    if (V.current) V.current.playbackRate = SPEEDS[n];
    setSi(n);
  };
  const toggleLoop = () => {
    const l = !looping;
    if (V.current) V.current.loop = l;
    setLooping(l);
    toast(l ? "Loop on" : "Loop off");
  };
  const toggleFull = () => {
    const el = stageRef.current;
    if (!document.fullscreenElement) el?.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.();
  };

  /* keyboard shortcuts while lightbox is open */
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyRef.current = (e) => {
    if (!open) return;
    const v = V.current;
    if (!v) return;
    if (e.key === "Escape") onClose();
    else if (e.key === " ") {
      e.preventDefault();
      togglePlay();
    } else if (e.key === "ArrowRight" && !e.shiftKey) v.currentTime = Math.min(v.duration || 0, v.currentTime + 5);
    else if (e.key === "ArrowLeft" && !e.shiftKey) v.currentTime = Math.max(0, v.currentTime - 5);
    else if (e.key === "ArrowRight" && e.shiftKey) onStep(1);
    else if (e.key === "ArrowLeft" && e.shiftKey) onStep(-1);
    else if (e.key.toLowerCase() === "f") toggleFull();
    else if (e.key.toLowerCase() === "m") toggleMute();
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyRef.current(e);
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  return (
    <div
      className={"overlay" + (open ? " open" : "")}
      id="lightbox"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button className="lightbox-close" onClick={onClose}>✕</button>
      <button className="navarrow prev" style={{ display: lbIndex > 0 ? "flex" : "none" }} onClick={() => onStep(-1)}>
        <IconPrev />
      </button>
      <button
        className="navarrow next"
        style={{ display: lbIndex >= 0 && lbIndex < orderLength - 1 ? "flex" : "none" }}
        onClick={() => onStep(1)}
      >
        <IconNext />
      </button>
      <div className="overlay-inner">
        <div className="player-stage" ref={stageRef}>
          <div className="lightbox-phone">
            <div className="island"></div>
            <video
              ref={V}
              playsInline
              onTimeUpdate={(e) => {
                const v = e.currentTarget;
                if (v.duration) setScrub((v.currentTime / v.duration) * 1000);
                syncTimes();
              }}
              onLoadedMetadata={syncTimes}
              onEnded={() => {
                if (!looping) setPaused(true);
              }}
              onPlay={() => setPaused(false)}
              onPause={() => setPaused(true)}
            ></video>
          </div>
          <div className="player">
            <button onClick={togglePlay}>{paused ? <IconPlay /> : <IconPause />}</button>
            <input
              type="range"
              className="scrub"
              min="0"
              max="1000"
              value={scrub}
              onChange={(e) => {
                const val = +e.target.value;
                setScrub(val);
                const v = V.current;
                if (v && v.duration) v.currentTime = (val / 1000) * v.duration;
              }}
            />
            <span className="ptime">{`${t2(cur)} / ${t2(dur || 0)}`}</span>
            <button onClick={toggleMute}>{muted ? <IconMute /> : <IconVol />}</button>
            <input
              type="range"
              className="vol"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => changeVolume(+e.target.value)}
            />
            <button className={"spd" + (SPEEDS[si] !== 1 ? " on" : "")} onClick={cycleSpeed}>
              {SPEEDS[si] + "×"}
            </button>
            <button className={"lp" + (looping ? " on" : "")} onClick={toggleLoop}>
              <IconLoop />
            </button>
            <button onClick={toggleFull}>
              <IconFull />
            </button>
          </div>
        </div>
        <div className="lightbox-info">
          <div className="approw">
            {item && (
              <>
                <AppIcon icon={item.icon} app={item.app} />
                <span>{item.app}</span>
              </>
            )}
          </div>
          <h2>{item?.title}</h2>
          <div className="meta">
            {item && (
              <>
                {t2(item.duration || 0)} runtime
                <br />
                added {new Date(item.createdAt).toLocaleDateString()}
              </>
            )}
          </div>
          <div className="lb-actions">
            <button className={"lb-btn" + (liked ? " liked" : "")} onClick={onLike}>
              <IconHeart />
              <span>{item?.likes ?? 0}</span>
            </button>
            <button className="lb-btn" onClick={onCopy}>
              <IconLink />
              Copy link
            </button>
            <button className="lb-btn owner-only" onClick={onEdit}>
              <IconEdit />
              Edit
            </button>
            <button className="lb-btn danger owner-only" onClick={onDelete}>
              <IconTrash />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
