# Discovery and scheduled jobs

## Opportunity discovery (AWS Lambda)

The Lambda source was already versioned at [artifacts/lambda-opportunities](../artifacts/lambda-opportunities/). Its handler uses Exa search, crawls source pages and sitemaps, uses DeepSeek to extract structured fields, and writes DynamoDB records plus S3 run archives. New records enter the pending queue with `published: false`; this does not establish that someone has reviewed them. Deadline checks reject some expired records and preserve some stale dates for review; this is not an application reminder service.

Build only: `pnpm run lambda:build`. Existing deploy/invoke commands contact AWS and can write data; they are not needed to inspect the submission. A nightly AWS trigger must be configured outside this source; no deployed schedule was verified during cleanup.

## Student videos (separate daily Mac job)

[youtube/](youtube/) contains the existing local pipeline source copied without saved results:

1. `fetch-youtube-college-activities.ts`: YouTube Data API v3 search, metadata, optional comments, and optional raw-run S3 upload.
2. `sync-student-videos.ts`: merges discovered videos and existing profile references, enriches stories, and optionally writes DynamoDB/S3.
3. `video-story.ts`: obtains available public captions and uses DeepSeek for structured extraction; falls back to title/description evidence when captions are unavailable.

This pipeline is **not part of the Lambda handler**. The local source used a macOS launchd schedule. It collects potentially personal story fields and transcripts in external storage; none of those results are included here. The code's own source explains why caption fetching runs outside Lambda.

With service configuration in root `.env`, the preserved commands are:

```sh
pnpm --filter @workspace/scripts run fetch:youtube -- --recent 30 --s3
pnpm --filter @workspace/scripts run sync:videos -- --apply --min-views 300
```

These commands use paid/quota-limited services and write data; they were not executed for this cleanup. Omitting `--apply` from sync avoids persistence but still performs a small paid extraction preview. The default-branch website snapshot does not mount the newer `/api/student-videos` endpoint used by the iPhone app. Its existing implementation is already preserved on the [`original-public-main` branch](https://github.com/Paoloop6/STEMPath-Finder-website/blob/original-public-main/artifacts/api-server/src/routes/student-videos.ts), together with the corresponding router registration. This cleanup links that source without merging application changes between snapshots.
