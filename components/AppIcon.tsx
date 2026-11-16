import { initial } from "@/lib/utils";

/* App icon image, or a first-letter fallback tile */
export default function AppIcon({ icon, app }: { icon: string | null; app: string }) {
  return icon ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={icon} alt="" />
  ) : (
    <span className="fallback">{initial(app)}</span>
  );
}
