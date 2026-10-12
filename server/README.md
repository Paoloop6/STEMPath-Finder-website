# Server source map

The API is already versioned in this repository. Its operational paths remain unchanged:

- [Express application and routes](../artifacts/api-server/src/)
- [Local entry point](../artifacts/api-server/src/index.ts)
- [Zod validation](../lib/api-zod/src/) and [database validation](../lib/db/src/schema/)
- [OpenAPI specification](../lib/api-spec/openapi.yaml)
- [AWS storage helpers](../lib/aws/src/index.ts)
- [Vercel routing](../vercel.json), [function entry](../api/index.mjs), and [bundle builder](../artifacts/api-server/build-serverless.mjs)
- [Database setup](../database/README.md)

The OpenAPI file describes the original PostgreSQL API. Newer DynamoDB endpoints and response envelopes are implemented in `artifacts/api-server/src/routes/opportunities-dynamo.ts`; the older spec is not a complete description of these routes. Consult the route source for their exact behavior.

See [local development](../docs/local-development.md). `npm run start:example` starts the unchanged API with a fresh temporary session secret and a local database URL. It checks startup/health without real keys; data requests still need services.

## Student Stories API

[`GET /api/student-videos`](../artifacts/api-server/src/routes/student-videos.ts) is registered in the main API router. It joins published video rows with profile activities and related opportunities. `?refresh=true` clears its five-minute response cache. Ingestion remains in [nightly-job/youtube](../nightly-job/youtube/).

Run `node scripts/submission/check-student-stories.mjs` after building to verify the endpoint against fictional DynamoDB responses on loopback, without real credentials or cloud requests.
