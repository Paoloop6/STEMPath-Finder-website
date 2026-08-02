// Development check for university logo/metadata integrity.
//
//   pnpm run check:logos
//
// Reports: universities configured, logo files found/missing, duplicate
// aliases, and imported acceptedSchools values that fail to normalize to a
// university id. Exits non-zero on missing files or duplicate aliases.

import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  UNIVERSITIES,
  matchUniversity,
} from "../artifacts/stempathfinder/src/data/universities";
import { queryByPrefix } from "@workspace/aws";

const LOGO_DIR = join(
  import.meta.dirname,
  "../artifacts/stempathfinder/public/university-logos",
);

async function main(): Promise<void> {
  console.log(`universities configured:  ${UNIVERSITIES.length}`);

  // --- logo files ---------------------------------------------------------
  const files = new Set(existsSync(LOGO_DIR) ? readdirSync(LOGO_DIR) : []);
  const missing = UNIVERSITIES.filter(
    (u) => !files.has(u.logoPath.split("/").pop()!),
  );
  const orphaned = [...files].filter(
    (f) => !UNIVERSITIES.some((u) => u.logoPath.endsWith(`/${f}`)),
  );
  console.log(`logo files found:         ${files.size}`);
  console.log(
    `missing logo files:       ${missing.length}${missing.length ? " -> " + missing.map((u) => u.id).join(", ") : ""}`,
  );
  if (orphaned.length)
    console.log(`orphaned logo files:      ${orphaned.join(", ")}`);

  // --- duplicate aliases --------------------------------------------------
  const seen = new Map<string, string>();
  const duplicates: string[] = [];
  for (const uni of UNIVERSITIES) {
    for (const term of [uni.id, uni.name, uni.shortName, ...uni.aliases]) {
      const key = term.toLowerCase().trim();
      const owner = seen.get(key);
      if (owner && owner !== uni.id) {
        duplicates.push(`"${term}" (${owner} vs ${uni.id})`);
      } else {
        seen.set(key, uni.id);
      }
    }
  }
  console.log(
    `duplicate aliases:        ${duplicates.length}${duplicates.length ? " -> " + duplicates.join("; ") : ""}`,
  );

  // --- imported school names ---------------------------------------------
  const profiles = await queryByPrefix<{ acceptedSchools?: string[] }>(
    "PROFILE#",
    "PROFILE",
  );
  const importedNames = new Set(
    profiles.flatMap((p) => p.acceptedSchools ?? []).filter(Boolean),
  );
  const unmatched = [...importedNames].filter((name) => !matchUniversity(name));
  console.log(`imported school names:    ${importedNames.size} distinct`);
  console.log(
    `unmatched school names:   ${unmatched.length}${unmatched.length ? " -> " + unmatched.join(", ") : ""}`,
  );

  const failed = missing.length > 0 || duplicates.length > 0;
  if (failed) {
    console.error("\n❌ logo check failed");
    process.exit(1);
  }
  console.log("\n✅ logo check passed");
}

main().catch((error: unknown) => {
  console.error("logo check errored:", error);
  process.exit(1);
});
