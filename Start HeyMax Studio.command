#!/bin/zsh
cd "${0:A:h}"
if ! command -v node >/dev/null 2>&1; then
  print 'HeyMax Studio needs Node.js 22 or later. Install Node, then open this launcher again.'
  read '?Press Enter to close.'
  exit 1
fi
STUDIO_PORT="${PORT:-4310}"
if curl -fsS "http://127.0.0.1:${STUDIO_PORT}/health" 2>/dev/null | /usr/bin/grep -q '"mode":"local"'; then
  open "http://127.0.0.1:${STUDIO_PORT}"
  exit 0
fi
node server.mjs &
STUDIO_PID=$!
trap 'kill "$STUDIO_PID" 2>/dev/null' EXIT INT TERM
for attempt in {1..30}; do
  if curl -fsS "http://127.0.0.1:${STUDIO_PORT}/health" >/dev/null 2>&1; then
    open "http://127.0.0.1:${STUDIO_PORT}"
    break
  fi
  sleep 0.2
done
wait "$STUDIO_PID"
