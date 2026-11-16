"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { BUCKET, configured } from "@/lib/config";

import { rowToItem, type Filter, type InteractionRow, type Item } from "@/lib/types";
import Cell from "./Cell";
import AuthSheet from "./AuthSheet";
import UploadSheet, { type UploadSession } from "./UploadSheet";
import Lightbox from "./Lightbox";
import { IconStar } from "./Icons";

export default function EaseApp() {
  if (!configured) {
    return (
      <div className="setup">
        <h1>Ease</h1>
        <p className="lede">Add your Supabase URL and anon key in lib/config.ts, then reload.</p>
      </div>
    );
  }
  return <Directory />;
}

function Directory() {
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState<Filter>({ type: "pop" });
  const [isOwner, setIsOwner] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [lbOpen, setLbOpen] = useState(false);
  const [lbToken, setLbToken] = useState(0);

  const [authOpen, setAuthOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadSession, setUploadSession] = useState<UploadSession>({ token: 0, edit: null });
  const [editingId, setEditingId] = useState<string | null>(null);

  /* ---- toast ---- */
  const [toastMsg, setToastMsg] = useState("");
  const [toastShow, setToastShow] = useState(false);
  const toastT = useRef<number | undefined>(undefined);
  const toast = useCallback((m: string) => {
    setToastMsg(m);
    setToastShow(true);
    clearTimeout(toastT.current);
    toastT.current = window.setTimeout(() => setToastShow(false), 3000);
  }, []);

  /* ---- auth ---- */
  const refreshAuth = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    setIsOwner(!!session);
  }, []);
  useEffect(() => {
    document.body.classList.toggle("is-owner", isOwner);
  }, [isOwner]);

  const onAuthBtn = async () => {
    if (isOwner) {
      await supabase.auth.signOut();
      await refreshAuth();
      toast("Signed out");
    } else setAuthOpen(true);
  };

  /* ---- lightbox open/close ---- */
  const openLightbox = useCallback((item: Item) => {
    setCurrentId(item.id);
    setLbOpen(true);
    setLbToken((t) => t + 1);
    document.querySelectorAll<HTMLVideoElement>(".grid video").forEach((v) => v.pause());
    history.replaceState(null, "", `?i=${item.id}`);
  }, []);
  const closeLightbox = useCallback(() => {
    setLbOpen(false);
    setCurrentId(null);
    history.replaceState(null, "", location.pathname);
  }, []);

  /* ---- data ---- */
  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("interactions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      setLoadError(error.message);
      setStatus("error");
      return;
    }
    const list = ((data || []) as InteractionRow[]).map(rowToItem);
    setItems(list);
    setStatus("ready");
    const want = new URLSearchParams(location.search).get("i");
    if (want) {
      const it = list.find((x) => x.id === want);
      if (it) openLightbox(it);
    }
  }, [openLightbox]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      refreshAuth();
    });
    refreshAuth().then(load);
    return () => subscription.unsubscribe();
  }, [refreshAuth, load]);

  /* ---- derived ---- */
  const apps = useMemo(() => [...new Set(items.map((i) => i.app))].sort(), [items]);
  const order = useMemo(() => {
    let list = [...items];
    if (filter.type === "pop") list.sort((a, b) => b.createdAt - a.createdAt);
    else if (filter.type === "app") list = list.filter((i) => i.app === filter.app);
    return list;
  }, [items, filter]);
  const currentLB = currentId ? items.find((i) => i.id === currentId) ?? null : null;
  const lbIndex = currentLB ? order.findIndex((i) => i.id === currentLB.id) : -1;

  const step = (d: number) => {
    const n = lbIndex + d;
    if (n < 0 || n >= order.length) return;
    openLightbox(order[n]);
  };

  const onCopy = async () => {
    if (!currentLB) return;
    const url = location.origin + location.pathname + "?i=" + currentLB.id;
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied");
    } catch {
      toast(url);
    }
  };

  const onDelete = async () => {
    const it = currentLB;
    if (!it || !isOwner) return;
    if (!confirm(`Delete “${it.title}”?`)) return;
    const { error } = await supabase.from("interactions").delete().eq("id", it.id);
    if (error) {
      toast("Delete failed: " + error.message);
      return;
    }
    if (it.video_path) await supabase.storage.from(BUCKET).remove([it.video_path]);
    setItems((prev) => prev.filter((x) => x.id !== it.id));
    closeLightbox();
    toast("Deleted");
  };

  /* ---- upload / edit ---- */
  const openUpload = (edit: Item | null) => {
    setEditingId(edit ? edit.id : null);
    setUploadSession((s) => ({ token: s.token + 1, edit }));
    setUploadOpen(true);
  };
  const closeUpload = () => {
    setUploadOpen(false);
    setEditingId(null);
  };

  /* Escape closes sheets when the lightbox isn't open */
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyRef.current = (e) => {
    if (!lbOpen && e.key === "Escape") {
      setUploadOpen(false);
      setAuthOpen(false);
    }
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyRef.current(e);
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  const crumb = filter.type === "pop" ? "Pop" : filter.type === "all" ? "All" : filter.app;

  return (
    <>
      <nav className="topnav">
        <div className="wordmark">
          <span>p</span><span className="o"></span><span>p</span>
        </div>
      </nav>

      <div className="toolbar">
        <h1 className="tool-title">Interaction Library</h1>
        <div className="toolbar-chips">
          {status === "ready" && (
            <>
              <button
                className={"chip pop" + (filter.type === "pop" ? " active" : "")}
                onClick={() => setFilter({ type: "pop" })}
              >
                <IconStar />
                Pop
              </button>
              <button
                className={"chip" + (filter.type === "all" ? " active" : "")}
                onClick={() => setFilter({ type: "all" })}
              >
                All <span className="cnt">{items.length}</span>
              </button>
              {apps.map((a) => {
                const w = items.find((i) => i.app === a && i.icon);
                const n = items.filter((i) => i.app === a).length;
                const active = filter.type === "app" && filter.app === a;
                return (
                  <button
                    key={a}
                    className={"chip" + (active ? " active" : "")}
                    onClick={() => setFilter({ type: "app", app: a })}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {w && <img src={w.icon!} alt="" />}
                    {a} <span className="cnt">{n}</span>
                  </button>
                );
              })}
            </>
          )}
        </div>
        <button className="hbtn solid" onClick={() => openUpload(null)}>
          + Add interaction
        </button>
      </div>

      <div className="grid">
        {status === "loading" && <div className="loading">LOADING DIRECTORY…</div>}
        {status === "error" && (
          <div className="empty">
            <h2>Couldn&apos;t reach the database</h2>
            <p>{loadError}</p>
          </div>
        )}
        {status === "ready" && !order.length && (
          <div className="empty">
            <h2>Nothing here yet</h2>
            <p>
              {isOwner
                ? "Hit “Add interaction” to document your first one."
                : "The owner hasn’t added anything to this view yet."}
            </p>
          </div>
        )}
        {status === "ready" &&
          order.map((item) => (
            <Cell
              key={item.id}
              item={item}
              onOpen={openLightbox}
            />
          ))}
      </div>

      <UploadSheet
        open={uploadOpen}
        session={uploadSession}
        editingId={editingId}
        isOwner={isOwner}
        apps={apps}
        onClose={closeUpload}
        onUpdated={(id, patch) => {
          setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
          closeUpload();
        }}
        onAdded={(item) => {
          setItems((prev) => [item, ...prev]);
          closeUpload();
        }}
        toast={toast}
      />

      <AuthSheet open={authOpen} onClose={() => setAuthOpen(false)} refreshAuth={refreshAuth} toast={toast} />

      <Lightbox
        open={lbOpen}
        token={lbToken}
        item={currentLB}
        lbIndex={lbIndex}
        orderLength={order.length}
        onClose={closeLightbox}
        onStep={step}
        onCopy={onCopy}
        onEdit={() => {
          if (!currentLB || !isOwner) return;
          openUpload(currentLB);
        }}
        onDelete={onDelete}
        toast={toast}
      />

      <div className={"toast" + (toastShow ? " show" : "")}>{toastMsg}</div>
    </>
  );
}
