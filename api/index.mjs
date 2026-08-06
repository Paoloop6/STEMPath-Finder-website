// Catch-all Vercel serverless function for every /api/* route.
// The bundled Express app (built by artifacts/api-server/build-serverless.mjs)
// already mounts its router at /api, and Vercel passes the original URL
// through, so the app can be used as the request handler directly.
import app from "./_app.mjs";

export default app;
