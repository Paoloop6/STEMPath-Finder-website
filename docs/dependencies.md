# Dependencies, tools and services

Every external direct package declared in the workspace manifests is listed below. Some packages support optional UI scaffolding; declaration does not mean every package is active in production. Exact resolved versions and all transitive packages are in `pnpm-lock.yaml`. `@workspace/*` packages are this project’s own source.

| Package | Role |
|---|---|
| `@aws-sdk/client-dynamodb` | DynamoDB service client. |
| `@aws-sdk/client-s3` | S3 object storage client. |
| `@aws-sdk/lib-dynamodb` | DynamoDB document operations, queries and batch writes. |
| `@aws-sdk/s3-request-presigner` | Temporary signed S3 read URLs. |
| `@hookform/resolvers` | Form state and schema validation adapters. |
| `@radix-ui/react-accordion` | Accessible accordion component primitive. |
| `@radix-ui/react-alert-dialog` | Accessible alert-dialog component primitive. |
| `@radix-ui/react-aspect-ratio` | Accessible aspect-ratio component primitive. |
| `@radix-ui/react-avatar` | Accessible avatar component primitive. |
| `@radix-ui/react-checkbox` | Accessible checkbox component primitive. |
| `@radix-ui/react-collapsible` | Accessible collapsible component primitive. |
| `@radix-ui/react-context-menu` | Accessible context-menu component primitive. |
| `@radix-ui/react-dialog` | Accessible dialog component primitive. |
| `@radix-ui/react-dropdown-menu` | Accessible dropdown-menu component primitive. |
| `@radix-ui/react-hover-card` | Accessible hover-card component primitive. |
| `@radix-ui/react-label` | Accessible label component primitive. |
| `@radix-ui/react-menubar` | Accessible menubar component primitive. |
| `@radix-ui/react-navigation-menu` | Accessible navigation-menu component primitive. |
| `@radix-ui/react-popover` | Accessible popover component primitive. |
| `@radix-ui/react-progress` | Accessible progress component primitive. |
| `@radix-ui/react-radio-group` | Accessible radio-group component primitive. |
| `@radix-ui/react-scroll-area` | Accessible scroll-area component primitive. |
| `@radix-ui/react-select` | Accessible select component primitive. |
| `@radix-ui/react-separator` | Accessible separator component primitive. |
| `@radix-ui/react-slider` | Accessible slider component primitive. |
| `@radix-ui/react-slot` | Accessible slot component primitive. |
| `@radix-ui/react-switch` | Accessible switch component primitive. |
| `@radix-ui/react-tabs` | Accessible tabs component primitive. |
| `@radix-ui/react-toast` | Accessible toast component primitive. |
| `@radix-ui/react-toggle` | Accessible toggle component primitive. |
| `@radix-ui/react-toggle-group` | Accessible toggle-group component primitive. |
| `@radix-ui/react-tooltip` | Accessible tooltip component primitive. |
| `@replit/connectors-sdk` | Replit connector SDK declared in the scaffold; no application import found. |
| `@replit/vite-plugin-cartographer` | Replit development source-navigation tooling. |
| `@replit/vite-plugin-dev-banner` | Replit development banner. |
| `@replit/vite-plugin-runtime-error-modal` | Development runtime error overlay. |
| `@tailwindcss/typography` | Tailwind CSS generation, typography and animation helpers. |
| `@tailwindcss/vite` | Tailwind CSS generation, typography and animation helpers. |
| `@tanstack/react-query` | Client API query state and caching. |
| `@types/connect-pg-simple` | TypeScript declarations for connect-pg-simple. |
| `@types/cookie-parser` | TypeScript declarations for cookie-parser. |
| `@types/cors` | TypeScript declarations for cors. |
| `@types/express` | TypeScript declarations for express. |
| `@types/express-session` | TypeScript declarations for express-session. |
| `@types/node` | TypeScript declarations for node. |
| `@types/pg` | TypeScript declarations for pg. |
| `@types/react` | TypeScript declarations for react. |
| `@types/react-dom` | TypeScript declarations for react-dom. |
| `@vercel/analytics` | Website analytics. |
| `@vitejs/plugin-react` | React transform and development refresh. |
| `chokidar` | Prototype file watching. |
| `class-variance-authority` | Conditional component classes and style variants. |
| `clsx` | Conditional component classes and style variants. |
| `cmdk` | Command palette UI primitive. |
| `connect-pg-simple` | PostgreSQL session storage. |
| `cookie-parser` | Cookie parsing dependency declared by the API. |
| `cors` | Cross-origin response middleware. |
| `date-fns` | Date formatting and utility functions. |
| `drizzle-kit` | Database schema management CLI. |
| `drizzle-orm` | Database schema and SQL queries. |
| `drizzle-zod` | Zod insert schemas derived from table definitions. |
| `embla-carousel-react` | Carousel component primitive. |
| `esbuild` | API/Lambda bundling and Vite transforms. |
| `esbuild-plugin-pino` | Packages Pino transport/worker files during bundling. |
| `express` | HTTP routes and middleware. |
| `express-session` | Server sessions and cookie handling. |
| `fast-glob` | Prototype source-file discovery. |
| `framer-motion` | UI transitions and motion. |
| `input-otp` | Segmented code input primitive. |
| `lucide-react` | UI icon libraries. |
| `next-themes` | Theme management dependency in the UI scaffold. |
| `orval` | Generates API clients and validators from OpenAPI. |
| `pg` | PostgreSQL client and connection pool. |
| `pino` | Structured logging. |
| `pino-http` | HTTP request and response logging. |
| `pino-pretty` | Development log formatting. |
| `prettier` | Source formatting. |
| `react` | React component rendering. |
| `react-day-picker` | Calendar/date-picker component. |
| `react-dom` | React component rendering. |
| `react-hook-form` | Form state and schema validation adapters. |
| `react-icons` | UI icon libraries. |
| `react-resizable-panels` | Resizable panel layouts. |
| `recharts` | Chart components. |
| `sonner` | Toast notifications. |
| `tailwind-merge` | Conditional component classes and style variants. |
| `tailwindcss` | Tailwind CSS generation, typography and animation helpers. |
| `tailwindcss-animate` | Tailwind CSS generation, typography and animation helpers. |
| `thread-stream` | Worker-backed logging stream. |
| `tsx` | Runs TypeScript maintenance/helper scripts. |
| `tw-animate-css` | Tailwind CSS generation, typography and animation helpers. |
| `typescript` | TypeScript compiler and type checks. |
| `vaul` | Drawer primitive. |
| `vite` | Frontend build and development server. |
| `wouter` | Client-side routing. |
| `zod` | Runtime validation schemas. |

## APIs, services and development tools

| Name | Purpose |
|---|---|
| Exa | Opportunity source searches. |
| DeepSeek | Structured extraction and AI matching explanations. |
| YouTube Data API v3 | Video search, metadata and optional comments. |
| YouTube player/caption endpoints | Public caption retrieval for story extraction; no captions are included in Git. |
| AWS Lambda | Opportunity-discovery runtime; deployed schedule configuration is external. |
| AWS DynamoDB | Opportunity, profile, crawl-frontier and video records. |
| AWS S3 | Raw/extracted archives and temporary signed reads. |
| PostgreSQL | Legacy opportunities/candidates and sessions. |
| Supabase / `@supabase/supabase-js@2` / Deno | Separate edge-function implementation and incremental migrations; not called by the Express app. |
| Vercel | Website and serverless API deployment, plus analytics. |
| Replit | Original scaffolding and optional development integration. |
| shadcn-style component source | Copied component wrappers built on Radix primitives. |
| Google Fonts | Fonts loaded from frontend HTML. |
| University logo SVGs | Existing branding assets; marks belong to their respective owners. |
| EC Database | Source used by the historical profile importer; imported profiles are excluded. |
| Swift, SwiftUI, Foundation/URLSession | Native iPhone UI, models, persistence and HTTP client. |
| Apple MapKit and Core Location | Maps and address geocoding in the iPhone client. |
| Apple WebKit and YouTube privacy-enhanced embeds | Public video playback in the iPhone client. |
| Xcode | iPhone build and simulator tooling; the iPhone app declares no third-party packages. |
| Node.js, npm, pnpm | Runtime and workspace installation/build commands. |
| Node test runner | Existing Lambda unit tests. |
| Git and GitHub | Version control and source hosting. |
| AWS CLI and CloudFormation | Existing Lambda deployment commands and optional empty-storage provisioning. |
| macOS launchd | Scheduler used by the local video pipeline; the user-specific LaunchAgent is not published. |
| Python 3 | Read-only redacted secret scan helper. |
| Claude (Anthropic) | Development assistance described in the unchanged AI disclosure. |
