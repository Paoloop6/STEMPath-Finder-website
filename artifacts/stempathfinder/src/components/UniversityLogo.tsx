import { useState } from "react";
import {
  getUniversity,
  universityInitials,
  type University,
} from "@/data/universities";

type Props = {
  /** University metadata, or an id resolvable via getUniversity. */
  university: University | string;
  /** Square edge length in px. Fixed up front, so no layout shift. */
  size?: number;
  className?: string;
};

/**
 * Local university logo with a graceful initials fallback.
 *
 * Renders the asset from public/university-logos/ (never a remote URL). If the
 * file is missing or fails to load, it swaps to an initials tile in the
 * school's brand color, at identical dimensions — no layout shift. Works on
 * light and dark backgrounds (the tile carries its own background).
 */
export function UniversityLogo({
  university,
  size = 36,
  className = "",
}: Props) {
  const [failed, setFailed] = useState(false);
  const uni =
    typeof university === "string" ? getUniversity(university) : university;

  const style = { width: size, height: size } as const;

  if (!uni) {
    return (
      <span
        style={style}
        className={`inline-flex shrink-0 items-center justify-center rounded-lg bg-white/10 text-[10px] font-bold text-foreground ${className}`}
        role="img"
        aria-label="Unknown university"
      >
        ?
      </span>
    );
  }

  if (failed) {
    return (
      <span
        style={{ ...style, backgroundColor: uni.brandColor ?? "#334155" }}
        className={`inline-flex shrink-0 select-none items-center justify-center rounded-lg font-bold text-white ${className}`}
        role="img"
        aria-label={`${uni.name} logo`}
      >
        <span style={{ fontSize: Math.max(9, size * 0.34) }}>
          {universityInitials(uni)}
        </span>
      </span>
    );
  }

  return (
    <img
      src={`${import.meta.env.BASE_URL}${uni.logoPath.replace(/^\//, "")}`}
      alt={`${uni.name} logo`}
      width={size}
      height={size}
      style={style}
      loading="lazy"
      draggable={false}
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-lg object-contain ${className}`}
    />
  );
}
