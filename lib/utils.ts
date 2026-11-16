/* safe localStorage (degrades if sandboxed) */
export const store = {
  get<T = unknown>(k: string): T | null {
    try {
      return JSON.parse(localStorage.getItem(k) || "null");
    } catch {
      return null;
    }
  },
  set(k: string, v: unknown) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  },
};

export const initial = (a?: string | null) => (a || "?").trim().charAt(0).toUpperCase();

export const t2 = (n: number) => {
  n = Math.max(0, n | 0);
  return Math.floor(n / 60) + ":" + String(n % 60).padStart(2, "0");
};

export const fileToDataURL = (f: File) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(0);
    r.readAsDataURL(f);
  });

export const resizeIcon = (f: File) =>
  new Promise<string | null>((res) => {
    const i = new Image();
    i.onload = () => {
      const c = document.createElement("canvas");
      c.width = c.height = 96;
      const x = c.getContext("2d")!;
      const s = Math.min(i.width, i.height);
      x.drawImage(i, (i.width - s) / 2, (i.height - s) / 2, s, s, 0, 0, 96, 96);
      res(c.toDataURL("image/png"));
    };
    i.onerror = () => res(null);
    fileToDataURL(f)
      .then((u) => (i.src = u))
      .catch(() => res(null));
  });

export const probeDur = (url: string) =>
  new Promise<number | null>((res) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => res(v.duration);
    v.onerror = () => res(null);
    v.src = url;
  });
