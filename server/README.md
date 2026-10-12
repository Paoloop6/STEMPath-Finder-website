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

## Student-video endpoint in the preserved snapshot

The [student-video route](https://github.com/Paoloop6/STEMPath-Finder-website/blob/original-public-main/artifacts/api-server/src/routes/student-videos.ts) and its router registration are already tracked on `original-public-main`. The main branch API does not mount that route. The two snapshots were not merged during this documentation-only cleanup.
