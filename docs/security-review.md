# Redacted secret review — 2026-10-12

**No confirmed embedded service credentials were found by the completed checks.** There are therefore no identified leaked keys to list for rotation. This is a pattern-based review, not proof that a secret cannot exist or a check of whether external credentials remain valid. No candidate key was sent to a service to test it.

## Scope and method

- Website: all 17 commits reachable from all fetched refs, including `main` and `original-public-main`, covering 498 unique historical blobs plus commit messages and the cleaned current source.
- iPhone: all five reachable commits, 37 unique historical blobs, commit messages and current source.
- The new YouTube files copied from the local project were also scanned before commit. Existing `.env` files and AWS credential stores were not copied or published.
- Used `scripts/submission/scan-secrets.py`, a read-only search for credential assignments and recognizable AWS, Google/YouTube, OpenAI/DeepSeek/Anthropic-style, GitHub, Slack, JWT, private-key and credential-bearing-URL patterns. It also counts contents matching `api_key`, `secret`, `password`, `sk-`, `AKIA`, `ASIA`, `credential` and `token` keywords. Reports contain locations and SHA-256 fingerprints, never raw secrets.
- Gitleaks installation/execution was attempted, but this Mac terminated the new executable. The reported result comes from the completed Python/Git scan, not Gitleaks.

Repeat from the website checkout:

```sh
python3 scripts/submission/scan-secrets.py . --output /tmp/website-secret-review.json
python3 scripts/submission/scan-secrets.py /path/to/nextstepdatabase --output /tmp/iphone-secret-review.json
```

The scan includes every reachable historical blob, including deleted files and the old generated API bundle. Unreachable server-side objects, other repositories, hosting environment settings and service dashboards are outside its scope. New matches require review; the script does not decide whether a credential is live.

## Historical matches reviewed

All four candidate occurrences were harmless identifiers in the AWS SDK bundled into `api/_app.mjs`, introduced by commit `8772b9c`:

| Historical line | Matched literal | Result |
|---|---|---|
| 39883 | `x-aws-ec2-metadata-token` | HTTP header name; not a token |
| 50773 | `AWS_SECRET_ACCESS_KEY` | Environment-variable name; not its value |
| 50869 | `AWS_CONTAINER_AUTHORIZATION_TOKEN` | Environment-variable name; not its value |
| 52056 | `AWS_CONTAINER_AUTHORIZATION_TOKEN` | Environment-variable name; not its value |

The scanner also matches its own regex-definition source as a generic assignment; that is not a key. The iPhone history produced no credential-pattern candidates.

## Current-tree cleanup and historical limitations

Removed the generated 4.1 MB `api/_app.mjs` bundle, source-prompt attachments, and Supabase local CLI/project-link metadata from the current tracked tree. The Vercel build regenerates the bundle. `.gitignore` now excludes environment files except `.env.example`, dependency/build folders, raw data, transcripts, exports, videos, local AWS files and private-key files. The only `data/` file allowed is the fictional ten-record sample.

**Git history was not rewritten and no force push was used.** Removed files still exist in old commits and in the preserved historical branch. Review those historical materials before making the repository public. If a credential is found later, revoke/rotate it in the owning service; deleting a current file alone does not revoke it.
