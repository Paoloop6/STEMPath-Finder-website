# Congressional App Challenge submission checks

Verified on 2026-10-12. The `original-public-main` branch was merged into `main` with a normal merge commit. The existing Student Stories route/registration, opportunity coordinate fields, API page-size option, homepage board, saved board and public-site presentation are included. The newer Lambda crawler and all source-cleanup work were retained. No new production behavior was invented for the integration. The original branch's optional development proxy that disabled TLS verification and internal design/product briefs were not imported.

The iPhone application's Swift source was not changed. Its existing AI-use disclosure is preserved verbatim in both READMEs. OpenAI Codex assisted with repository preparation, integration and verification.

## Results

| Check | Result |
|---|---|
| Website `npm run build` | Passed: type checks, website, Express, Lambda and prototype builds; live public API prerender completed without private keys |
| API health | HTTP 200 and `{"status":"ok"}` |
| Student Stories HTTP integration | Passed against a temporary DynamoDB protocol fixture: published-only records, profile-name redaction, rejected-activity filtering, opportunity links, cache and refresh |
| Existing Lambda tests | All 36 passed |
| iPhone simulator | Xcode 26.6, Debug, generic iOS Simulator, signing disabled: BUILD SUCCEEDED |
| Submission cleanup | `.env.example`, ignore rules, fictional sample, docs and source-only layout retained |
| Secret scan | No confirmed embedded credentials found; current source and all fetched branch history searched |
| Default branch | GitHub advertises `main` as HEAD for both repositories |

The normal website build reads the public API. No production database writes, imports, Lambda invocations, cloud provisioning or paid extraction calls were used in verification. Student Stories was tested with fictional loopback data and dummy AWS signing values. Real data/API account configuration remains necessary for production or a full local data-backed app.

The previously verified fresh `npm install` entry point and local tooling notes are in [local development](local-development.md). Native esbuild in the temporary checkout uses an identical pre-existing local executable (SHA-256 verified) because this Mac terminated freshly copied executables; no system security settings were changed. Existing chunk-size, sourcemap/component-directive and Xcode concurrency/deprecation warnings remain.

## History and publication

A separate HTML/JSON history report accompanies this submission for each repository. Each report inventories every file path from every reachable commit across all fetched branches, including deleted files, and lists exact containing commits, historical branch membership, branch-tip presence, versions and maximum size. Review the flagged attachments, project/user metadata, public video sample and coordinate cache before publication. Reports also note author/committer contact metadata in Git itself.

The reports are provided outside the repositories so they can inventory the final tagged commits without a self-referential report commit. Findings do not delete or alter historical objects. No force push, history rewrite, branch deletion, visibility change or live redeployment was performed.

## Submission version

After all required checks passed, annotated tag `cac-2026-submission` was created on `main` in each repository and pushed. Use that tag as the fixed source version for judges. Make the repositories accessible to judges when ready; choose your own signing team for physical iPhone installation. No confirmed leaked key was identified for rotation by the completed checks.
