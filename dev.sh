#!/bin/zsh
# Start the STEMPath dev servers (API :8080 + frontend :5173).
# Run from the STEMPath-Finder directory:  ./dev.sh
set -e
cd "$(dirname "$0")"
set -a; source .env; set +a

# API server
(cd artifacts/api-server && NODE_ENV=development PORT=8080 node ./build.mjs \
  && NODE_ENV=development PORT=8080 node --enable-source-maps ./dist/index.mjs) &

# Frontend
(cd artifacts/stempathfinder && PORT=5173 BASE_PATH=/ ./node_modules/.bin/vite --config vite.config.ts --host 0.0.0.0) &

echo "API:      http://localhost:8080"
echo "Frontend: http://localhost:5173"
wait
