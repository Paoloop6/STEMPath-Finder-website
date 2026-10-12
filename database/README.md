# Storage schema and empty setup

No production records, database dumps, scraped pages, transcripts, or student profiles are included. The ten records in [sample-opportunities.json](../data/sample-opportunities.json) are fictional examples of the actual DynamoDB item format; they are pending and unpublished, and no seed is run automatically.

## DynamoDB and S3

[aws-storage.cloudformation.yaml](aws-storage.cloudformation.yaml) creates an **empty** on-demand table with string partition key `PK` and sort key `SK`, and an encrypted private S3 bucket. It was derived from the committed storage helper; it is not an export of the deployed AWS infrastructure. There are no secondary indexes in the source queries. Deployment is optional, creates billable AWS resources, and was not performed for the submission.

After creating a development stack, set `DYNAMODB_TABLE` and `AWS_S3_BUCKET` from its outputs, plus `AWS_REGION`. Supply AWS credentials through the SDK's default chain. Assign the runtime role only the table and bucket permissions it needs.

| Record | Partition key | Sort key |
|---|---|---|
| Opportunity | `OPPORTUNITY#<stable URL hash>` | `OPPORTUNITY` |
| Profile | `PROFILE#<id>` | `PROFILE` |
| Profile activity/award | `PROFILE#<id>` | `ACTIVITY#<id>` / `AWARD#<id>` |
| Crawl frontier | `FRONTIER#<domain>` | `URL#<URL hash>` |
| Imported profile run | `RUN#<id>` | `RUN` |
| Student video (separate pipeline) | `VIDEO#<video id>` | `VIDEO` |

[lib/aws/src/index.ts](../lib/aws/src/index.ts) contains JSON/text upload, read/delete, expiring S3 read URL, table query/scan, and retrying batch-write helpers. The Lambda archives raw and extracted runs in S3; the video pipeline uses `youtube/runs/<runId>/` for search metadata, transcripts and extractions. These stored objects are excluded from this repository. See the actual job source for exact key construction and fields.

## PostgreSQL

The executable schema source is [lib/db/src/schema](../lib/db/src/schema/): `opportunities` and `candidates`, with Drizzle column definitions, defaults and insert validation. Express sessions use `connect-pg-simple`, which creates `sessions` when needed (`createTableIfMissing: true` in `app.ts`).

For an empty local database, install/start PostgreSQL, then:

```sh
createdb nextstep
# This URL is a local development example without credentials.
DATABASE_URL=postgresql://localhost:5432/nextstep pnpm --filter @workspace/db run push
```

This applies the committed Drizzle schema to the database you name; verify the URL is for development first. No opportunities or candidates are inserted. The schema's `updatedAt` update function runs in Drizzle, not as a database trigger.

[supabase/migrations](../supabase/migrations/) contains later quality/grading additions for the separate Supabase implementation. These are incremental migrations, not a complete blank Supabase database initializer. Supabase edge functions remain included for source review but are not invoked by the current Express app. Do not treat their migrations as a replacement for the Drizzle schema above.
