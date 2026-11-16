"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { supabase } from "@/lib/supabase";
import { BUCKET, MAX_MB } from "@/lib/config";
import { probeDur, resizeIcon } from "@/lib/utils";
import type { Item } from "@/lib/types";

export interface UploadSession {
  /** increments every time the sheet is (re)opened via openUpload */
  token: number;
  edit: Item | null;
}

interface Props {
  open: boolean;
  session: UploadSession;
  editingId: string | null;
  isOwner: boolean;
  apps: string[];
  onClose: () => void;
  onUpdated: (id: string, patch: Pick<Item, "title" | "app" | "icon">) => void;
  onAdded: (item: Item) => void;
  toast: (m: string) => void;
}

/* drag & drop wiring for a .filedrop zone */
function useDrop(fn: (f: File) => void) {
  const [dragover, setDragover] = useState(false);
  return {
    dragover,
    handlers: {
      onDragOver: (e: DragEvent) => {
        e.preventDefault();
        setDragover(true);
      },
      onDragLeave: () => setDragover(false),
      onDrop: (e: DragEvent) => {
        e.preventDefault();
        setDragover(false);
        const f = e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) fn(f);
      },
    },
  };
}

export default function UploadSheet({
  open,
  session,
  editingId,
  isOwner,
  apps,
  onClose,
  onUpdated,
  onAdded,
  toast,
}: Props) {
  const titleRef = useRef<HTMLInputElement>(null);
  const iconInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [appName, setAppName] = useState("");
  const [pendingIcon, setPendingIcon] = useState<string | null>(null);
  const [iconName, setIconName] = useState("Choose an image");
  const [pendingVideo, setPendingVideo] = useState<File | null>(null);
  const [videoName, setVideoName] = useState("Choose a video");
  const [videoHint, setVideoHint] = useState(`MP4 / WebM / MOV · up to ${MAX_MB} MB`);
  const [videoThumb, setVideoThumb] = useState<string | null>(null);
  const [progShow, setProgShow] = useState(false);
  const [progWidth, setProgWidth] = useState("20%");
  const [busy, setBusy] = useState(false);

  const edit = session.edit;

  /* openUpload(): reset the form every time the sheet is opened */
  useEffect(() => {
    if (!session.token) return;
    const e = session.edit;
    setTitle(e ? e.title : "");
    setAppName(e ? e.app : "");
    setPendingIcon(e ? e.icon : null);
    setPendingVideo(null);
    setIconName(e && e.icon ? "Current icon" : "Choose an image");
    setVideoThumb(null);
    setVideoName(e ? "Kept as-is" : "Choose a video");
    setProgShow(false);
    setProgWidth("20%");
    titleRef.current?.focus();
  }, [session]);

  async function setIcon(f: File) {
    if (!f.type.startsWith("image/")) {
      toast("Icon must be an image");
      return;
    }
    const icon = await resizeIcon(f);
    setPendingIcon(icon);
    if (icon) setIconName(f.name);
  }

  function setVideo(f: File) {
    if (!f.type.startsWith("video/")) {
      toast("Choose a video file");
      return;
    }
    const mb = f.size / 1048576;
    if (mb > MAX_MB) {
      toast(`${mb.toFixed(1)} MB — over the ${MAX_MB} MB limit`);
      return;
    }
    setPendingVideo(f);
    setVideoName(f.name);
    setVideoHint(mb.toFixed(1) + " MB");
    setVideoThumb(URL.createObjectURL(f));
  }

  const iconDrop = useDrop(setIcon);
  const videoDrop = useDrop(setVideo);

  const save = async () => {
    if (!isOwner) {
      toast("Sign in as owner first");
      return;
    }
    const t = title.trim(),
      a = appName.trim();
    if (!a) {
      toast("App name required");
      return;
    }
    setBusy(true);
    try {
      if (editingId) {
        const patch = { title: t || a + " interaction", app: a, icon: pendingIcon };
        const { error } = await supabase.from("interactions").update(patch).eq("id", editingId);
        if (error) throw error;
        onUpdated(editingId, patch);
        toast("Saved");
      } else {
        if (!pendingVideo) {
          toast("Choose a recording");
          return;
        }
        setProgShow(true);
        setProgWidth("30%");
        const ext = (pendingVideo.name.split(".").pop() || "mp4").toLowerCase();
        const id = crypto.randomUUID ? crypto.randomUUID() : Date.now() + "" + Math.random();
        const path = `videos/${id}.${ext}`;
        setProgWidth("50%");
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, pendingVideo, { contentType: pendingVideo.type, upsert: false });
        if (upErr) throw upErr;
        setProgWidth("78%");
        const {
          data: { publicUrl },
        } = supabase.storage.from(BUCKET).getPublicUrl(path);
        const duration = await probeDur(publicUrl);
        const row = {
          id,
          title: t || a + " interaction",
          app: a,
          icon: pendingIcon,
          video_url: publicUrl,
          video_path: path,
          duration,
          likes: 0,
        };
        const { error: insErr } = await supabase.from("interactions").insert(row);
        if (insErr) {
          await supabase.storage.from(BUCKET).remove([path]);
          throw insErr;
        }
        setProgWidth("100%");
        onAdded({
          id,
          title: row.title,
          app: row.app,
          icon: row.icon,
          video: publicUrl,
          video_path: path,
          duration,
          likes: 0,
          createdAt: Date.now(),
        });
        toast("Added to the directory");
      }
    } catch (e) {
      toast("Failed: " + ((e as { message?: string })?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const saveLabel = busy ? (editingId ? "Saving…" : "Uploading…") : editingId ? "Save changes" : "Save";

  return (
    <div
      className={"overlay" + (open ? " open" : "")}
      id="uploadOverlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet">
        <h2>{edit ? "Edit interaction" : "Add interaction"}</h2>
        <div className="sub">
          {edit ? "Update the details. (The video itself stays the same.)" : "Documented for the whole directory to see."}
        </div>
        <div className="field">
          <label>Interaction title</label>
          <input
            ref={titleRef}
            type="text"
            placeholder="e.g. Combo streak celebration"
            maxLength={90}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="field">
          <label>App name</label>
          <input
            type="text"
            placeholder="e.g. Duolingo"
            maxLength={40}
            list="appList"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
          />
          <datalist id="appList">
            {apps.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
        </div>
        <div className="field">
          <label>App icon (optional)</label>
          <div
            className={"filedrop" + (iconDrop.dragover ? " dragover" : "")}
            onClick={() => iconInput.current?.click()}
            {...iconDrop.handlers}
          >
            <div className="thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {pendingIcon ? <img src={pendingIcon} alt="" /> : "🖼️"}
            </div>
            <div className="meta">
              <strong>{iconName}</strong>
              <span>PNG / JPG · square works best</span>
            </div>
            <input
              ref={iconInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setIcon(f);
              }}
            />
          </div>
        </div>
        <div className="field" style={{ display: edit ? "none" : "block" }}>
          <label>Screen recording</label>
          <div
            className={"filedrop" + (videoDrop.dragover ? " dragover" : "")}
            onClick={() => videoInput.current?.click()}
            {...videoDrop.handlers}
          >
            <div className="thumb">{videoThumb ? <video src={videoThumb} muted></video> : "🎬"}</div>
            <div className="meta">
              <strong>{videoName}</strong>
              <span>{videoHint}</span>
            </div>
            <input
              ref={videoInput}
              type="file"
              accept="video/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setVideo(f);
              }}
            />
          </div>
        </div>
        <div className={"prog" + (progShow ? " show" : "")}>
          <i style={{ width: progWidth }}></i>
        </div>
        <div className="actions">
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={save} disabled={busy}>
            {saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
