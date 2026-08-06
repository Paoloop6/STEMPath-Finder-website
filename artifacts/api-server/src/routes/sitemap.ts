// Dynamic XML sitemap at GET /api/sitemap.xml.
//
// The frontend is a statically served SPA, so the sitemap lives under the
// API path; robots.txt points crawlers here. URLs cover the static public
// pages plus every active opportunity's permanent slug URL, with last-modified
// dates taken from real record timestamps.

import { Router, type IRouter, type Request } from "express";
import {
  listOpportunities,
  type NormalizedOpportunity,
} from "../lib/opportunity-repository";

const router: IRouter = Router();

/** Must mirror the frontend's slugify in src/lib/seo.ts. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

function opportunityPath(record: NormalizedOpportunity): string {
  const slug = slugify(record.title || "opportunity");
  const id = record.numericId || record.opportunityId;
  return slug ? `/opportunities/${slug}-${id}` : `/opportunities/${id}`;
}

/** SITE_URL env wins; otherwise derive from the proxied request. */
function baseUrl(req: Request): string {
  const configured = process.env["SITE_URL"];
  if (configured) return configured.replace(/\/$/, "");
  const proto = String(req.headers["x-forwarded-proto"] ?? req.protocol ?? "https").split(",")[0];
  const host = String(req.headers["x-forwarded-host"] ?? req.headers["host"] ?? "");
  return host ? `${proto}://${host}` : "";
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

router.get("/sitemap.xml", async (req, res): Promise<void> => {
  try {
    const base = baseUrl(req);
    if (!base) {
      res.status(500).send("Cannot determine site URL");
      return;
    }

    // Active (non-expired, published) opportunities only.
    const records = await listOpportunities({});

    // Static public pages live in the prerendered /sitemap.xml, which is
    // generated from the same route list that produces their HTML. This
    // sitemap covers only the database-driven opportunity pages, so the two
    // are complementary rather than duplicates.
    const entries: string[] = [];
    for (const record of records) {
      // Only updatedAt is a truthful <lastmod>: it is bumped solely when the
      // extracted content changed. lastCheckedAt is bumped on every
      // verification run even when nothing changed, so using it would report
      // modification dates that never happened.
      const lastmod = record.updatedAt;
      const lastmodTag =
        lastmod && !Number.isNaN(Date.parse(lastmod))
          ? `<lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>`
          : "";
      entries.push(
        `  <url><loc>${escapeXml(`${base}${opportunityPath(record)}`)}</loc>${lastmodTag}</url>`,
      );
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`;
    res.set("Content-Type", "application/xml; charset=utf-8");
    res.set("Cache-Control", "public, max-age=3600");
    res.send(xml);
  } catch (error) {
    console.error(
      "[sitemap] failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    res.status(502).send("Sitemap temporarily unavailable");
  }
});

export default router;
