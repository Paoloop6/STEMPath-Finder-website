# Congressional App Challenge source preparation

Checked on 2026-10-12. Existing website/API/Lambda/Swift application source and Vercel routing were not changed. Additions are documentation, fictional sample data, blank configuration, empty storage setup, local build helpers and copies of already-existing video ingestion code. The iPhone README's **AI use** section was preserved verbatim and copied to the website README. OpenAI Codex assisted with this repository preparation and verification.

## Completed checks

| Check | Result |
|---|---|
| Fresh website `npm install` | Passed from a checkout with no dependency folders; delegates to locked pnpm workspace installation |
| `npm run build` | Passed: workspace type checks, website, API, Lambda and prototype builds; live public API prerender completed without private keys |
| `npm run build:sample` | Passed using exactly ten fictional records via a temporary loopback API; no live dataset required |
| `node artifacts/api-server/build-serverless.mjs` | Passed; regenerates the ignored Vercel bundle |
| API `npm run start:example` after copying `.env.example` | Started and `GET /api/healthz` returned HTTP 200 with `{"status":"ok"}` |
| Lambda unit tests | All 36 existing tests passed |
| Xcode project inspection | `xcodebuild -list` read the project and found the `nextstepdatabase` scheme |
| iPhone simulator build | Xcode 26.6, Debug, generic iOS Simulator, signing disabled: **BUILD SUCCEEDED** |
| Source hygiene | Ten fictional sample records, blank env values, preserved AI disclosure, unchanged existing runtime source and deployment routing verified |
| Current source and all reachable Git history | Completed read-only scan; no confirmed credentials found; [details](security-review.md) |

No cloud provisioning, Lambda invocation, imports, production database writes, paid AI calls, or opportunity-data seeding were used for these checks. The normal website prerender reads the public API; generated pages remain ignored build output.

### Local tooling observations

This Mac terminated newly copied native executables, including Gitleaks and the fresh esbuild binary. To finish the JavaScript build checks, the temporary dependency folders used the already-installed esbuild 0.27.3 executable after verifying its SHA-256 was identical to the new package binary. No application source or system security setting was changed for that workaround. A fresh `npm install` succeeded; running npm over a pre-existing pnpm dependency tree hit an npm 11.11.1 internal error, so use a clean checkout for npm installation or use pnpm consistently.

Build warnings remain: some web chunks exceed Vite's size recommendation; Radix component directives/sourcemap warnings are emitted by the existing build; Xcode emits existing concurrency/deprecation warnings. These did not prevent successful builds and were not changed in this documentation task.

## Before submission

1. Review the README and existing AI disclosure for accuracy about your own work, and submit the correct repository links.
2. Make this private website repository accessible to judges when ready. Review historical attachments and the preserved branch first: history was intentionally retained.
3. Choose the source snapshot that matches the video/live app. `main` contains the website backup; `original-public-main` also contains the student-video API route. Both are preserved and linked. This cleanup did not merge application behavior between those snapshots or redeploy the live site.
4. For a full local data-backed app, provision empty development databases and supply your own private service configuration. The blank-env API check proves startup/health only, not authenticated data workflows.
5. For iPhone installation on a physical device, choose your own Apple signing team in Xcode. Simulator compilation needs no service keys.

No confirmed leaked key was identified for rotation. No Git history rewrite, force push, repository deletion, visibility change or rename was performed as part of this cleanup.
