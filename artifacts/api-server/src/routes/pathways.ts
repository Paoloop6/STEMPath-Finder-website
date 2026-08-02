import { Router, type IRouter } from "express";
import { getItem, getPresignedReadUrl } from "@workspace/aws";
import { requireAdmin } from "../middlewares/adminAuth";
import {
  getProfileEntities,
  invalidateProfileCache,
  listProfiles,
  reviewItem,
  type ProfileRow,
} from "../lib/pathways-repo";

const router: IRouter = Router();

const PUBLIC_REVIEW_STATUSES = new Set(["approved", "pending"]);

// profileName is intentionally absent everywhere below: profiles are
// anonymous. Real names exist only in the private S3 raw artifacts.
function publicProfileFields(profile: ProfileRow) {
  return {
    profileId: profile.profileId,
    anonymousLabel: profile.anonymousLabel ?? "Student",
    intendedMajors: profile.intendedMajors ?? [],
    acceptedSchools: profile.acceptedSchools ?? [],
    stemFields: profile.stemFields ?? [],
    sourceUrl: profile.sourceUrl,
    sourceVideoUrls: profile.sourceVideoUrls ?? [],
  };
}

// GET /pathways — student pathway cards. Only approved-or-pending, and only
// the fields the UI needs; S3 keys and internal state never leave the server.
router.get("/pathways", async (_req, res): Promise<void> => {
  const profiles = await listProfiles();
  const result = await Promise.all(
    profiles.map(async (profile) => {
      const { activities, awards } = await getProfileEntities(
        profile.profileId,
      );
      return {
        ...publicProfileFields(profile),
        activities: activities
          .filter((a) => PUBLIC_REVIEW_STATUSES.has(a.reviewStatus))
          .map((a) => ({
            id: a.SK,
            title: a.title,
            experienceType: a.experienceType,
            stemField: a.stemField,
            organization: a.organization,
            role: a.role,
            description: a.description,
            gradeLevels: a.gradeLevels,
            termType: a.termType,
            skills: a.skills,
            sourceUrl: a.sourceUrl,
            evidenceUrls: a.evidenceUrls,
            evidenceStatus: a.evidenceStatus,
            reviewStatus: a.reviewStatus,
          })),
        awards: awards
          .filter((a) => PUBLIC_REVIEW_STATUSES.has(a.reviewStatus))
          .map((a) => ({
            id: a.SK,
            name: a.name,
            category: a.category,
            level: a.level,
            year: a.year,
            sourceUrl: a.sourceUrl,
            reviewStatus: a.reviewStatus,
          })),
      };
    }),
  );
  res.json(result);
});

// ---------------------------------------------------------------------------
// Admin review endpoints
// ---------------------------------------------------------------------------

// GET /admin/pathways — everything, including rejected, for the review page.
router.get(
  "/admin/pathways",
  requireAdmin,
  async (_req, res): Promise<void> => {
    const profiles = await listProfiles(true);
    const result = await Promise.all(
      profiles.map(async (profile) => {
        const { activities, awards } = await getProfileEntities(
          profile.profileId,
        );
        // Strip profileName even from the admin view; admins who need the
        // real identity use the original-profile link or the S3 artifacts.
        const { profileName: _omitted, ...anonymousProfile } = profile;
        return { profile: anonymousProfile, activities, awards };
      }),
    );
    res.json(result);
  },
);

// POST /admin/pathways/review — approve / reject / edit / publish one item.
router.post(
  "/admin/pathways/review",
  requireAdmin,
  async (req, res): Promise<void> => {
    const { profileId, sk, action, edits } = req.body ?? {};
    if (typeof profileId !== "string" || typeof sk !== "string") {
      res.status(400).json({ error: "profileId and sk are required" });
      return;
    }
    const update: Record<string, unknown> = {};
    switch (action) {
      case "approve":
        update["reviewStatus"] = "approved";
        break;
      case "reject":
        update["reviewStatus"] = "rejected";
        update["published"] = false;
        break;
      case "publish":
        update["reviewStatus"] = "approved";
        update["published"] = true;
        break;
      case "unpublish":
        update["published"] = false;
        break;
      case "edit":
        break;
      default:
        res.status(400).json({ error: `Unknown action: ${action}` });
        return;
    }
    if (edits && typeof edits === "object") {
      const EDITABLE = new Set([
        "title",
        "experienceType",
        "stemField",
        "organization",
        "role",
        "description",
        "gradeLevels",
        "termType",
        "skills",
        "name",
        "category",
        "level",
        "year",
      ]);
      for (const [key, value] of Object.entries(
        edits as Record<string, unknown>,
      )) {
        if (EDITABLE.has(key)) update[key] = value;
      }
    }
    if (Object.keys(update).length === 0) {
      res.status(400).json({ error: "Nothing to update" });
      return;
    }
    update["reviewedAt"] = new Date().toISOString();
    try {
      await reviewItem(profileId, sk, update);
    } catch (error) {
      res
        .status(400)
        .json({
          error: error instanceof Error ? error.message : "update failed",
        });
      return;
    }
    invalidateProfileCache();
    res.json({ ok: true });
  },
);

// GET /admin/pathways/:profileId/artifact?type=raw|extracted — temporary
// presigned URL for the stored S3 artifact; the key itself stays server-side.
router.get(
  "/admin/pathways/:profileId/artifact",
  requireAdmin,
  async (req, res): Promise<void> => {
    const profileId = req.params["profileId"] ?? "";
    const type = req.query["type"];
    if (type !== "raw" && type !== "extracted") {
      res.status(400).json({ error: "type must be raw or extracted" });
      return;
    }
    const profile = await getItem<ProfileRow>({
      PK: `PROFILE#${profileId}`,
      SK: "PROFILE",
    });
    const key = type === "raw" ? profile?.s3RawKey : profile?.s3ExtractedKey;
    if (!key) {
      res.status(404).json({ error: "Artifact not found" });
      return;
    }
    const url = await getPresignedReadUrl(key, 300);
    res.json({ url, expiresInSeconds: 300 });
  },
);

export default router;
