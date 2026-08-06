import { useEffect } from "react";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  DEFAULT_TITLE,
  SITE_NAME,
  absoluteUrl,
} from "@/lib/seo";

export interface SeoProps {
  /** Page title; the site name is appended unless it already contains it. */
  title?: string;
  description?: string;
  /** Site-relative canonical path, e.g. "/summer-internships". */
  path?: string;
  /** Defaults to "index, follow"; pass "noindex, nofollow" for private pages. */
  robots?: string;
  ogImage?: string;
  ogType?: "website" | "article";
  /** JSON-LD objects rendered as application/ld+json script tags. */
  jsonLd?: object[];
}

const MANAGED_ATTR = "data-managed-seo";

function upsertMeta(kind: "name" | "property", key: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(
    `meta[${kind}="${key}"]`,
  );
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(kind, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function upsertCanonical(href: string) {
  let tag = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );
  if (!tag) {
    tag = document.createElement("link");
    tag.setAttribute("rel", "canonical");
    document.head.appendChild(tag);
  }
  tag.setAttribute("href", href);
}

/**
 * Head manager for this client-rendered SPA: keeps title, description,
 * canonical, robots, Open Graph / Twitter tags, and JSON-LD in sync with the
 * active route. Mount exactly one per page.
 */
export function Seo({
  title,
  description,
  path,
  robots = "index, follow",
  ogImage = DEFAULT_OG_IMAGE,
  ogType = "website",
  jsonLd,
}: SeoProps) {
  useEffect(() => {
    const fullTitle = !title
      ? DEFAULT_TITLE
      : title.includes(SITE_NAME)
        ? title
        : `${title} | ${SITE_NAME}`;
    const desc = description ?? DEFAULT_DESCRIPTION;
    const canonicalPath =
      path ?? window.location.pathname.replace(/\/+$/, "") ?? "/";
    const canonical = absoluteUrl(canonicalPath || "/");
    const image = ogImage.startsWith("http") ? ogImage : absoluteUrl(ogImage);

    document.title = fullTitle;
    upsertMeta("name", "description", desc);
    upsertMeta("name", "robots", robots);
    upsertCanonical(canonical);

    upsertMeta("property", "og:site_name", SITE_NAME);
    upsertMeta("property", "og:title", fullTitle);
    upsertMeta("property", "og:description", desc);
    upsertMeta("property", "og:type", ogType);
    upsertMeta("property", "og:url", canonical);
    upsertMeta("property", "og:image", image);

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", fullTitle);
    upsertMeta("name", "twitter:description", desc);
    upsertMeta("name", "twitter:image", image);

    // Replace any JSON-LD from the previous route.
    document.head
      .querySelectorAll(`script[${MANAGED_ATTR}]`)
      .forEach((node) => node.remove());
    for (const block of jsonLd ?? []) {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.setAttribute(MANAGED_ATTR, "true");
      script.textContent = JSON.stringify(block);
      document.head.appendChild(script);
    }
  }, [title, description, path, robots, ogImage, ogType, JSON.stringify(jsonLd)]);

  return null;
}

/** WebSite + Organization JSON-LD for the homepage. */
export function homeJsonLd(): object[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: absoluteUrl("/"),
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE_NAME,
      url: absoluteUrl("/"),
      logo: absoluteUrl("/icon-512.png"),
    },
  ];
}
