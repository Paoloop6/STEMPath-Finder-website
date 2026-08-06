// Bundles the Express app (without app.listen) into api/_app.mjs so Vercel
// can run it as a serverless function. Mirrors build.mjs, but bundles all
// dependencies (including @aws-sdk) so the function is self-contained; in
// production the logger takes the plain-pino path, so no pino worker files
// are needed.

import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(artifactDir, "../..");

await esbuild({
  entryPoints: [path.resolve(artifactDir, "src/app.ts")],
  platform: "node",
  bundle: true,
  format: "esm",
  outfile: path.resolve(repoRoot, "api/_app.mjs"),
  logLevel: "info",
  external: ["*.node", "pg-native", "pino-pretty"],
  banner: {
    js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';

globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
`,
  },
});
