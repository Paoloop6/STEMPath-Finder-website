// One-time (rerun-safe) anonymization of imported student profiles.
//
//   pnpm run anonymize:students -- --dry-run
//   pnpm run anonymize:students
//
// For every SK=PROFILE item:
//   - assigns a stable "Student NNN" anonymousLabel (persisted in DynamoDB, so
//     labels never shift on rerun; new profiles get the next free number);
//   - nulls out profileName (the name survives only inside the private raw
//     S3 artifacts, which are admin-presigned-URL access only);
//   - redacts the student's name from related ACTIVITY#/AWARD# records with
//     "the student".
//
// Never redacts organization/university/program/competition names: full-name
// matches are always safe, and single name parts are skipped when they equal a
// protected word (Brown, Rice, Duke, …) so "Brown University" survives even
// for a student surnamed Brown.

import {
  getDynamoDocumentClient,
  awsConfig,
  QueryCommand,
  ScanCommand,
  updateItem,
} from "@workspace/aws";
import { buildNamePatterns, REDACTABLE_FIELDS, redactText } from "./redact-names";

const DRY_RUN = process.argv.includes("--dry-run");

const stats = {
  profilesFound: 0,
  profilesAnonymized: 0,
  activitiesRedacted: 0,
  awardsRedacted: 0,
  recordsSkipped: 0,
  errors: 0,
};

type ProfileRow = {
  PK: string;
  SK: string;
  profileId: string;
  profileName?: string | null;
  anonymousLabel?: string;
};

type ChildRow = { PK: string; SK: string; [key: string]: unknown };

async function scanProfiles(): Promise<ProfileRow[]> {
  const client = getDynamoDocumentClient();
  const rows: ProfileRow[] = [];
  let lastKey: Record<string, unknown> | undefined;
  do {
    const result = await client.send(
      new ScanCommand({
        TableName: awsConfig.dynamoTable,
        FilterExpression: "begins_with(PK, :pk) AND SK = :sk",
        ExpressionAttributeValues: { ":pk": "PROFILE#", ":sk": "PROFILE" },
        ExclusiveStartKey: lastKey,
      }),
    );
    rows.push(...((result.Items ?? []) as ProfileRow[]));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);
  return rows;
}

async function queryChildren(profileId: string): Promise<ChildRow[]> {
  const client = getDynamoDocumentClient();
  const rows: ChildRow[] = [];
  let lastKey: Record<string, unknown> | undefined;
  do {
    const result = await client.send(
      new QueryCommand({
        TableName: awsConfig.dynamoTable,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: { ":pk": `PROFILE#${profileId}` },
        ExclusiveStartKey: lastKey,
      }),
    );
    rows.push(...((result.Items ?? []) as ChildRow[]));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);
  return rows.filter(
    (row) => row.SK.startsWith("ACTIVITY#") || row.SK.startsWith("AWARD#"),
  );
}

function labelNumber(label: string | undefined): number {
  const match = label?.match(/^Student (\d+)$/);
  return match ? Number(match[1]) : 0;
}

async function main(): Promise<void> {
  console.log(`Anonymize student profiles — ${DRY_RUN ? "DRY RUN" : "LIVE"}`);

  const profiles = (await scanProfiles()).sort((a, b) =>
    a.profileId.localeCompare(b.profileId),
  );
  stats.profilesFound = profiles.length;

  // Existing labels are immutable; new ones continue after the current max.
  let maxLabel = Math.max(0, ...profiles.map((p) => labelNumber(p.anonymousLabel)));

  for (const profile of profiles) {
    try {
      const hasName =
        typeof profile.profileName === "string" && profile.profileName.trim() !== "";
      const needsLabel = !profile.anonymousLabel;

      if (!hasName && !needsLabel) {
        stats.recordsSkipped += 1;
        continue;
      }

      const label =
        profile.anonymousLabel ??
        `Student ${String((maxLabel += 1)).padStart(3, "0")}`;

      // Redact children while we still know the name.
      let activitiesRedacted = 0;
      let awardsRedacted = 0;
      if (hasName) {
        const patterns = buildNamePatterns(profile.profileName as string);
        const children = await queryChildren(profile.profileId);
        for (const child of children) {
          const updates: Record<string, unknown> = {};
          for (const field of REDACTABLE_FIELDS) {
            const { text, changed } = redactText(child[field], patterns);
            if (changed) updates[field] = text;
          }
          if (Object.keys(updates).length > 0) {
            if (!DRY_RUN) {
              await updateItem({ PK: child.PK, SK: child.SK }, updates);
            }
            if (child.SK.startsWith("ACTIVITY#")) activitiesRedacted += 1;
            else awardsRedacted += 1;
          }
        }
      }

      if (!DRY_RUN) {
        await updateItem(
          { PK: profile.PK, SK: profile.SK },
          { anonymousLabel: label, profileName: null },
        );
      }

      stats.profilesAnonymized += 1;
      stats.activitiesRedacted += activitiesRedacted;
      stats.awardsRedacted += awardsRedacted;
      console.log(
        `  ${profile.profileId} -> "${label}"` +
          (hasName ? ` (name removed; ${activitiesRedacted} activities, ${awardsRedacted} awards redacted)` : " (label only)"),
      );
    } catch (error) {
      stats.errors += 1;
      console.error(`  ${profile.profileId} ERROR:`, error instanceof Error ? error.message : error);
    }
  }

  console.log("\n===== ANONYMIZATION SUMMARY =====");
  console.log(`profiles found:             ${stats.profilesFound}`);
  console.log(`profiles anonymized:        ${stats.profilesAnonymized}`);
  console.log(`activity records redacted:  ${stats.activitiesRedacted}`);
  console.log(`award records redacted:     ${stats.awardsRedacted}`);
  console.log(`records skipped:            ${stats.recordsSkipped}`);
  console.log(`errors:                     ${stats.errors}`);
  if (DRY_RUN) console.log("(dry run: nothing was written)");
}

main().catch((error: unknown) => {
  console.error("Anonymization failed:", error);
  process.exit(1);
});
