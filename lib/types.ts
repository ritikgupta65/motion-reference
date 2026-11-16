export interface Item {
  id: string;
  title: string;
  app: string;
  icon: string | null;
  video: string;
  video_path: string | null;
  duration: number | null;
  likes: number;
  createdAt: number;
}

export type Filter = { type: "pop" } | { type: "all" } | { type: "app"; app: string };

export interface InteractionRow {
  id: string;
  title: string;
  app: string;
  icon: string | null;
  video_url: string;
  video_path: string | null;
  duration: number | null;
  likes: number | null;
  created_at: string;
}

export const rowToItem = (r: InteractionRow): Item => ({
  id: r.id,
  title: r.title,
  app: r.app,
  icon: r.icon,
  video: r.video_url,
  video_path: r.video_path,
  duration: r.duration,
  likes: r.likes || 0,
  createdAt: new Date(r.created_at).getTime(),
});
