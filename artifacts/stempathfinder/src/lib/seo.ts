/**
 * Site-wide SEO constants and URL helpers.
 *
 * Canonical URLs are built from the page's real origin at runtime, so they
 * stay correct on any deployed domain without configuration. The production
 * domain can be pinned with VITE_SITE_URL if needed.
 */

export const SITE_NAME = "STEMPath Finder";

export const DEFAULT_TITLE =
  "STEMPath Finder | Summer Internships and STEM Programs for High School Students";

export const DEFAULT_DESCRIPTION =
  "Discover summer internships, research programs, competitions, volunteering, and STEM opportunities for high school students.";

export const DEFAULT_OG_IMAGE = "/icon-512.png";

/** Origin used for canonical/OG URLs. */
export function siteOrigin(): string {
  const configured = import.meta.env.VITE_SITE_URL as string | undefined;
  if (configured) return configured.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

/** Absolute URL for a site path ("/opportunities/…"). */
export function absoluteUrl(path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${siteOrigin()}${clean}`;
}

/** Lowercase, hyphenated, URL-safe slug from free text. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/**
 * Permanent public path for an opportunity: /opportunities/{title-slug}-{id}.
 * The id suffix (numericId or DynamoDB opportunityId) is what the API
 * resolves; the title part exists for humans and search engines.
 */
export function opportunityPath(
  title: string | null,
  id: string | number,
): string {
  const slug = slugify(title ?? "opportunity");
  return slug ? `/opportunities/${slug}-${id}` : `/opportunities/${id}`;
}

/** Extracts the API-resolvable id from a slug-or-id route param. */
export function idFromSlugParam(param: string): string {
  const match = /-([a-z0-9]+)$/i.exec(param);
  return match ? match[1] : param;
}
